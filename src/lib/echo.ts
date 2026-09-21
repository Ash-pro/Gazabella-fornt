/**
 * Laravel Echo / Pusher connection management.
 *
 * When VITE_PUSHER_APP_KEY and VITE_PUSHER_HOST are set in the environment
 * the module initialises a real Echo connection; otherwise it stays a no-op
 * so the app builds and runs without a WebSocket backend.
 */

type EchoInstance = {
  disconnect(): void
  private(channel: string): { listen(event: string, cb: (data: unknown) => void): void }
  channel(channel: string): { listen(event: string, cb: (data: unknown) => void): void }
}

let echo: EchoInstance | null = null

export async function getEcho(): Promise<EchoInstance | null> {
  if (echo) return echo

  const key = import.meta.env.VITE_PUSHER_APP_KEY as string | undefined
  const host = import.meta.env.VITE_PUSHER_HOST as string | undefined

  if (!key || !host) return null

  try {
    const [{ default: Echo }, { default: Pusher }] = await Promise.all([
      import('laravel-echo'),
      import('pusher-js'),
    ])

    // @ts-expect-error – Pusher must be on window for Echo's Pusher connector
    window.Pusher = Pusher

    echo = new Echo({
      broadcaster: 'pusher',
      key,
      wsHost: host,
      wsPort: Number(import.meta.env.VITE_PUSHER_PORT ?? 6001),
      wssPort: Number(import.meta.env.VITE_PUSHER_PORT ?? 6001),
      forceTLS: import.meta.env.VITE_PUSHER_SCHEME === 'https',
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
    }) as unknown as EchoInstance
  } catch (err) {
    console.warn('[echo] Failed to initialise WebSocket connection:', err)
    return null
  }

  return echo
}

export function disconnectEcho(): void {
  if (echo) {
    try { echo.disconnect() } catch {}
    echo = null
  }
}
