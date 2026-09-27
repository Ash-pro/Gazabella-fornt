// One command for the local MVP0 frontend, API and reservation scheduler.
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const backend = resolve(process.env.MVP0_BACKEND_PATH || join(root, '../GazabellaOnlineStore/backend'))
const php = process.env.PHP_BINARY || 'C:/xampp/php/php.exe'
const portArg = process.argv.indexOf('--port')
const frontPort = portArg >= 0 ? Number(process.argv[portArg + 1]) : 5173
const children = []
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill()
  process.exitCode = code
}
async function freePort(port) {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once('error', () => reject(new Error(`Port ${port} is in use. Stop its existing dev server before running npm run dev.`)))
    server.listen(port, '127.0.0.1', resolve)
  })
  await new Promise(resolve => server.close(resolve))
}
function runArtisan(env, args) {
  const result = spawnSync(php, ['artisan', ...args], { cwd: backend, env, stdio: 'inherit', windowsHide: true, timeout: 60000 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Local setup failed: artisan ${args.join(' ')}`)
}
function launch(command, args, cwd, env) {
  const child = spawn(command, args, { cwd, env, stdio: 'inherit', windowsHide: true })
  children.push(child)
  child.on('error', error => { console.error(error.message); stop(1) })
  child.on('exit', code => { if (!stopping) stop(code || 1) })
  return child
}
try {
  if (!existsSync(join(backend, 'vendor/autoload.php'))) throw new Error('Laravel backend dependencies are missing. Set MVP0_BACKEND_PATH to the installed backend.')
  await freePort(8000)
  await freePort(frontPort)
  const local = join(root, '.gazabella-local')
  mkdirSync(local, { recursive: true })
  const keyPath = join(local, 'app-key')
  if (!existsSync(keyPath)) writeFileSync(keyPath, 'base64:' + randomBytes(32).toString('base64'), { flag: 'wx' })
  const database = join(local, 'database.sqlite')
  const env = { ...process.env, APP_ENV: 'local', APP_DEBUG: 'false', APP_URL: 'http://127.0.0.1:8000',
    APP_KEY: readFileSync(keyPath, 'utf8').trim(), APP_CONFIG_CACHE: join(local, 'unused-config.php'),
    DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '',
    FRONTEND_URL: `http://127.0.0.1:${frontPort}`, CACHE_STORE: 'file', SESSION_DRIVER: 'file',
    QUEUE_CONNECTION: 'sync', BROADCAST_CONNECTION: 'log', OTP_TEST_MODE: 'true', OTP_TEST_CODE: '123456', JAWWAL_PAY_SANDBOX: 'true' }
  if (!existsSync(database)) {
    // Seed only a brand-new database; never reseed the user's saved local data.
    const initial = join(local, `initial-${Date.now()}.sqlite`)
    writeFileSync(initial, '', { flag: 'wx' })
    runArtisan({ ...env, DB_DATABASE: initial }, ['migrate', '--seed', '--force'])
    renameSync(initial, database)
  } else runArtisan(env, ['migrate', '--force'])
  launch(php, ['-S', '127.0.0.1:8000', '-t', 'public', 'public/index.php'], backend, env)
  let ready = false
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/products?per_page=1', { signal: AbortSignal.timeout(2000), headers: { Connection: 'close' } })
      const data = await response.json()
      ready = response.ok && Array.isArray(data.data)
    } catch { /* Wait for our API process to bind its port. */ }
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  if (!ready) throw new Error('The local API did not become ready. Check the PHP output above.')
  launch(php, ['artisan', 'schedule:work'], backend, env)
  launch(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), '--mode', 'mvp0', '--host', '127.0.0.1', '--port', String(frontPort)], root,
    { ...process.env, VITE_DATA_SOURCE: 'api', VITE_API_CONTRACT: 'mvp0', VITE_API_BASE_URL: 'http://127.0.0.1:8000/api/v1', VITE_STORAGE_URL: 'http://127.0.0.1:8000' })
  console.log(`Local MVP0 ready: http://127.0.0.1:${frontPort}/ | OTP: 123456 | Data: .gazabella-local/database.sqlite`)
  process.on('SIGINT', () => stop())
  process.on('SIGTERM', () => stop())
} catch (error) { console.error(error.message); stop(1) }
