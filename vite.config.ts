import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// نسخة الإصدار لربط أخطاء Sentry بالـ commit (Vercel يوفّر SHA تلقائياً)
process.env.VITE_APP_RELEASE ||= process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? ''

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
