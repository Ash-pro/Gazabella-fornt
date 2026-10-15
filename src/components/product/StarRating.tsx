import { t } from '../../i18n'
import { useId, useState } from 'react'
import { Icon } from '../ui/Icon'

/** نجوم للعرض فقط — تدعم الكسور (4.6 ← أربع نجوم وجزء من الخامسة) */
export function Stars({ value, size = 'size-4' }: { value: number; size?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span className="stars" role="img" aria-label={t('التقييم {v} من 5', { v: value.toFixed(1) })}>
      <span className="stars__base" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" className={size} />)}</span>
      <span className="stars__fill" aria-hidden="true" style={{ width: `${pct}%` }}>{[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" className={size} />)}</span>
    </span>
  )
}

const starLabels = () => [t('سيئ'), t('مقبول'), t('جيد'), t('جيد جداً'), t('ممتاز')]

/** إدخال التقييم: مجموعة أزرار راديو (لوحة المفاتيح وقارئ الشاشة) + معاينة بالهوفر */
export function StarInput({ value, onChange, invalid }: { value: number; onChange: (v: number) => void; invalid?: boolean }) {
  const name = useId()
  const [hover, setHover] = useState(0)
  const labels = starLabels()
  const shown = hover || value
  return (
    <fieldset className={`star-input${invalid ? ' is-invalid' : ''}`}>
      <legend className="field-label">{t('تقييمكِ')} <span aria-hidden="true">*</span></legend>
      <div className="star-input__row" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= shown ? 'is-on' : ''} onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            <Icon name="star" className="size-8" />
            <span className="sr-only">{labels[n - 1]}</span>
          </label>
        ))}
      </div>
      <p className={`star-input__label${shown ? ' is-set' : ''}`} aria-hidden="true">{shown ? labels[shown - 1] : t('اضغطي على نجمة للتقييم')}</p>
    </fieldset>
  )
}
