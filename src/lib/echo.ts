/**
 * Laravel Echo / Pusher connection management.
 *
 * When VITE_PUSHER_APP_KEY and VITE_PUSHER_HOST are set in the environment
 * the module initialises a real Echo connection; otherwise it stays a no-op
 * so the app builds and runs without a WebSocket backend.
 */

import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { broadcastAuthUrl } from './realtime'

type EchoInstance = {
  disconnect(): void
  private(channel: string): { listen(event: string, cb: (data: unknown) => void): void }
  channel(channel: string): { listen(event: string, cb: (data: unknown) => void): void }
}

let echo: EchoInstance | null = null

type ChannelAuthData = { auth: string; channel_data?: string; shared_secret?: string }

/** يرسل Bearer الحالي لمصادقة القنوات الخاصة (G-03) — يُقرأ التوكن لحظة الاشتراك */
function bearerAuthorizer(channel: { name: string }) {
  return {
    authorize: (socketId: string, callback: (error: Error | null, data: ChannelAuthData | null) => void) => {
      const token = useAuthStore.getState().token
      const url = broadcastAuthUrl(
        import.meta.env.VITE_API_BASE_URL as string | undefined,
        import.meta.env.VITE_BROADCAST_AUTH_URL as string | undefined,
        window.location.origin,
      )
      axios
        .post(url, { socket_id: socketId, channel_name: channel.name }, {
          headers: { Accept: 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        })
        .then((response) => callback(null, response.data as ChannelAuthData))
        .catch((error: unknown) => callback(error instanceof Error ? error : new Error('broadcast auth failed'), null))
    },
  }
}

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
      authorizer: bearerAuthorizer,
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
