import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { gazabellaApi } from '../../api/gazabella'
import { Icon } from '../ui/Icon'
export function Footer() {
  const {data:categories} = useQuery({queryKey:['categories'],queryFn:gazabellaApi.getCategories})
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: gazabellaApi.getSettings })
  return <footer className="site-footer"><div className="container-page footer-grid"><div><Link to="/" className="footer-brand">{settings?.store_name || "Gazabella"}</Link><p>{settings?.tagline}</p>{settings?.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}{settings?.phone && <a dir="ltr" href={`tel:${settings.phone}`}>{settings.phone}</a>}</div><div><h2>اكتشفي الأقسام</h2><div className="footer-links">{categories?.map((c)=><Link key={c.id} to={`/?category=${c.slug}#products`}>{c.name}</Link>)}</div></div><div><h2>تجربتكِ مع Gazabella</h2><Link to="/orders">حسابي وطلباتي</Link><Link to="/cart">سلة التسوق</Link><p className="flex items-center gap-2"><Icon name="truck" className="size-4" /> {settings?.address || "التوصيل حسب التغطية المتاحة"}</p><p className="flex items-center gap-2"><Icon name="shield" className="size-4" /> تفاصيل الدفع واضحة قبل التأكيد</p></div></div><div className="container-page footer-bottom"><span>© {new Date().getFullYear()} Gazabella</span><span>{settings?.tagline}</span></div></footer>
}
