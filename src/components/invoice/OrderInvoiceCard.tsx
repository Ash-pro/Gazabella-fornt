import { t } from '../../i18n'
import { Link } from 'react-router-dom'
import type { Order } from '../../types/api'
import { invoicesEnabled } from '../../api/invoices'
import { invoicePath } from '../../hooks/useInvoices'
import { formatDate } from '../../lib/format'
import { Icon } from '../ui/Icon'

/**
 * INV: بطاقة فاتورة الطلب في صفحة تفاصيله.
 * لا تظهر إن لم يرسل الخادم الحقل (undefined) أو كان الطلب ملغى قبل الدفع.
 */
export function OrderInvoiceCard({ order }: { order: Order }) {
  if (!invoicesEnabled() || order.invoice === undefined) return null
  const inv = order.invoice
  if (!inv && (order.status === 'cancelled' || order.payment_status === 'failed')) return null
  return (
    <section className="checkout-card inv-order-card" aria-labelledby="inv-order-title">
      <h2 id="inv-order-title" className="inv-order-card__title"><Icon name="receipt" className="size-5" />{t('فاتورة الطلب')}</h2>
      {inv ? (
        <>
          <p className="inv-order-card__number num" dir="ltr">{inv.invoice_number}</p>
          <p className="inv-order-card__sub">{t('صدرت في')} <span>{formatDate(inv.issued_at)}</span></p>
          <Link className="btn-primary w-full" to={invoicePath(inv.invoice_number)}><Icon name="receipt" className="size-4" />{t('عرض الفاتورة وتحميلها')}</Link>
        </>
      ) : (
        <p className="inv-order-card__sub">
          {order.payment_status === 'paid' ? t('نجهّز فاتورتكِ الآن، وتظهر هنا خلال لحظات.') : t('تصدر فاتورة هذا الطلب تلقائياً بعد إتمام الدفع.')}
        </p>
      )}
    </section>
  )
}
