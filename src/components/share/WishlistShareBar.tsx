import { t } from '../../i18n'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { createWishlistShare } from '../../api/loyalty'
import { getApiErrorMessage } from '../../lib/apiClient'
import { demoFixtures } from '../../lib/demo'
import { track } from '../../lib/analytics'
import type { ProductBrief } from '../../types/api'
import { Icon } from '../ui/Icon'
import { ShareSheet } from './ShareSheet'

/** P4-3 «شاركي قائمتكِ» — رابط قراءة فقط + لوحة المشاركة الغنية */
export function WishlistShareBar({ items }: { items: ProductBrief[] }) {
  const [open, setOpen] = useState(false)
  const share = useMutation({ mutationFn: () => createWishlistShare(items), onSuccess: () => { setOpen(true); track('wishlist_shared', { items: items.length }) } })
  if (!items.length) return demoFixtures() ? <p className="wl-share wl-share--empty"><Icon name="heart" className="size-4" /> {t('احفظي منتجات بالقلب لتشاركي قائمتكِ.')} <Link className="text-link" to="/w/demo-sample">{t('شوفي مثالاً لقائمة مشتركة')}</Link></p> : null
  return (
    <div className="wl-share">
      <div>
        <b>{t('شاركي قائمتكِ')}</b>
        <p>{t('أرسليها لصديقاتكِ أو لمن يحب يفاجئكِ بهدية — يشوفوا اختياراتكِ ويطلبوا بضغطة.')}</p>
      </div>
      <button type="button" className="btn-primary" disabled={share.isPending} onClick={() => (share.data ? setOpen(true) : share.mutate())}><Icon name="share" className="size-4" /> {share.isPending ? t('نجهّز الرابط…') : t('مشاركة')}</button>
      {share.isError && <p className="field-error" role="alert">{getApiErrorMessage(share.error)}</p>}
      {open && share.data && <ShareSheet content={{ url: share.data.data.url, title: t('قائمة مفضلاتي من Gazabella'), text: t('{n} اختيارات أحبها', { n: items.length }), image: items[0]?.images?.[0]?.url ?? null, campaign: 'wishlist' }} lines={items.map((p) => p.name)} onClose={() => setOpen(false)} />}
    </div>
  )
}
