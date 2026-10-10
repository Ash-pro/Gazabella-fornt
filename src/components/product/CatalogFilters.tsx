import { t } from '../../i18n'
import { useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Dialog } from '../ui/Dialog'
import type { Category } from '../../types/api'
import { keepCatalog, priceParams } from '../../lib/catalogParams'

const PRICE_ERRORS = {
  number: 'أدخلي السعر أرقامًا فقط.',
  negative: 'السعر لا يكون أقل من صفر.',
  range: 'الحد الأدنى للسعر أكبر من الحد الأعلى.',
} as const

/**
 * لوحة التصفية: كل التعديلات مسودة حتى «تطبيق الفلاتر» — الإغلاق أو الإلغاء لا يطبّق شيئًا.
 * السعر يُدخل كنص ويُتحقق منه عند التطبيق (لا تصحيح تلقائي أثناء الكتابة)، ولا يُرسل للخادم إلا قيم صالحة.
 */
export function CatalogFilters({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState(() => new URLSearchParams(params))
  const [minText, setMinText] = useState(() => params.get('min_price') ?? '')
  const [maxText, setMaxText] = useState(() => params.get('max_price') ?? '')
  const [priceError, setPriceError] = useState<keyof typeof PRICE_ERRORS | null>(null)
  const errorId = useId()

  const minValue = Number(minText) > 0 ? Number(minText) : 0
  const maxValue = maxText.trim() !== '' && Number.isFinite(Number(maxText)) ? Number(maxText) : null
  const ceiling = Math.max(1000, maxValue ?? 0, minValue)
  const sliderMax = maxValue ?? ceiling

  function editMin(value: string) { setMinText(value); setPriceError(null) }
  function editMax(value: string) { setMaxText(value); setPriceError(null) }
  function toggle(name: string, value: string) { const next = new URLSearchParams(draft); const selected = next.getAll(name); next.delete(name); (selected.includes(value) ? [] : [value]).forEach((v) => next.append(name, v)); next.delete('page'); if (name === 'category') next.delete('sub'); setDraft(next) }
  function reset() { const next = new URLSearchParams(draft); ['category', 'sub', 'store', 'page'].forEach((key) => next.delete(key)); setDraft(next); setMinText(''); setMaxText(''); setPriceError(null) }

  const price = priceParams(minText, maxText)
  const next = new URLSearchParams(draft)
  next.delete('min_price'); next.delete('max_price'); next.delete('store'); next.delete('page')
  if (price.min_price) next.set('min_price', price.min_price)
  if (price.max_price) next.set('max_price', price.max_price)
  const applied = new URLSearchParams(params); applied.delete('page'); applied.delete('store')
  const dirty = next.toString() !== applied.toString()

  function apply() {
    if (price.error) { setPriceError(price.error); return }
    setParams(keepCatalog(next), { state: { preserveScroll: true } })
    onClose()
  }

  const selectedCategory = draft.getAll('category').length === 1 ? categories.find((c) => c.slug === draft.get('category')) : undefined
  const content = <div className="catalog-filter-content">
    <fieldset aria-describedby={priceError ? errorId : undefined}>
      <legend>{t('نطاق السعر')}</legend>
      <div className="price-range-labels"><span><span className="num">{minValue}</span> ₪</span><span>{maxValue === null ? t('بلا حد') : <><span className="num">{maxValue}</span> ₪</>}</span></div>
      <div className="dual-range">
        <input aria-label={t('أقل سعر')} type="range" min="0" max={ceiling} value={Math.min(minValue, sliderMax)} onChange={(e) => editMin(Number(e.target.value) > 0 ? String(Math.min(Number(e.target.value), sliderMax)) : '')} />
        <input aria-label={t('أعلى سعر')} type="range" min="0" max={ceiling} value={sliderMax} onChange={(e) => { const v = Math.max(Number(e.target.value), minValue); editMax(v >= ceiling && maxValue === null ? '' : String(v)) }} />
      </div>
      <div className="price-inputs">
        <label>{t('من ₪')}<input className="form-field" type="number" inputMode="decimal" min="0" placeholder="0" value={minText} aria-invalid={priceError ? true : undefined} onChange={(e) => editMin(e.target.value)} /></label>
        <label>{t('إلى ₪')}<input className="form-field" type="number" inputMode="decimal" min="0" placeholder={t('بلا حد')} value={maxText} aria-invalid={priceError ? true : undefined} onChange={(e) => editMax(e.target.value)} /></label>
      </div>
      {priceError && <p id={errorId} className="filter-error" role="alert">{t(PRICE_ERRORS[priceError])}</p>}
    </fieldset>
    <fieldset><legend>{t('الأقسام')}</legend>{categories.map((c) => <label className="filter-check" key={c.slug}><input type="radio" name="category-filter" checked={draft.getAll('category').includes(c.slug)} onChange={() => toggle('category', c.slug)} />{c.name}</label>)}{!!selectedCategory?.children.length && <label className="field-label mt-4">{t('الفئة الفرعية')}<select className="form-field" value={draft.get('sub') || ''} onChange={(e) => { const n = new URLSearchParams(draft); if (e.target.value) n.set('sub', e.target.value); else n.delete('sub'); n.delete('page'); setDraft(n) }}><option value="">{t('كل الفئات الفرعية')}</option>{selectedCategory.children.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>}</fieldset>
    <div className="filter-footer">
      <button type="button" className="btn-primary" onClick={apply}>{t('تطبيق الفلاتر')}</button>
      <button type="button" className="text-link" onClick={reset}>{t('إعادة تعيين')}</button>
      {dirty && <p className="filter-dirty" role="status">{t('لديكِ تغييرات لم تُطبّق بعد.')}</p>}
    </div>
  </div>
  return <ResponsiveFilters onClose={onClose}>{content}</ResponsiveFilters>
}

function ResponsiveFilters({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => { const query = window.matchMedia('(max-width: 767px)'); const changed = () => setMobile(query.matches); query.addEventListener('change', changed); return () => query.removeEventListener('change', changed) }, [])
  return mobile ? <Dialog title={t('تصفية اختياراتكِ')} bottom onClose={onClose}>{children}</Dialog> : <div className="filter-panel filter-panel--expanded" role="region" aria-label={t('تصفية اختياراتكِ')}>{children}</div>
}
