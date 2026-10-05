import { t } from '../../i18n'
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
          {whatsapp && <a href={whatsappLink(whatsapp)} target="_blank" rel="noopener noreferrer" onClick={() => track('contact', { channel: 'whatsapp', page: 'footer' })}>{t('واتساب:')} <span dir="ltr" className="num">+{whatsapp}</span></a>}
          {settings?.phone && <a dir="ltr" href={`tel:${settings.phone}`}>{settings.phone}</a>}
          {settings?.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}
        </div>
        <div>
          <h2>{t('اكتشفي الأقسام')}</h2>
          <div className="footer-links">{categories?.map((c) => <Link key={c.id} to={`/?category=${c.slug}#products`}>{c.name}</Link>)}</div>
        </div>
        <div>
          <h2>{t('تجربتكِ مع Gazabella')}</h2>
          <Link to="/track">{t('تتبع طلبك')}</Link>
          <Link to="/account">{t('حسابي وطلباتي')}</Link>
          {settings?.policies?.payment_methods?.includes('jawwal_pay') && <Link to="/orders/lookup">{t('تتبع طلب بمرجع الدفع')}</Link>}
          <Link to="/delivery-info">{t('التوصيل والرسوم')}</Link>
          <Link to="/returns">{t('الاسترجاع والاستبدال')}</Link>
          <Link to="/faq">{t('الأسئلة الشائعة')}</Link>
          <Link to="/contact">{t('تواصلي معنا')}</Link>
          <p className="flex items-center gap-2"><Icon name="truck" className="size-4" /> {settings?.address || t('التوصيل حسب التغطية المتاحة')}</p>
          <p className="flex items-center gap-2"><Icon name="shield" className="size-4" /> {t('تفاصيل الدفع واضحة قبل التأكيد')}</p>
        </div>
      </div>
      <div className="container-page footer-bottom">
        <span>© {new Date().getFullYear()} Gazabella</span>
        <nav aria-label={t('روابط قانونية')} className="footer-legal"><Link to="/privacy">{t('سياسة الخصوصية')}</Link><Link to="/terms">{t('شروط الاستخدام')}</Link></nav>
      </div>
    </footer>
  )
}
