import { t } from '../../i18n'
import { Link } from 'react-router-dom'
import { ALL_PRODUCTS } from '../../lib/routes'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import { Stars } from './StarRating'

/** نافذة شكر بعد إرسال التقييم — تأكيد واضح + ماذا يحدث بعدها + خطوة تالية */
export function ReviewThanks({ rating, productName, onClose }: { rating: number; productName: string; onClose: () => void }) {
  return (
    <Dialog title={t('تم إرسال تقييمكِ')} className="review-thanks" onClose={onClose}>
      <div className="review-thanks__body" role="status">
        <div className="review-thanks__badge" aria-hidden="true">
          <span className="review-thanks__ring" />
          <Icon name="check" className="size-9" />
          {[0, 1, 2, 3, 4, 5].map((i) => <i key={i} style={{ ['--i' as string]: i }} />)}
        </div>
        <h3>{t('شكراً لكِ على رأيكِ!')}</h3>
        <Stars value={rating} size="size-5" />
        <p>{t('تقييمكِ لـ «{name}» وصلنا، وبيظهر للزبونات بعد مراجعة سريعة من فريقنا.', { name: productName })}</p>
        <p className="review-thanks__note"><Icon name="sparkle" className="size-4" /> {t('رأيكِ الصادق بيساعد غيركِ يختار صح.')}</p>
        <div className="review-thanks__actions">
          <button type="button" className="btn-primary" onClick={onClose}>{t('تمام')}</button>
          <Link to={ALL_PRODUCTS} className="btn-ghost" onClick={onClose}>{t('متابعة التسوّق')}</Link>
        </div>
      </div>
    </Dialog>
  )
}
