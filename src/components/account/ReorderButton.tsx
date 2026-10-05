import { t } from '../../i18n'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { queryClient } from '../../lib/queryClient'
import { useCartStore } from '../../stores/cartStore'
import { track } from '../../lib/analytics'
import type { Order } from '../../types/api'
import { Icon } from '../ui/Icon'

/** «اطلبيها مرة أخرى»: يضيف منتجات طلب سابق للسلة بالأسعار الحالية، ويخبر بما لم يعد متوفراً */
export function ReorderButton({ order, className = 'btn-ghost' }: { order: Order; className?: string }) {
  const navigate = useNavigate()
  const openDrawer = useCartStore((s) => s.openDrawer)
  const reorder = useMutation({
    mutationFn: async () => {
      const items = order.items.filter((i) => i.product_id)
      let added = 0
      for (const item of items) {
        try { await gazabellaApi.addToCart(item.product_id!, item.quantity || 1); added += 1 } catch { /* غير متوفر أو حُذف — نكمل بالباقي */ }
      }
      return { added, missing: order.items.length - added }
    },
    onSuccess: ({ added }) => {
      track('reorder', { added, total: order.items.length })
      if (!added) return
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      openDrawer()
    },
  })
  const linkable = order.items.some((i) => i.product_id)
  const result = reorder.data

  // طلبات قديمة بلا معرّف منتج: نوجّه للبحث عن أول منتج بدل زر لا يعمل
  if (!linkable) {
    const first = order.items[0]?.product_name
    if (!first) return null
    return <button type="button" className={className} onClick={() => navigate(`/?search=${encodeURIComponent(first)}#products`)}><Icon name="refresh" className="size-4" />{t('اطلبيها مرة أخرى')}</button>
  }

  return (
    <>
      <button type="button" className={className} disabled={reorder.isPending} onClick={() => reorder.mutate()}>
        <Icon name="refresh" className={`size-4 ${reorder.isPending ? 'animate-spin' : ''}`} />
        {reorder.isPending ? t('نضيفها للسلة…') : t('اطلبيها مرة أخرى')}
      </button>
      {result && (
        <p className={`reorder-note ${result.added ? '' : 'is-error'}`} role="status">
          {!result.added ? t('هذه المنتجات غير متوفرة حالياً.')
            : result.missing ? t('أضفنا {added} للسلة، و{missing} غير متوفر حالياً.', { added: result.added, missing: result.missing })
            : t('أضفناها للسلة بالأسعار الحالية.')}
        </p>
      )}
    </>
  )
}
