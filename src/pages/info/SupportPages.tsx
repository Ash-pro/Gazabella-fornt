import { t } from '../../i18n'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { whatsappLink } from '../../content/storeInfo'
import { useStoreInfo, type StoreInfoView } from '../../hooks/useStoreInfo'
import { formatPrice } from '../../lib/format'
import { Icon } from '../../components/ui/Icon'
import { InfoLayout, Section } from './InfoLayout'
import { track } from '../../lib/analytics'

const faqItems = (S: StoreInfoView): { q: string; a: ReactNode }[] => [
  { q: t('كيف أطلب؟'), a: <>{t('اختاري المنتجات وأضيفيها للسلة، ثم «إتمام الطلب»، أدخلي رقم جوالكِ وعنوانكِ، وراجعي الإجمالي ثم أكّدي. يصلكِ رمز تحقق على جوالكِ لتأكيد الرقم.')}</> },
  { q: t('ما طرق الدفع المتاحة؟'), a: <>{t('حالياً')} <b>{t('الدفع نقداً عند الاستلام')}</b> {t('فقط. سنعلن عن الدفع الإلكتروني فور إتاحته.')}</> },
  { q: t('كم رسوم التوصيل ومتى يصل طلبي؟'), a: <>{t('تبدأ الرسوم من')} <span className="num">{formatPrice(S.minDeliveryFee)}</span> {t('حسب المنطقة، وتظهر قبل التأكيد. التفاصيل والمدد في')} <Link className="text-link" to="/delivery-info">{t('صفحة التوصيل')}</Link>.</> },
  { q: t('كيف أتابع طلبي؟'), a: <>{t('من')} <Link className="text-link" to="/orders">{t('طلباتي')}</Link> {t('بعد تسجيل الدخول برقمكِ، أو من')} <Link className="text-link" to="/orders/lookup">{t('تتبع طلب')}</Link>{t('. الحالات: بانتظار التأكيد ← مؤكد ← خرج للتوصيل ← تم التسليم.')}</> },
  { q: t('ما هو كود التسليم؟'), a: <>{t('كود خاص بطلبكِ يظهر في صفحة الطلب. أعطيه للمندوب عند استلام الطلب فقط — لا تشاركيه مسبقاً مع أحد.')}</> },
  { q: t('هل يمكنني إلغاء الطلب؟'), a: <>{t('نعم، مجاناً قبل خروجه للتوصيل. راسلينا على واتساب برقم الطلب.')}</> },
  { q: t('وصلني منتج تالف أو خاطئ، ماذا أفعل؟'), a: <>{t('صوّريه وراسلينا خلال')} {S.damageReportHours} {t('ساعة، ونستبدله أو نسترد المبلغ مع رسوم التوصيل. التفاصيل في')} <Link className="text-link" to="/returns">{t('سياسة الاسترجاع')}</Link>.</> },
  { q: t('هل المنتجات أصلية؟'), a: <>{t('نعم، نتعامل مع متاجر معتمدة ونتحقق من الصلاحية قبل التجهيز.')}</> },
  { q: t('لماذا يطلب الموقع إذن تحديد الموقع؟'), a: <>{t('فقط إذا اخترتِ مشاركته عند حفظ الملف الشخصي، ليصل المندوب لعنوانكِ بدقة. يُرسل مرة واحدة، ولا نتتبعكِ. يمكنكِ حفظ الملف بدونه.')}</> },
  { q: t('كيف أحذف حسابي أو أنزّل بياناتي؟'), a: <>{t('من')} <Link className="text-link" to="/profile">{t('الملف الشخصي')}</Link> {t('← «بياناتكِ وحقوقكِ». التنزيل فوري، والحذف نهائي بعد تأكيد.')}</> },
  { q: t('هل تشاهد المتاجر بياناتي؟'), a: <>{t('لا. المتاجر تستلم المنتجات والكميات فقط. التفاصيل في')} <Link className="text-link" to="/privacy">{t('سياسة الخصوصية')}</Link>.</> },
]

export function FaqPage() {
  const S = useStoreInfo()
  return (
    <InfoLayout title={t('الأسئلة الشائعة')} lead={t('أجوبة سريعة لأكثر ما يسألنا عنه عميلاتنا.')} showUpdated={false}>
      <div className="faq-list">
        {faqItems(S).map((item) => <details key={item.q} className="faq-item"><summary>{item.q}<Icon name="chevron" className="faq-chevron size-4" /></summary><div className="faq-answer">{item.a}</div></details>)}
      </div>
      <p className="mt-6">{t('لم تجدي جوابكِ؟')} <Link className="text-link" to="/contact">{t('تواصلي معنا')}</Link>.</p>
    </InfoLayout>
  )
}

export function ContactPage() {
  const S = useStoreInfo()
  const { whatsapp, phone, email, address } = S
  return (
    <InfoLayout title={t('تواصلي معنا')} lead={t('فريق خدمة العميلات جاهز لمساعدتكِ في الطلبات والاستفسارات والاسترجاع.')} showUpdated={false}>
      <div className="contact-grid">
        {whatsapp ? (
          <a className="contact-card contact-card--primary" href={whatsappLink(whatsapp, t('مرحباً Gazabella، عندي استفسار'))} target="_blank" rel="noopener noreferrer" onClick={() => track('contact', { channel: 'whatsapp', page: '/contact' })}>
            <span className="contact-card__label">{t('واتساب — الأسرع')}</span>
            <b dir="ltr" className="num">+{whatsapp}</b>
            <span>{S.supportResponse}</span>
          </a>
        ) : (
          <div className="contact-card contact-card--muted"><span className="contact-card__label">{t('واتساب')}</span><b>{t('سيتوفر قريباً')}</b></div>
        )}
        {phone && <a className="contact-card" href={`tel:${phone}`} onClick={() => track('contact', { channel: 'phone', page: '/contact' })}><span className="contact-card__label"><Icon name="phone" className="size-4" /> {t('اتصال')}</span><b dir="ltr" className="num">{phone}</b></a>}
        {email && <a className="contact-card" href={`mailto:${email}`} onClick={() => track('contact', { channel: 'email', page: '/contact' })}><span className="contact-card__label">{t('البريد الإلكتروني')}</span><b dir="ltr">{email}</b></a>}
        <div className="contact-card"><span className="contact-card__label"><Icon name="clock" className="size-4" /> {t('ساعات الدعم')}</span><b>{S.supportHours}</b><span>{address || S.city}</span></div>
      </div>
      <Section title={t('قبل أن تراسلينا')}>
        <ul>
          <li>{t('جهّزي')} <b>{t('رقم الطلب')}</b> {t('(مثل GZ-260924-ABCDE) — تجدينه في')} <Link className="text-link" to="/orders">{t('طلباتي')}</Link>.</li>
          <li>{t('للمنتج التالف أو الخاطئ أرفقي صورة واضحة.')}</li>
          <li>{t('لن نطلب منكِ أبداً رمز التحقق (OTP) أو كود التسليم عبر الهاتف أو الرسائل.')}</li>
        </ul>
      </Section>
    </InfoLayout>
  )
}
