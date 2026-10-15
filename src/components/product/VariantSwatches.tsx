import { t } from '../../i18n'
import type { ProductVariant } from '../../types/api'

/** P1-2 المتغيرات كأزرار: دائرة لون إن وُجد swatch_hex، وإلا زر بالاسم (حجم/نوع). المتغير النافد يبقى ظاهراً ومشطوباً */
export function VariantSwatches({ variants, value, onChange }: { variants: ProductVariant[]; value?: number; onChange: (id: number) => void }) {
  const current = variants.find((v) => v.id === value)
  const colors = variants.every((v) => /^#[0-9a-f]{6}$/i.test(v.swatch_hex ?? ''))
  return (
    <fieldset className="swatches">
      <legend className="field-label">{colors ? t('الدرجة') : t('اختاري النوع')}: <b>{current?.name}</b></legend>
      <div className={`swatches__row${colors ? ' swatches__row--color' : ''}`} role="radiogroup">
        {variants.map((v) => {
          const out = v.available_quantity <= 0
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === value}
              aria-label={out ? t('{name} — غير متوفر', { name: v.name }) : v.name}
              title={v.name}
              className={`swatch${colors ? ' swatch--color' : ''}${out ? ' is-out' : ''}`}
              style={colors ? { background: v.swatch_hex! } : undefined}
              onClick={() => onChange(v.id)}
            >
              {!colors && v.name}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
