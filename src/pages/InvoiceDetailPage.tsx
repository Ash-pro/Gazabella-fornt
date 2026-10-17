import { t } from '../i18n'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorState, PageLoader } from '../components/ui/AsyncState'
import { DemoBadge } from '../components/ui/DemoBadge'
import { Icon } from '../components/ui/Icon'
import { InvoiceDocument } from '../components/invoice/InvoiceDocument'
import { downloadInvoicePdf } from '../api/invoices'
import { useInvoice } from '../hooks/useInvoices'
import { orderPath } from '../hooks/useAccountOrders'
import { getApiErrorMessage } from '../lib/apiClient'
import { useSeo } from '../lib/seo'

const statusOf = (error: unknown) => (error as { response?: { status?: number } })?.response?.status

/** ينتظر الخطوط وصورة الشعار قبل فتح نافذة الطباعة حتى لا يخرج الـ PDF بخط بديل أو بلا شعار */
async function printWhenReady() {
  try { await document.fonts?.ready } catch { /* المتصفح لا يدعم fonts API */ }
  const logos = [...document.querySelectorAll<HTMLImageElement>('.inv-print-root img')]
  await Promise.all(logos.map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r }))))
  window.print()
}

export function InvoiceDetailPage() {
  const { invoiceNumber = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const query = useInvoice(invoiceNumber)
  const invoice = query.data?.data
  const demo = query.data?.demo ?? false
  const [printHint, setPrintHint] = useState(false)
  useSeo({ title: invoice ? t('فاتورة {number}', { number: invoice.invoice_number }) : t('الفاتورة'), noindex: true })

  // اسم ملف «حفظ كـ PDF» الافتراضي = عنوان الصفحة وقت الطباعة
  useEffect(() => {
    if (!invoice) return
    let previous = document.title
    const before = () => { previous = document.title; document.title = `Gazabella-${invoice.invoice_number}` }
    const after = () => { document.title = previous }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after) }
  }, [invoice])

  const print = useCallback(() => { void printWhenReady() }, [])

  // ‎?print=1‎ — قادمة من زر PDF في القائمة (وضع العرض): تُفتح الطباعة مرة واحدة ثم يُحذف المعامل
  const autoPrint = Boolean(invoice) && params.get('print') === '1'
  useEffect(() => {
    if (!autoPrint) return
    const timer = setTimeout(() => {
      setPrintHint(true)
      setParams((prev) => { const next = new URLSearchParams(prev); next.delete('print'); return next }, { replace: true })
      print()
    }, 250)
    return () => clearTimeout(timer)
  }, [autoPrint, setParams, print])

  const pdf = useMutation({
    mutationFn: () => downloadInvoicePdf(invoiceNumber, demo),
    onSuccess: (result) => { if (result.kind === 'print') { setPrintHint(true); print() } },
  })

  if (query.isLoading) return <div className="container-page"><PageLoader label={t('نجهّز فاتورتكِ…')} /></div>
  if (query.isError || !invoice) {
    const missing = statusOf(query.error) === 404 || statusOf(query.error) === 403 || !query.isError
    return (
      <div className="container-page">
        <ErrorState
          title={missing ? t('لم نجد هذه الفاتورة') : t('لم نتمكن من تحميل الفاتورة')}
          message={missing ? t('تأكدي من الرابط، أو افتحي الفاتورة من قائمة «فواتيري».') : getApiErrorMessage(query.error)}
          onRetry={missing ? undefined : () => void query.refetch()}
        />
        <p className="text-center"><Link className="text-link" to="/invoices">{t('العودة إلى فواتيري')}</Link></p>
      </div>
    )
  }

  return (
    <div className="container-page inv-detail">
      <nav className="inv-detail__bar" aria-label={t('إجراءات الفاتورة')}>
        <Link className="inv-detail__back" to="/invoices"><Icon name="arrow" className="size-4 rotate-180 rtl:rotate-0" />{t('فواتيري')}</Link>
        <DemoBadge show={demo} />
        <div className="inv-detail__actions">
          <Link className="btn-ghost" to={orderPath(invoice)}><Icon name="package" className="size-4" />{t('تفاصيل الطلب')}</Link>
          <button type="button" className="btn-ghost" onClick={print}><Icon name="printer" className="size-4" />{t('طباعة')}</button>
          <button type="button" className="btn-primary" disabled={pdf.isPending} onClick={() => pdf.mutate()}>
            <Icon name="download" className="size-4" />{pdf.isPending ? t('نجهّز الملف…') : t('تحميل PDF')}
          </button>
        </div>
      </nav>
      {pdf.isError && <p role="alert" className="field-error inv-detail__msg">{getApiErrorMessage(pdf.error)}</p>}
      {printHint && <p className="trk-note inv-detail__msg" role="status"><Icon name="printer" className="size-4 shrink-0" />{t('في نافذة الطباعة اختاري «حفظ كـ PDF» لتنزيل الفاتورة على جهازكِ.')}</p>}

      <InvoiceDocument invoice={invoice} demo={demo} />

      {createPortal(<div className="inv-print-root" aria-hidden="true"><InvoiceDocument invoice={invoice} demo={demo} /></div>, document.body)}
    </div>
  )
}
