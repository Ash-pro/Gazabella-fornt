import { t } from '../../i18n'
import type { Invoice } from '../../types/api'
import { invoiceMethodLabel, invoiceStatusLabel, pick } from '../../lib/invoiceLabels'
import { formatDate, formatPrice } from '../../lib/format'
import { invoiceVerifyUrl } from '../../api/invoices'
import { Barcode128 } from './Barcode128'
import { InvoiceQr } from './InvoiceQr'
import './invoice.css'

const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
const DATE_TIME: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }

/**
 * مستند الفاتورة بقياس A4 — نفسه للشاشة والطباعة («حفظ كـ PDF»)، وهو المرجع البصري لقالب الـ PDF في الباك اند.
 * لا يحتوي أي معرّف id (يُرسم مرتين: معاينة + نسخة الطباعة).
 */
export function InvoiceDocument({ invoice, demo }: { invoice: Invoice; demo: boolean }) {
  const credited = Number(invoice.credited_total) || 0
  const net = Math.max(0, Number(invoice.total) - credited)
  const freeDelivery = Number(invoice.delivery_fee) === 0
  const seller = invoice.seller
  const verifyUrl = invoice.verify_token ? invoiceVerifyUrl(invoice.verify_token) : null
  const returnsUrl = `${window.location.host}/returns`

  return (
    <article className="inv-doc" aria-label={t('فاتورة رقم {number}', { number: invoice.invoice_number })}>
      {demo && <p className="inv-doc__demo">{t('نسخة للعرض التجريبي — ليست فاتورة حقيقية')}</p>}

      <header className="inv-doc__head">
        <img className="inv-doc__logo" src="/brand/full-compact/logo-480.png" alt="Gazabella" width="160" height="117" decoding="sync" />
        <div className="inv-doc__title">
          <p className="inv-doc__kind">{t('فاتورة مبيعات')}</p>
          <p className="inv-doc__number num" dir="ltr">{invoice.invoice_number}</p>
          <span className={`inv-status inv-status--${invoice.status}`}>{invoiceStatusLabel(invoice.status)}</span>
        </div>
      </header>

      <dl className="inv-doc__meta">
        <div><dt>{t('تاريخ الإصدار')}</dt><dd>{formatDate(invoice.issued_at, DATE)}</dd></div>
        <div><dt>{t('رقم الطلب')}</dt><dd className="num" dir="ltr">{invoice.order_number}</dd></div>
        <div><dt>{t('تاريخ الدفع')}</dt><dd>{formatDate(invoice.paid_at, DATE_TIME)}</dd></div>
        <div><dt>{t('العملة')}</dt><dd>{t('شيكل (₪)')}</dd></div>
      </dl>

      <section className="inv-doc__parties">
        <div className="inv-party">
          <h3>{t('البائع')}</h3>
          <b>{seller.name}</b>
          {seller.address && <p>{pick(seller.address)}</p>}
          {seller.phone && <p><bdi className="num" dir="ltr">{seller.phone}</bdi></p>}
          {seller.email && <p><bdi dir="ltr">{seller.email}</bdi></p>}
          <p><bdi dir="ltr">{seller.website || window.location.host}</bdi></p>
        </div>
        <div className="inv-party">
          <h3>{t('فاتورة إلى')}</h3>
          <b>{invoice.customer.name || '—'}</b>
          {invoice.customer.phone_masked && <p><bdi className="num" dir="ltr">{invoice.customer.phone_masked}</bdi></p>}
          {invoice.customer.address && <p>{invoice.customer.address}</p>}
        </div>
      </section>

      <table className="inv-table">
        <thead>
          <tr>
            <th scope="col" className="inv-col-n">#</th>
            <th scope="col">{t('المنتج')}</th>
            <th scope="col" className="inv-col-qty">{t('الكمية')}</th>
            <th scope="col" className="inv-col-unit">{t('سعر الوحدة')}</th>
            <th scope="col" className="inv-col-sum">{t('المجموع')}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={item.id}>
              <td className="inv-col-n"><span className="num">{i + 1}</span></td>
              <td>
                <b className="inv-item__name">{pick(item.name)}</b>
                {item.variant && <small className="inv-item__variant">{pick(item.variant)}</small>}
                <small className="inv-item__unit">{t('سعر الوحدة')}: <span className="num">{formatPrice(item.unit_price)}</span></small>
                {item.credited_quantity > 0 && <small className="inv-item__credit">{t('استُرد منها {n} إلى المحفظة', { n: item.credited_quantity })}</small>}
              </td>
              <td className="inv-col-qty"><span className="num">{item.quantity}</span></td>
              <td className="inv-col-unit"><span className="num">{formatPrice(item.unit_price)}</span></td>
              <td className="inv-col-sum"><span className="num">{formatPrice(item.line_total)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inv-doc__bottom">
        <section className="inv-pay" aria-label={t('الدفع')}>
          <h3>{t('الدفع')}</h3>
          <ul>
            {invoice.payments.map((p, i) => (
              <li key={`${p.method}-${i}`}>
                <span className="inv-pay__method">{invoiceMethodLabel(p.method)}</span>
                <span className="inv-pay__meta">
                  {p.reference && <><span>{t('المرجع')}</span> <bdi className="num" dir="ltr">{p.reference}</bdi> · </>}
                  <span>{formatDate(p.paid_at, DATE_TIME)}</span>
                </span>
                <b className="num">{formatPrice(p.amount)}</b>
              </li>
            ))}
          </ul>
        </section>

        <dl className="inv-totals">
          <div><dt>{t('المجموع الفرعي')}</dt><dd className="num">{formatPrice(invoice.subtotal)}</dd></div>
          {invoice.discount_amount && (
            <div><dt>{t('الخصم')}{invoice.coupon_code && <> (<bdi dir="ltr">{invoice.coupon_code}</bdi>)</>}</dt><dd className="num">−{formatPrice(invoice.discount_amount)}</dd></div>
          )}
          <div>
            <dt>{t('التوصيل')}</dt>
            <dd className="num">
              {freeDelivery && invoice.delivery_fee_original && <s className="inv-totals__was">{formatPrice(invoice.delivery_fee_original)}</s>}
              {freeDelivery ? t('مجاني') : formatPrice(invoice.delivery_fee)}
            </dd>
          </div>
          <div className="inv-totals__grand"><dt>{t('الإجمالي المدفوع')}</dt><dd className="num">{formatPrice(invoice.total)}</dd></div>
          {credited > 0 && (
            <>
              <div className="inv-totals__credit"><dt>{t('مسترد إلى المحفظة')}</dt><dd className="num">−{formatPrice(credited)}</dd></div>
              <div className="inv-totals__net"><dt>{t('صافي الفاتورة')}</dt><dd className="num">{formatPrice(net)}</dd></div>
            </>
          )}
        </dl>
      </div>

      {invoice.credit_notes.length > 0 && (
        <section className="inv-credits">
          <h3>{t('إشعارات دائنة مرتبطة')}</h3>
          {invoice.credit_notes.map((c) => (
            <div key={c.credit_note_number} className="inv-credit">
              <div className="inv-credit__head">
                <b className="num" dir="ltr">{c.credit_note_number}</b>
                <span>{formatDate(c.issued_at, DATE)}</span>
                <b className="num">−{formatPrice(c.amount)}</b>
              </div>
              <p>{pick(c.reason)}</p>
              <ul>{c.lines.map((l, i) => <li key={i}>{pick(l.name)} × <span className="num">{l.quantity}</span> — <span className="num">{formatPrice(l.amount)}</span></li>)}</ul>
            </div>
          ))}
        </section>
      )}

      <footer className="inv-doc__foot">
        <div className="inv-codes">
          <div className="inv-codes__bar">
            <Barcode128 value={invoice.invoice_number} className="inv-barcode" label={t('باركود الفاتورة {number}', { number: invoice.invoice_number })} />
            <span className="num" dir="ltr">{invoice.invoice_number}</span>
          </div>
          {verifyUrl && (
            <div className="inv-codes__qr">
              <InvoiceQr value={verifyUrl} className="inv-qr" label={t('رمز QR للتحقق من الفاتورة')} />
              <span>{t('امسحي الرمز للتحقق من صحة الفاتورة')}</span>
            </div>
          )}
        </div>
        <p className="inv-doc__thanks">{t('شكراً لتسوّقكِ من Gazabella')}</p>
        <p className="inv-doc__fine">
          {t('فاتورة إلكترونية صادرة عند تأكيد الدفع ولا تحتاج إلى توقيع.')} {t('سياسة الاسترجاع:')} <bdi dir="ltr">{returnsUrl}</bdi>
        </p>
      </footer>
    </article>
  )
}
