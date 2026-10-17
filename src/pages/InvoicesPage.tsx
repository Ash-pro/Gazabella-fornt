import { plural, t } from '../i18n'
import '../components/invoice/invoice.css'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AccountShell } from '../components/account/AccountShell'
import { ErrorState } from '../components/ui/AsyncState'
import { DemoBadge } from '../components/ui/DemoBadge'
import { Icon } from '../components/ui/Icon'
import { invoiceMethodLabel, invoiceStatusLabel, pick } from '../lib/invoiceLabels'
import { downloadInvoicePdf } from '../api/invoices'
import { invoicePath, useInvoices } from '../hooks/useInvoices'
import { orderPath } from '../hooks/useAccountOrders'
import { getApiErrorMessage } from '../lib/apiClient'
import { formatDate, formatPrice } from '../lib/format'
import { normalizeSearch } from '../lib/orderSearch'
import { useSeo } from '../lib/seo'
import type { InvoiceSummary } from '../types/api'

const net = (inv: InvoiceSummary) => Math.max(0, Number(inv.total) - (Number(inv.credited_total) || 0))

function matches(inv: InvoiceSummary, term: string): boolean {
  const q = normalizeSearch(term)
  if (!q) return true
  return [inv.invoice_number, inv.order_number, inv.first_item?.ar, inv.first_item?.en].some((v) => normalizeSearch(v).includes(q))
}

/** مجموعات حسب الشهر (الأحدث أولاً) */
function byMonth(list: InvoiceSummary[]): Array<{ key: string; label: string; items: InvoiceSummary[] }> {
  const groups = new Map<string, InvoiceSummary[]>()
  for (const inv of [...list].sort((a, b) => Date.parse(b.issued_at) - Date.parse(a.issued_at))) {
    const d = new Date(inv.issued_at)
    const key = Number.isNaN(d.getTime()) ? 'x' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    groups.set(key, [...(groups.get(key) ?? []), inv])
  }
  return [...groups].map(([key, items]) => ({ key, items, label: key === 'x' ? '—' : formatDate(items[0].issued_at, { month: 'long', year: 'numeric' }) }))
}

function PdfButton({ invoice, demo }: { invoice: InvoiceSummary; demo: boolean }) {
  const navigate = useNavigate()
  const pdf = useMutation({
    mutationFn: () => downloadInvoicePdf(invoice.invoice_number, demo),
    onSuccess: (result) => { if (result.kind === 'print') navigate(`${invoicePath(invoice.invoice_number)}?print=1`) },
  })
  return (
    <>
      <button type="button" className="btn-ghost inv-row__pdf" disabled={pdf.isPending} onClick={() => pdf.mutate()}
        aria-label={t('تحميل الفاتورة {number} PDF', { number: invoice.invoice_number })}>
        <Icon name="download" className="size-4" />{pdf.isPending ? t('نجهّز الملف…') : 'PDF'}
      </button>
      {pdf.isError && <p role="alert" className="field-error inv-row__error">{getApiErrorMessage(pdf.error)}</p>}
    </>
  )
}

function InvoiceRow({ invoice, demo }: { invoice: InvoiceSummary; demo: boolean }) {
  const more = invoice.items_count - 1
  return (
    <li className="inv-row">
      <span className="inv-row__icon" aria-hidden="true"><Icon name="receipt" className="size-5" /></span>
      <div className="inv-row__main">
        <p className="inv-row__top">
          <Link className="inv-row__number num" dir="ltr" to={invoicePath(invoice.invoice_number)}>{invoice.invoice_number}</Link>
          <span className={`inv-status inv-status--${invoice.status}`}>{invoiceStatusLabel(invoice.status)}</span>
        </p>
        <p className="inv-row__what">
          {pick(invoice.first_item) || t('طلب')}
          {more > 0 && <span> {plural(more, { one: '+ منتج آخر', two: '+ منتجان آخران', few: '+ {n} منتجات أخرى', many: '+ {n} منتجاً آخر' })}</span>}
        </p>
        <p className="inv-row__meta">
          <span>{formatDate(invoice.issued_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span aria-hidden="true">·</span>
          <span>{t('الطلب')} <Link className="num" dir="ltr" to={orderPath(invoice)}>{invoice.order_number}</Link></span>
          <span aria-hidden="true">·</span>
          <span>{invoice.payment_methods.map(invoiceMethodLabel).join(' + ') || '—'}</span>
        </p>
      </div>
      <div className="inv-row__side">
        <strong className="num">{formatPrice(invoice.total)}</strong>
        {Number(invoice.credited_total) > 0 && <small className="num">{t('مسترد')} −{formatPrice(invoice.credited_total)}</small>}
        <div className="inv-row__actions">
          <Link className="btn-primary inv-row__view" to={invoicePath(invoice.invoice_number)}>{t('عرض')}</Link>
          <PdfButton invoice={invoice} demo={demo} />
        </div>
      </div>
    </li>
  )
}

export function InvoicesPage() {
  useSeo({ title: t('فواتيري'), noindex: true })
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const yearParam = Number(params.get('year')) || null
  const invoices = useInvoices()
  const all = invoices.data?.data.data ?? []
  const demo = invoices.data?.demo ?? false
  const years = [...new Set([...(invoices.data?.data.meta.years ?? []), ...all.map((i) => new Date(i.issued_at).getFullYear())])].filter(Number.isInteger).sort((a, b) => b - a)
  const year = yearParam && years.includes(yearParam) ? yearParam : null

  const inYear = year ? all.filter((i) => new Date(i.issued_at).getFullYear() === year) : all
  const shown = inYear.filter((i) => matches(i, query))
  const thisYear = new Date().getFullYear()
  const paidThisYear = all.filter((i) => new Date(i.issued_at).getFullYear() === thisYear).reduce((s, i) => s + net(i), 0)
  const setYear = (y: number | null) => setParams((prev) => {
    const next = new URLSearchParams(prev)
    if (y) next.set('year', String(y))
    else next.delete('year')
    return next
  }, { replace: true })
  const onSearch = (value: string) => {
    setQuery(value)
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value.trim()) next.set('q', value)
      else next.delete('q')
      return next
    }, { replace: true })
  }

  return (
    <AccountShell active="invoices" search={{ mode: 'filter', value: query, onChange: onSearch }}>
      <section className="inv-page" aria-labelledby="inv-title">
        <header className="inv-page__head">
          <div>
            <h2 id="inv-title" className="inv-page__title">{t('فواتيري')}<DemoBadge show={demo} /></h2>
            <p className="inv-page__sub">{t('تصدر فاتورة لكل طلب تلقائياً لحظة تأكيد الدفع، ويمكنكِ تحميلها PDF في أي وقت.')}</p>
          </div>
          {!invoices.isLoading && all.length > 0 && (
            <dl className="inv-page__stats">
              <div><dt>{t('عدد الفواتير')}</dt><dd className="num">{all.length}</dd></div>
              <div><dt>{t('مدفوعات {year}', { year: thisYear })}</dt><dd className="num">{formatPrice(paidThisYear)}</dd></div>
            </dl>
          )}
        </header>

        {years.length > 1 && (
          <div className="inv-years" role="group" aria-label={t('السنة')}>
            <button type="button" className="inv-year" aria-pressed={!year} onClick={() => setYear(null)}>{t('كل السنوات')}</button>
            {years.map((y) => <button key={y} type="button" className="inv-year num" aria-pressed={year === y} onClick={() => setYear(y)}>{y}</button>)}
          </div>
        )}

        {invoices.isLoading ? (
          <div className="inv-list" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="dash-card dash-skel inv-skel" />)}</div>
        ) : invoices.isError ? (
          <ErrorState message={getApiErrorMessage(invoices.error)} onRetry={() => void invoices.refetch()} />
        ) : !all.length ? (
          <div className="dash-card dash-empty">
            <span className="trk-badge"><Icon name="receipt" className="size-7" /></span>
            <b>{t('لا فواتير بعد')}</b>
            <p>{t('ستظهر هنا فاتورة كل طلب بعد إتمام دفعه.')}</p>
            <Link className="btn-primary" to="/orders">{t('طلباتي')}</Link>
          </div>
        ) : !shown.length ? (
          <div className="dash-card dash-empty">
            <span className="trk-badge"><Icon name="search" className="size-7" /></span>
            <b>{t('لا توجد فاتورة مطابقة')}</b>
            <p>{t('جرّبي رقم الفاتورة أو رقم الطلب أو اسم منتج.')}</p>
            <button type="button" className="btn-ghost" onClick={() => { onSearch(''); setYear(null) }}>{t('عرض كل الفواتير')}</button>
          </div>
        ) : (
          byMonth(shown).map((group) => (
            <section key={group.key} className="inv-group" aria-label={group.label}>
              <h3 className="inv-group__title">
                <span>{group.label}</span>
                <small className="num">{formatPrice(group.items.reduce((s, i) => s + net(i), 0))}</small>
              </h3>
              <ul className="inv-list">{group.items.map((inv) => <InvoiceRow key={inv.invoice_number} invoice={inv} demo={demo} />)}</ul>
            </section>
          ))
        )}
      </section>
    </AccountShell>
  )
}
