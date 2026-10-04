import { t } from '../../i18n'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { isPrivatePath, ROUTE_SEO } from '../../content/seo'
import { applySeo } from '../../lib/seo'
import { useQuery } from '@tanstack/react-query'
import { gazabellaApi } from '../../api/gazabella'

/**
 * SEO للمسارات الثابتة داخل AppShell. صفحة المنتج تضبط بياناتها بنفسها (useSeo)،
 * لذلك لا نلمس /products/:slug هنا.
 */
export function RouteSeo() {
  const { pathname, search } = useLocation()
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: gazabellaApi.getCategories, staleTime: 300_000 })
  useEffect(() => {
    if (pathname.startsWith('/products/')) return
    const entry = ROUTE_SEO[pathname]
    if (pathname === '/') {
      const params = new URLSearchParams(search)
      const term = params.get('search')?.trim()
      // صفحات الفلترة والبحث لا تُفهرس — تكرار محتوى الصفحة الرئيسية
      const filtered = [...params.keys()].some((k) => k !== 'category')
      // صفحة التصنيف وحدها تُفهرس: عنوان باسم التصنيف ورابط canonical خاص بها (مطابق لما في sitemap.xml)
      const slug = params.get('category')
      const category = slug && !filtered ? categories?.find((c) => c.slug === slug) : undefined
      applySeo({
        title: term ? t('نتائج البحث: {term}', { term: term }) : category?.name ?? null,
        description: category ? t('تسوّقي {name} من Gazabella — توصيل للبيت ودفع عند الاستلام.', { name: category.name }) : entry?.description,
        noindex: filtered,
        canonicalPath: slug && !filtered ? `/?category=${encodeURIComponent(slug)}` : undefined,
      })
      return
    }
    if (entry) { applySeo({ title: entry.title, description: entry.description, noindex: entry.noindex }); return }
    if (/^\/orders\/[^/]+$/.test(pathname)) { applySeo({ title: t('تفاصيل الطلب'), noindex: true }); return }
    if (isPrivatePath(pathname)) applySeo({ title: null, noindex: true })
  }, [pathname, search, categories])
  return null
}
