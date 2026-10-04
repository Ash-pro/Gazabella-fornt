import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createServer } from 'vite'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const AR = /[؀-ۿ]/
// خارج نطاق اللغتين (لوحات التشغيل، العرض التجريبي، العقد القديم) + ملفات لا تحتوي نصوص واجهة
const SKIP = /[\\/](mock|i18n|merchant|delivery)[\\/]|Mvp0|DemoRoleBar|LanguageSwitch|CategoryStoryPills|\.d\.ts$|content[\\/]seo\.ts$/
// نصوص عربية ليست للعرض: حروف تطبيع البحث والأرقام الهندية
const NOT_UI = new Set(['ا', 'ي', 'ه', '٠١٢٣٤٥٦٧٨٩'])

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sourceFiles(path, out)
    else if (/\.tsx?$/.test(path) && !SKIP.test(path)) out.push(path)
  }
  return out
}

/** كل نص عربي في الكود (سواء داخل t() أو في ثوابت تُترجم عند العرض) + أي نص عربي ظاهر في JSX بدون t() */
function scan() {
  const keys = new Map(); const rawJsx = []
  for (const file of sourceFiles(join(ROOT, 'src'))) {
    const src = readFileSync(file, 'utf8')
    if (!AR.test(src)) continue
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const where = (n) => `${relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`
    const visit = (n) => {
      if (ts.isJsxText(n) && AR.test(n.text)) rawJsx.push(`${where(n)} ${n.text.trim().slice(0, 50)}`)
      if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && AR.test(n.text) && !NOT_UI.has(n.text)) {
        const p = n.parent
        if (ts.isJsxAttribute(p)) rawJsx.push(`${where(n)} ${n.text.slice(0, 50)}`)
        else if (!ts.isImportDeclaration(p) && !ts.isLiteralTypeNode(p) && !keys.has(n.text)) keys.set(n.text, where(n))
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
  }
  return { keys, rawJsx }
}

let server, i18n, en
before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-i18n-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  i18n = await server.ssrLoadModule('/src/i18n/index.ts')
  en = (await server.ssrLoadModule('/src/i18n/en.ts')).default
})
after(() => server?.close())

test('i18n: every Arabic UI string has an English translation, and none is left untranslated in JSX', () => {
  const { keys, rawJsx } = scan()
  assert.deepEqual(rawJsx, [], 'Arabic text rendered without t()')
  const missing = [...keys].filter(([k]) => !(k in en)).map(([k, at]) => `${at} «${k.slice(0, 60)}»`)
  assert.deepEqual(missing, [], 'strings missing from src/i18n/en.ts')
  assert.ok(keys.size > 500)
})

test('i18n: translations keep the same {placeholders} and are not empty or still Arabic', () => {
  const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  for (const [ar, value] of Object.entries(en)) {
    assert.ok(value.trim() || ar.trim().length <= 2, `empty translation for «${ar}»`)
    assert.equal(holes(value), holes(ar), `placeholders differ for «${ar}»`)
    assert.ok(!AR.test(value), `translation still contains Arabic: «${ar}»`)
  }
})

test('i18n: translate() falls back to Arabic, fills variables, and Arabic is the default language', () => {
  assert.equal(i18n.getLocale(), 'ar')
  assert.equal(i18n.t('السلة'), 'السلة')
  assert.equal(i18n.translate('السلة', 'en', en), 'Cart')
  assert.equal(i18n.translate('نص بلا ترجمة', 'en', en), 'نص بلا ترجمة')
  assert.equal(i18n.translate('أهلاً {firstName}', 'en', en, { firstName: 'Sara' }), 'Hello Sara')
  assert.equal(i18n.translate('أهلاً {firstName}', 'ar', null, { firstName: 'سارة' }), 'أهلاً سارة')
  assert.equal(i18n.dateLocale(), 'ar-PS-u-nu-latn')
  assert.equal(i18n.isRtl(), true)
})
