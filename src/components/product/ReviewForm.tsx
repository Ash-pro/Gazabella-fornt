import { t } from '../../i18n'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createReview } from '../../api/productExtras'
import { apiErrorCode } from '../../lib/checkoutAttempt'
import { getApiErrorMessage, getImageUrl } from '../../lib/apiClient'
import { compressImage } from '../../lib/imageCompress'
import { track } from '../../lib/analytics'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import { StarInput } from './StarRating'

const MAX_PHOTOS = 3
const MAX_MB = 10
const MIN_BODY = 10
const MAX_BODY = 1000

/** P1-1 نموذج المراجعة — للمشترية بعد التسليم فقط (الخادم يتحقق) وتظهر بعد موافقة الإدارة */
export function ReviewForm({ slug, productName, productImage, variantId, onClose, onDone }: { slug: string; productName: string; productImage?: string | null; variantId?: number; onClose: () => void; onDone: (rating: number) => void }) {
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<Array<{ blob: Blob; url: string }>>([])
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)
  const thumb = getImageUrl(productImage) ?? '/brand/symbol/logo-128.webp'

  const send = useMutation({
    mutationFn: () => createReview(slug, { rating, title: title.trim() || undefined, body: body.trim(), photos: photos.map((p) => p.blob), variant_id: variantId }),
    onSuccess: () => { track('review_submitted', { rating, photos: photos.length }); onDone(rating) },
    onError: (e) => {
      const code = apiErrorCode(e)
      setError(code === 'NOT_PURCHASED' ? t('يمكنكِ تقييم المنتج بعد استلامه من طلب سابق.')
        : code === 'ALREADY_REVIEWED' ? t('قيّمتِ هذا المنتج من قبل — شكراً لكِ!')
        : getApiErrorMessage(e))
    },
  })

  async function addPhotos(files: FileList | null) {
    if (!files) return
    setError('')
    const room = MAX_PHOTOS - photos.length
    const picked = [...files].slice(0, room)
    if (files.length > room) setError(t('الحد الأقصى {n} صور.', { n: MAX_PHOTOS }))
    const next: Array<{ blob: Blob; url: string }> = []
    for (const f of picked) {
      if (!f.type.startsWith('image/')) { setError(t('الملف المختار ليس صورة.')); continue }
      if (f.size > MAX_MB * 1024 * 1024) { setError(t('حجم الصورة أكبر من {n} ميغابايت.', { n: MAX_MB })); continue }
      const blob = await compressImage(f).catch(() => f)
      next.push({ blob, url: URL.createObjectURL(blob) })
    }
    setPhotos((p) => [...p, ...next])
  }

  function removePhoto(i: number) {
    setPhotos((p) => { URL.revokeObjectURL(p[i].url); return p.filter((_, j) => j !== i) })
  }

  const bodyLen = body.trim().length
  const bodyShort = touched && bodyLen < MIN_BODY
  const valid = rating > 0 && bodyLen >= MIN_BODY && bodyLen <= MAX_BODY

  return (
    <Dialog title={t('اكتبي تقييمكِ')} className="review-dialog" onClose={() => { photos.forEach((p) => URL.revokeObjectURL(p.url)); onClose() }} sheet>
      <form className="review-form" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (valid && !send.isPending) send.mutate() }}>
        <div className="review-form__scroll">
          <div className="review-form__product">
            <img src={thumb} alt="" width="56" height="56" />
            <div>
              <small>{t('تقييمكِ لـ')}</small>
              <b>{productName}</b>
            </div>
          </div>

          <div className="review-form__stars">
            <StarInput value={rating} onChange={setRating} invalid={touched && !rating} />
            {touched && !rating && <p className="field-error" role="alert">{t('اختاري عدد النجوم.')}</p>}
          </div>

          <label className="review-form__field">
            <span className="field-label">{t('عنوان قصير (اختياري)')}</span>
            <input className="form-field" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('مثال: أفضل سيروم جربته')} />
          </label>

          <label className="review-form__field">
            <span className="field-label">{t('رأيكِ في المنتج')} <span aria-hidden="true">*</span></span>
            <span className={`review-form__textarea${bodyShort ? ' is-error' : ''}`}>
              <textarea rows={5} maxLength={MAX_BODY} value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={bodyShort} aria-describedby="review-body-count" placeholder={t('كيف كانت النتيجة؟ هل يناسب نوع بشرتكِ؟')} />
              <span id="review-body-count" className="review-form__count">
                <span>{bodyShort ? t('اكتبي 10 أحرف على الأقل.') : bodyLen < MIN_BODY ? t('10 أحرف على الأقل') : <><Icon name="check" className="size-3.5" /> {t('ممتاز، كمّلي')}</>}</span>
                <span className="num" dir="ltr">{bodyLen} / {MAX_BODY}</span>
              </span>
            </span>
          </label>

          <div className="review-form__field">
            <span className="field-label">{t('أضيفي صوراً (اختياري)')}</span>
            <div className="review-form__photos">
              {photos.map((p, i) => (
                <span key={p.url} className="review-form__thumb">
                  <img src={p.url} alt="" />
                  <button type="button" onClick={() => removePhoto(i)} aria-label={t('حذف الصورة {n}', { n: i + 1 })}><Icon name="close" className="size-4" /></button>
                </span>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="review-form__add">
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
                  <Icon name="camera" className="size-6" />
                  <span>{t('أضيفي صورة')}</span>
                  <small className="num" dir="ltr">{photos.length}/{MAX_PHOTOS}</small>
                </label>
              )}
            </div>
            <p className="review-form__hint"><Icon name="shield" className="size-3.5" /> {t('حتى {n} صور. لا تظهر وجوه أو بيانات شخصية في الصور.', { n: MAX_PHOTOS })}</p>
          </div>

          {error && <p className="field-error" role="alert">{error}</p>}
        </div>

        <div className="review-form__footer">
          <button type="submit" className="btn-primary w-full" disabled={send.isPending} aria-busy={send.isPending}>
            <Icon name={send.isPending ? 'refresh' : 'star'} className={`size-4${send.isPending ? ' animate-spin' : ''}`} />
            {send.isPending ? t('جارٍ الإرسال…') : t('إرسال التقييم')}
          </button>
          <p className="review-form__hint">{t('تُنشر التقييمات بعد مراجعة سريعة من فريقنا.')}</p>
        </div>
      </form>
    </Dialog>
  )
}
