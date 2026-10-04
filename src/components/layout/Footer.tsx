import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { gazabellaApi } from '../../api/gazabella'
import { resolveWhatsapp, whatsappLink } from '../../content/storeInfo'
import { Icon } from '../ui/Icon'
import { track } from '../../lib/analytics'

export function Footer() {
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: gazabellaApi.getCategories })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: gazabellaApi.getSettings })
  const whatsapp = resolveWhatsapp(settings?.social_links)
  return (
    <footer className="site-footer">
      <div className="container-page footer-grid">
        <div>
          <Link to="/" className="footer-brand">{settings?.store_name || 'Gazabella'}</Link>
          <p>{settings?.tagline}</p>
          {whatsapp && <a href={whatsappLink(whatsapp)} target="_blank" rel="noopener noreferrer" onClick={() => track('contact', { channel: 'whatsapp', page: 'footer' })}>واتساب: <span dir="ltr" className="num">+{whatsapp}</span></a>}
          {settings?.phone && <a dir="ltr" href={`tel:${settings.phone}`}>{settings.phone}</a>}
          {settings?.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}
        </div>
        <div>
          <h2>اكتشفي الأقسام</h2>
          <div className="footer-links">{categories?.map((c) => <Link key={c.id} to={`/?category=${c.slug}#products`}>{c.name}</Link>)}</div>
        </div>
        <div>
          <h2>تجربتكِ مع Gazabella</h2>
          <Link to="/orders">حسابي وطلباتي</Link>
          {settings?.policies?.payment_methods?.includes('jawwal_pay') && <Link to="/orders/lookup">تتبع طلب بمرجع الدفع</Link>}
          <Link to="/delivery-info">التوصيل والرسوم</Link>
          <Link to="/returns">الاسترجاع والاستبدال</Link>
          <Link to="/faq">الأسئلة الشائعة</Link>
          <Link to="/contact">تواصلي معنا</Link>
          <p className="flex items-center gap-2"><Icon name="truck" className="size-4" /> {settings?.address || 'التوصيل حسب التغطية المتاحة'}</p>
          <p className="flex items-center gap-2"><Icon name="shield" className="size-4" /> تفاصيل الدفع واضحة قبل التأكيد</p>
        </div>
      </div>
      <div className="container-page footer-bottom">
        <span>© {new Date().getFullYear()} Gazabella</span>
        <nav aria-label="روابط قانونية" className="footer-legal"><Link to="/privacy">سياسة الخصوصية</Link><Link to="/terms">شروط الاستخدام</Link></nav>
      </div>
    </footer>
  )
}
