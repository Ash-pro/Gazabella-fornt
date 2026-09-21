import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useAuthStore } from '../stores/authStore'
import { getGuestUuid } from './guest'

let echoInstance: Echo<'reverb'> | null = null

export function getEcho(): Echo<'reverb'> | null {
  if (echoInstance) return echoInstance

  try {
    const PusherClass = (Pusher as unknown as { default: typeof Pusher }).default || Pusher

    if (typeof window !== 'undefined') {
      ;(window as unknown as { Pusher: typeof PusherClass }).Pusher = PusherClass
    }

    echoInstance = new Echo<'reverb'>({
      broadcaster: 'reverb',
      Pusher: PusherClass,
      key: import.meta.env.VITE_REVERB_APP_KEY || 'gazabella-key',
      wsHost: import.meta.env.VITE_REVERB_HOST || '127.0.0.1',
      wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
      wssPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
      forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: new URL('/broadcasting/auth', import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').toString(),
      auth: {
        headers: {
          Accept: 'application/json',
          'X-Guest-UUID': getGuestUuid(),
          Authorization: `Bearer ${useAuthStore.getState().token ?? ''}`,
        },
      },
    })

    return echoInstance
  } catch (err) {
    console.warn('Echo initialization failed:', err)
    return null
  }
}

export function disconnectEcho() {
  try {
    echoInstance?.disconnect()
  } catch {
    // ignore
  }
  echoInstance = null
}

