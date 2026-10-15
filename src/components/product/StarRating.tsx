import { t } from '../../i18n'
import { useId } from 'react'
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

/** إدخال التقييم: مجموعة أزرار راديو (لوحة المفاتيح وقارئ الشاشة) */
export function StarInput({ value, onChange, invalid }: { value: number; onChange: (v: number) => void; invalid?: boolean }) {
  const name = useId()
  const labels = [t('سيئ'), t('مقبول'), t('جيد'), t('جيد جداً'), t('ممتاز')]
  return (
    <fieldset className={`star-input${invalid ? ' is-invalid' : ''}`}>
      <legend className="field-label">{t('تقييمكِ')} <span aria-hidden="true">*</span></legend>
      <div className="star-input__row">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= value ? 'is-on' : ''}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            <Icon name="star" className="size-8" />
            <span className="sr-only">{labels[n - 1]}</span>
          </label>
        ))}
        {value > 0 && <span className="star-input__label">{labels[value - 1]}</span>}
      </div>
    </fieldset>
  )
}

