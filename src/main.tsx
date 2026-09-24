import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { queryClient } from './lib/queryClient'
import { registerServiceWorker } from './lib/registerSw'
import './index.css'
import { useAuthStore } from './stores/authStore'
import { useCheckoutStore } from './stores/checkoutStore'

useAuthStore.subscribe((state, previous) => {
  if (state.token !== previous.token) {
    void queryClient.cancelQueries()
    queryClient.clear()
    useCheckoutStore.getState().reset()
  }
})

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><App /></BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
