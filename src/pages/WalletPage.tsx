import { t } from '../i18n'
import { ALL_PRODUCTS } from '../lib/routes'
import { Link } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { AccountShell } from '../components/account/AccountShell'
import { ErrorState } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { formatDate, formatPrice } from '../lib/format'
import { useSeo } from '../lib/seo'

type IconName = Parameters<typeof Icon>[0]['name']

const HOW: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: 'refresh', title: 'تُضاف تلقائياً', text: 'عند إلغاء طلب مدفوع مسبقاً يعود مبلغه إلى محفظتكِ.' },
  { icon: 'bag', title: 'تُستخدم عند الدفع', text: 'اختاري «الدفع من المحفظة» في صفحة إتمام الطلب.' },
  { icon: 'shield', title: 'رصيدكِ محفوظ', text: 'يبقى في حسابكِ ولا يُستخدم إلا بموافقتكِ.' },
]
const TYPE_LABEL: Record<string, string> = { refund: 'استرداد طلب ملغى', purchase: 'شراء من المحفظة', adjustment: 'تعديل من الإدارة', credit: 'إضافة رصيد', debit: 'خصم رصيد' }

export function WalletPage() {
  useSeo({ title: t('محفظتي'), noindex: true })
  const wallet = useWallet()
  const data = wallet.data
  const balance = Number(data?.balance ?? 0)

  return (
    <AccountShell active="wallet" search={{ mode: 'jump' }}>
      <div className="wallet">
        <section className="wallet-card" aria-labelledby="wallet-title">
          <div className="wallet-card__top"><span className="wallet-card__icon"><Icon name="wallet" className="size-6" /></span><h2 id="wallet-title">{t('محفظتي')}</h2></div>
          <p className="wallet-card__label">{t('الرصيد المتاح')}</p>
          <p className="wallet-card__balance num">{wallet.isLoading ? '—' : formatPrice(balance)}</p>
          <Link className="wallet-card__cta" to={ALL_PRODUCTS}>{balance > 0 ? t('تسوّقي برصيدكِ') : t('تسوّقي الآن')} <Icon name="arrow" className="size-4 rtl:rotate-180" /></Link>
        </section>

        <aside className="wallet-how" aria-label={t('كيف تعمل المحفظة')}>
          {HOW.map((item) => <div key={item.title} className="trk-tip"><span><Icon name={item.icon} className="size-5" /></span><div><b>{t(item.title)}</b><p>{t(item.text)}</p></div></div>)}
        </aside>

        <section className="wallet-log" aria-labelledby="wallet-log-title">
          <h2 id="wallet-log-title">{t('حركات المحفظة')}</h2>
          {data && !data.available && <p className="trk-note"><Icon name="clock" className="size-4 shrink-0" />{t('المحفظة تُفعَّل قريباً — سيظهر رصيدكِ وحركاته هنا.')}</p>}
          {wallet.isLoading ? <div className="dash-card dash-skel" aria-busy="true" />
            : wallet.isError ? <ErrorState message={getApiErrorMessage(wallet.error)} onRetry={() => void wallet.refetch()} />
            : data?.transactions.length ? (
              <ul className="wallet-rows">
                {data.transactions.map((tx) => {
                  const credit = Number(tx.amount) >= 0
                  return (
                    <li key={tx.id}>
                      <span className={`wallet-dot ${credit ? 'is-in' : 'is-out'}`}><Icon name={credit ? 'plus' : 'minus'} className="size-4" /></span>
                      <div className="min-w-0 flex-1">
                        <b>{tx.label || t(TYPE_LABEL[tx.type] ?? 'حركة على المحفظة')}</b>
                        <small><span className="num">{formatDate(tx.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>{tx.order_number && <> · <bdi className="num" dir="ltr">{tx.order_number}</bdi></>}</small>
                      </div>
                      <strong className={`num ${credit ? 'is-in' : 'is-out'}`} dir="ltr">{credit ? '+' : '−'}{formatPrice(Math.abs(Number(tx.amount)))}</strong>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="dash-card dash-empty"><span className="trk-badge"><Icon name="wallet" className="size-7" /></span><b>{t('لا حركات بعد')}</b><p>{t('عند استرداد مبلغ طلب ملغى سيظهر هنا.')}</p></div>
            )}
        </section>
      </div>
    </AccountShell>
  )
}
