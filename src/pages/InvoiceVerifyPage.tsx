import { t } from '../i18n'
import '../components/invoice/invoice.css'
import { Link, useParams } from 'react-router-dom'
import { PageLoader } from '../components/ui/AsyncState'
import { DemoBadge } from '../components/ui/DemoBadge'
import { Icon } from '../components/ui/Icon'
import { invoiceStatusLabel } from '../lib/invoiceLabels'
import { useInvoiceVerification } from '../hooks/useInvoices'
import { getApiErrorMessage } from '../lib/apiClient'
import { formatDate, formatPrice } from '../lib/format'
import { useSeo } from '../lib/seo'

const statusOf = (error: unknown) => (error as { response?: { status?: number } })?.response?.status

/** صفحة عامة يفتحها رمز QR — تعرض رقم الفاتورة وتاريخها وإجماليها وحالتها فقط، بلا أي بيانات شخصية */
export function InvoiceVerifyPage() {
  const { token = '' } = useParams()
  useSeo({ title: t('التحقق من فاتورة'), noindex: true })
  const query = useInvoiceVerification(token)
  const result = query.data?.data

  return (
    <div className="container-page inv-verify">
      {query.isLoading ? <PageLoader label={t('نتحقق من الفاتورة…')} /> : result ? (
        <section className="inv-verify__card is-valid" aria-labelledby="inv-verify-title">
          <span className="inv-verify__badge"><Icon name="check" className="size-7" /></span>
          <h1 id="inv-verify-title">{t('فاتورة صحيحة صادرة من Gazabella')}<DemoBadge show={query.data?.demo ?? false} /></h1>
          <dl>
            <div><dt>{t('رقم الفاتورة')}</dt><dd className="num" dir="ltr">{result.invoice_number}</dd></div>
            <div><dt>{t('تاريخ الإصدار')}</dt><dd>{formatDate(result.issued_at)}</dd></div>
            <div><dt>{t('الإجمالي')}</dt><dd className="num">{formatPrice(result.total)}</dd></div>
            <div><dt>{t('الحالة')}</dt><dd>{invoiceStatusLabel(result.status)}</dd></div>
          </dl>
          <p className="inv-verify__note">{t('لحماية الخصوصية لا تعرض هذه الصفحة أي بيانات عن صاحبة الفاتورة أو منتجاتها.')}</p>
        </section>
      ) : (
        <section className="inv-verify__card is-invalid" aria-labelledby="inv-verify-title">
          <span className="inv-verify__badge"><Icon name="alert" className="size-7" /></span>
          <h1 id="inv-verify-title">{statusOf(query.error) === 404 || !query.isError ? t('لم نتمكن من التحقق من هذه الفاتورة') : t('تعذّر التحقق الآن')}</h1>
          <p>{statusOf(query.error) === 404 || !query.isError ? t('رمز التحقق غير صحيح أو غير موجود. إن وصلتكِ هذه الفاتورة من جهة أخرى، تواصلي معنا قبل الاعتماد عليها.') : getApiErrorMessage(query.error)}</p>
          <Link className="btn-ghost" to="/contact">{t('تواصلي معنا')}</Link>
        </section>
      )}
    </div>
  )
}
