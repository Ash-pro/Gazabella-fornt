import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { isPrivatePath, ROUTE_SEO } from '../../content/seo'
import { applySeo } from '../../lib/seo'

/**
 * SEO للمسارات الثابتة داخل AppShell. صفحة المنتج تضبط بياناتها بنفسها (useSeo)،
 * لذلك لا نلمس /products/:slug هنا.
 */
export function RouteSeo() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/products/')) return
    const entry = ROUTE_SEO[pathname]
    if (pathname === '/') {
      const params = new URLSearchParams(search)
      const term = params.get('search')?.trim()
      // صفحات الفلترة والبحث لا تُفهرس — تكرار محتوى الصفحة الرئيسية
      const filtered = [...params.keys()].some((k) => k !== 'category')
      applySeo({ title: term ? `نتائج البحث: ${term}` : null, description: entry?.description, noindex: filtered })
      return
    }
    if (entry) { applySeo({ title: entry.title, description: entry.description, noindex: entry.noindex }); return }
    if (/^\/orders\/[^/]+$/.test(pathname)) { applySeo({ title: 'تفاصيل الطلب', noindex: true }); return }
    if (isPrivatePath(pathname)) applySeo({ title: null, noindex: true })
  }, [pathname, search])
  return null
}
