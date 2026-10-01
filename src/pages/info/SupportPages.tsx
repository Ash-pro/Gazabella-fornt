import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { whatsappLink } from '../../content/storeInfo'
import { useStoreInfo, type StoreInfoView } from '../../hooks/useStoreInfo'
import { formatPrice } from '../../lib/format'
import { Icon } from '../../components/ui/Icon'
import { InfoLayout, Section } from './InfoLayout'
import { track } from '../../lib/analytics'

const faqItems = (S: StoreInfoView): { q: string; a: ReactNode }[] => [
  { q: 'كيف أطلب؟', a: <>اختاري المنتجات وأضيفيها للسلة، ثم «إتمام الطلب»، أدخلي رقم جوالكِ وعنوانكِ، وراجعي الإجمالي ثم أكّدي. يصلكِ رمز تحقق على جوالكِ لتأكيد الرقم.</> },
  { q: 'ما طرق الدفع المتاحة؟', a: <>حالياً <b>الدفع نقداً عند الاستلام</b> فقط. سنعلن عن الدفع الإلكتروني فور إتاحته.</> },
  { q: 'كم رسوم التوصيل ومتى يصل طلبي؟', a: <>تبدأ الرسوم من <span className="num">{formatPrice(S.minDeliveryFee)}</span> حسب المنطقة، وتظهر قبل التأكيد. التفاصيل والمدد في <Link className="text-link" to="/delivery-info">صفحة التوصيل</Link>.</> },
  { q: 'كيف أتابع طلبي؟', a: <>من <Link className="text-link" to="/orders">طلباتي</Link> بعد تسجيل الدخول برقمكِ، أو من <Link className="text-link" to="/orders/lookup">تتبع طلب</Link>. الحالات: بانتظار التأكيد ← مؤكد ← خرج للتوصيل ← تم التسليم.</> },
  { q: 'ما هو كود التسليم؟', a: <>كود خاص بطلبكِ يظهر في صفحة الطلب. أعطيه للمندوب عند استلام الطلب فقط — لا تشاركيه مسبقاً مع أحد.</> },
  { q: 'هل يمكنني إلغاء الطلب؟', a: <>نعم، مجاناً قبل خروجه للتوصيل. راسلينا على واتساب برقم الطلب.</> },
  { q: 'وصلني منتج تالف أو خاطئ، ماذا أفعل؟', a: <>صوّريه وراسلينا خلال {S.damageReportHours} ساعة، ونستبدله أو نسترد المبلغ مع رسوم التوصيل. التفاصيل في <Link className="text-link" to="/returns">سياسة الاسترجاع</Link>.</> },
  { q: 'هل المنتجات أصلية؟', a: <>نعم، نتعامل مع متاجر معتمدة ونتحقق من الصلاحية قبل التجهيز.</> },
  { q: 'لماذا يطلب الموقع إذن تحديد الموقع؟', a: <>فقط إذا اخترتِ مشاركته عند حفظ الملف الشخصي، ليصل المندوب لعنوانكِ بدقة. يُرسل مرة واحدة، ولا نتتبعكِ. يمكنكِ حفظ الملف بدونه.</> },
  { q: 'كيف أحذف حسابي أو أنزّل بياناتي؟', a: <>من <Link className="text-link" to="/profile">الملف الشخصي</Link> ← «بياناتكِ وحقوقكِ». التنزيل فوري، والحذف نهائي بعد تأكيد.</> },
  { q: 'هل تشاهد المتاجر بياناتي؟', a: <>لا. المتاجر تستلم المنتجات والكميات فقط. التفاصيل في <Link className="text-link" to="/privacy">سياسة الخصوصية</Link>.</> },
]

export function FaqPage() {
  const S = useStoreInfo()
  return (
    <InfoLayout title="الأسئلة الشائعة" lead="أجوبة سريعة لأكثر ما يسألنا عنه عميلاتنا." showUpdated={false}>
      <div className="faq-list">
        {faqItems(S).map((item) => <details key={item.q} className="faq-item"><summary>{item.q}<Icon name="chevron" className="faq-chevron size-4" /></summary><div className="faq-answer">{item.a}</div></details>)}
      </div>
      <p className="mt-6">لم تجدي جوابكِ؟ <Link className="text-link" to="/contact">تواصلي معنا</Link>.</p>
    </InfoLayout>
  )
}

export function ContactPage() {
  const S = useStoreInfo()
  const { whatsapp, phone, email, address } = S
  return (
    <InfoLayout title="تواصلي معنا" lead="فريق خدمة العميلات جاهز لمساعدتكِ في الطلبات والاستفسارات والاسترجاع." showUpdated={false}>
      <div className="contact-grid">
        {whatsapp ? (
          <a className="contact-card contact-card--primary" href={whatsappLink(whatsapp, 'مرحباً Gazabella، عندي استفسار')} target="_blank" rel="noopener noreferrer" onClick={() => track('contact', { channel: 'whatsapp', page: '/contact' })}>
            <span className="contact-card__label">واتساب — الأسرع</span>
            <b dir="ltr" className="num">+{whatsapp}</b>
            <span>{S.supportResponse}</span>
          </a>
        ) : (
          <div className="contact-card contact-card--muted"><span className="contact-card__label">واتساب</span><b>سيتوفر قريباً</b></div>
        )}
        {phone && <a className="contact-card" href={`tel:${phone}`} onClick={() => track('contact', { channel: 'phone', page: '/contact' })}><span className="contact-card__label"><Icon name="phone" className="size-4" /> اتصال</span><b dir="ltr" className="num">{phone}</b></a>}
        {email && <a className="contact-card" href={`mailto:${email}`} onClick={() => track('contact', { channel: 'email', page: '/contact' })}><span className="contact-card__label">البريد الإلكتروني</span><b dir="ltr">{email}</b></a>}
        <div className="contact-card"><span className="contact-card__label"><Icon name="clock" className="size-4" /> ساعات الدعم</span><b>{S.supportHours}</b><span>{address || S.city}</span></div>
      </div>
      <Section title="قبل أن تراسلينا">
        <ul>
          <li>جهّزي <b>رقم الطلب</b> (مثل GZ-260924-ABCDE) — تجدينه في <Link className="text-link" to="/orders">طلباتي</Link>.</li>
          <li>للمنتج التالف أو الخاطئ أرفقي صورة واضحة.</li>
          <li>لن نطلب منكِ أبداً رمز التحقق (OTP) أو كود التسليم عبر الهاتف أو الرسائل.</li>
        </ul>
      </Section>
    </InfoLayout>
  )
}
