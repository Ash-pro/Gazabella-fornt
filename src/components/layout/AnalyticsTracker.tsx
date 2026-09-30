import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { track, trackPageView } from '../../lib/analytics'

/** page_view مع كل تنقل (SPA) + search عند تغيّر عبارة البحث */
export function AnalyticsTracker() {
  const { pathname, search } = useLocation()
  const lastSearch = useRef<string | null>(null)
  useEffect(() => {
    // مهلة قصيرة حتى تضبط RouteSeo/useSeo عنوان الصفحة
    const timer = window.setTimeout(trackPageView, 300)
    const term = new URLSearchParams(search).get('search')?.trim() || null
    if (term && term !== lastSearch.current) track('search', { search_term: term.slice(0, 100) })
    lastSearch.current = term
    return () => window.clearTimeout(timer)
  }, [pathname, search])
  return null
}
