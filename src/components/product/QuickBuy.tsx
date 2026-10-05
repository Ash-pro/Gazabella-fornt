import { t } from '../../i18n'
import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { gazabellaApi } from '../../api/gazabella'
import { isMvp0Api } from '../../lib/apiContract'
import { queryClient } from '../../lib/queryClient'
import { getApiErrorMessage } from '../../lib/apiClient'
import { money } from '../../lib/format'
import { productPricing } from '../../lib/productPricing'
import { useCartStore } from '../../stores/cartStore'
import { Dialog } from '../ui/Dialog'
import { ProductVisual } from './ProductVisual'
import { productItem, track } from '../../lib/analytics'
import type { ProductBrief } from '../../types/api'

export function QuickBuy({ product }: { product: ProductBrief }) {
  const [open, setOpen] = useState(false)
  const [variantId, setVariantId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const sending = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const variants = product.variants ?? []
  const variant = variants.find(v => v.id === variantId) ?? variants.find(v => v.available_quantity > 0)
  const limit = Math.min(10, variant?.available_quantity ?? product.stock)
  const { current: price, original, percent } = productPricing(product, variant)
  const image = product.images?.find(i => i.is_primary)?.url ?? product.images?.[0]?.url ?? null
  const add = useMutation({
    mutationFn: ({ id, count }: { id: number; count: number }) => gazabellaApi.addToCart(id, count),
    onSuccess: (cart, { count }) => {
      track('add_to_cart', { items: [productItem(product, { quantity: count, variant: variant?.name, price })], value: price * count })
      queryClient.setQueryData(['cart'], cart)
      setOpen(false)
      useCartStore.getState().showCartToast({ productName: product.name, variantName: variant?.name, thumbnailUrl: image, price })
    },
    onError: () => { void queryClient.invalidateQueries({ queryKey: ['products'] }) },
    onSettled: () => { sending.current = false },
  })
  function submit(count: number) {
    if (sending.current || !product.in_stock || count < 1 || count > limit || (isMvp0Api() && !variant)) return
    sending.current = true
    add.mutate({ id: isMvp0Api() ? variant!.id : product.id, count })
  }
  function quickBuy() {
    add.reset(); setQuantity(1)
    // Multiple variants require an explicit choice, without leaving the product grid.
    if (variants.length > 1) setOpen(true)
    else submit(1)
  }
  return <>
    <button ref={trigger} type="button" className="btn-primary quick-add" aria-label={add.isPending ? t('جارٍ إضافة {name} للسلة…', { name: product.name }) : !product.in_stock ? t('{name} غير متوفر حاليًا', { name: product.name }) : variants.length > 1 ? t('اختاري خيارات {name}', { name: product.name }) : t('أضيفي {name} للسلة', { name: product.name })} disabled={!product.in_stock || add.isPending || (isMvp0Api() && !variant)} onClick={quickBuy}>
      {add.isPending ? t('جارٍ الإضافة…') : !product.in_stock ? t('غير متوفر') : variants.length > 1 ? t('اختاري الخيارات') : t('أضيفي للسلة')}
    </button>
    {add.isError && !open && <p role="alert" className="field-error">{getApiErrorMessage(add.error)}</p>}
    {open && <Dialog title={t('اختاري الخيارات — {name}', { name: product.name })} bottom returnFocusRef={trigger} onClose={() => { if (!sending.current) setOpen(false) }}>
      <form className="quick-buy-content" onSubmit={e => { e.preventDefault(); submit(quantity) }}>
        <div className="quick-buy-preview"><ProductVisual src={image} alt={product.name} /><div><b>{product.name}</b>{original !== null && <del aria-label={t('السعر السابق')}>{money(original)}</del>}<p>{money(price)} {t('للقطعة')} {percent > 0 && <span>{t('— خصم')} {percent}%</span>}</p></div></div>
        <div>
          <p className="field-label mb-3">{t('النوع أو الحجم')}</p>
          <div className="flex flex-wrap gap-2">
            {variants.map(v => {
              const selected = (variant?.id ?? -1) === v.id
              const unavailable = v.available_quantity < 1
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={unavailable || add.isPending}
                  onClick={() => { setVariantId(v.id); setQuantity(1); add.reset() }}
                  className={[
                    'relative flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                    selected
                      ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-[var(--primary)]'
                      : unavailable
                        ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-3)] opacity-50 cursor-not-allowed line-through'
                        : 'border-[var(--border)] bg-white text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]',
                  ].join(' ')}
                >
                  <span>{v.name}</span>
                  <span className={['text-xs font-normal', selected ? 'text-[var(--primary)]' : 'text-[var(--text-2)]'].join(' ')}>{money(v.price)}</span>
                  {selected && (
                    <span className="absolute -top-1.5 -start-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--primary)] text-white text-[10px]">✓</span>
                  )}
                  {unavailable && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-xl">
                      <span className="h-px w-3/4 bg-[var(--text-3)] rotate-12 opacity-40" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
        <div className="quick-buy-quantity"><span>{t('الكمية')}</span><div className="quantity-control"><button type="button" aria-label={t('تقليل كمية الشراء السريع')} disabled={quantity <= 1 || add.isPending} onClick={() => setQuantity(q => q - 1)}>−</button><output aria-label={t('كمية الشراء السريع')}>{quantity}</output><button type="button" aria-label={t('زيادة كمية الشراء السريع')} disabled={quantity >= limit || add.isPending} onClick={() => setQuantity(q => q + 1)}>+</button></div></div>
        <div className="quick-buy-total"><span>{t('قيمة المنتجات')}</span><b>{money(price * quantity)}</b></div>
        <p className="text-sm text-[var(--text-2)]">{t('تُراجع رسوم التوصيل قبل تأكيد الطلب.')}</p>
        {add.isError && <p role="alert" className="field-error">{getApiErrorMessage(add.error)}</p>}
        <button type="submit" className="btn-primary w-full" disabled={add.isPending || quantity > limit || !variant}>{add.isPending ? t('جارٍ الإضافة…') : t('أضيفي للسلة')}</button>
      </form>
    </Dialog>}
  </>
}
