import { t } from '../i18n'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AccountShell } from '../components/account/AccountShell'
import { OrderCard } from '../components/account/OrderCard'
import { ErrorState } from '../components/ui/AsyncState'
import { Icon } from '../components/ui/Icon'
import { useAccountOrders } from '../hooks/useAccountOrders'
import { useStoreInfo } from '../hooks/useStoreInfo'
import { getApiErrorMessage } from '../lib/apiClient'
import { ORDER_GROUPS, countByGroup, isOrderGroup, orderGroup, orderMatches, type OrderGroup } from '../lib/orderSearch'

const PAGE_SIZE = 8

export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const statusParam = params.get('status')
  const group: OrderGroup = isOrderGroup(statusParam) ? statusParam : 'all'
  const ordersQuery = useAccountOrders()
  const store = useStoreInfo()

  const listKey = `${query.trim()}|${group}`
  const [shown, setShown] = useState({ key: listKey, count: PAGE_SIZE })
  const visibleCount = shown.key === listKey ? shown.count : PAGE_SIZE

  const setParam = (key: 'q' | 'status', value: string) => setParams((prev) => {
    const next = new URLSearchParams(prev)
    if (value && !(key === 'status' && value === 'all')) next.set(key, value)
    else next.delete(key)
    return next
  }, { replace: true })

  const all = ordersQuery.data?.orders ?? []
  const matched = all.filter((o) => orderMatches(o, query))
  const counts = countByGroup(matched)
  const filtered = group === 'all' ? matched : matched.filter((o) => orderGroup(o.status) === group)
  const visible = filtered.slice(0, visibleCount)
  const term = query.trim()
  const clearAll = () => setParams(new URLSearchParams(), { replace: true })

  return (
    <AccountShell active="orders" search={{ mode: 'filter', value: query, onChange: (v) => setParam('q', v) }}>
      {ordersQuery.isError ? (
        <ErrorState message={getApiErrorMessage(ordersQuery.error)} onRetry={() => void ordersQuery.refetch()} />
      ) : ordersQuery.isLoading ? (
        <div className="acct-list" role="status" aria-label={t('نحمّل طلباتكِ')}>{[0, 1, 2].map((i) => <div key={i} className="acct-skel" />)}</div>
      ) : !all.length ? (
        <div className="acct-empty">
          <span className="acct-empty__icon"><Icon name="bag" className="size-7" /></span>
          <h2>{t('لا توجد طلبات بعد')}</h2>
          <p>{t('عند إتمام أول طلب سيظهر هنا مع حالته خطوة بخطوة.')}</p>
          <Link className="btn-primary" to="/products">{t('ابدئي التسوق')}</Link>
        </div>
      ) : (
        <>
          <div className="acct-filters" role="group" aria-label={t('تصفية حسب الحالة')}>
            {ORDER_GROUPS.map((g) => (
              <button key={g.key} type="button" className="acct-chip" aria-pressed={group === g.key} onClick={() => setParam('status', g.key)}>
                {t(g.label)}<b className="num">{counts[g.key]}</b>
              </button>
            ))}
          </div>

          <div className="acct-results" aria-live="polite">
            <span>{term ? <>{t('نتائج «')}<b>{term}</b>»: </> : null}<span className="num">{filtered.length}</span> {filtered.length === 1 ? t('طلب') : t('طلبات')}</span>
            {(term || group !== 'all') && <button type="button" className="text-link" onClick={clearAll}>{t('إلغاء التصفية')}</button>}
          </div>

          {filtered.length ? (
            <div className="acct-list">
              {visible.map((order) => <OrderCard key={order.id} order={order} query={term} whatsapp={store.whatsapp} acceptanceMinutes={store.acceptanceWindowMinutes} />)}
            </div>
          ) : (
            <div className="acct-empty">
              <span className="acct-empty__icon"><Icon name="search" className="size-7" /></span>
              <h2>{t('لا يوجد طلب مطابق')}</h2>
              <p>{term ? <>{t('لم نجد «')}{term}{t('» في')} {group === 'all' ? t('طلباتكِ') : t('هذه الحالة')}{t('. جرّبي جزءاً من رقم الطلب أو اسم المنتج.')}</> : t('لا توجد طلبات بهذه الحالة حالياً.')}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-ghost" onClick={clearAll}>{t('عرض كل الطلبات')}</button>
                {term && <Link className="btn-primary" to={`/products?search=${encodeURIComponent(term)}`}>{t('ابحثي عنه في المتجر')}</Link>}
              </div>
            </div>
          )}

          {filtered.length > visibleCount && (
            <div className="mt-6 flex justify-center">
              <button type="button" className="btn-ghost" onClick={() => setShown({ key: listKey, count: visibleCount + PAGE_SIZE })}>
                {t('عرض المزيد (')}<span className="num">{filtered.length - visibleCount}</span>)
              </button>
            </div>
          )}
          {term && !!filtered.length && (
            <p className="acct-store-hint"><Icon name="bag" className="size-4" />{t('تبحثين عن منتج لإعادة طلبه؟')} <Link className="text-link" to={`/products?search=${encodeURIComponent(term)}`}>{t('ابحثي عن «')}{term}{t('» في المتجر')}</Link></p>
          )}
          {ordersQuery.data?.truncated && <p className="acct-results">{t('نعرض آخر')} <span className="num">{all.length}</span> {t('طلباً من أصل')} <span className="num">{ordersQuery.data.total}</span>.</p>}
        </>
      )}
    </AccountShell>
  )
}
