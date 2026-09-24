import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Dialog } from '../ui/Dialog'
import type { Category } from '../../types/api'

export function CatalogFilters({categories, onClose}: {categories: Category[]; onClose: () => void}) {
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState(() => new URLSearchParams(params))
  // Re-sync draft if URL params change from an external source (e.g. category chip)

  const ceiling = Math.max(1000, Number(draft.get('max_price')) || 0, Number(draft.get('min_price')) || 0)
  const min = Number(draft.get('min_price')) || 0
  const max = draft.has('max_price') ? Number(draft.get('max_price')) : ceiling
  function set(name: string, value: string) { const next = new URLSearchParams(draft); next.set(name,value); next.delete('page'); setDraft(next) }
  function toggle(name: string, value: string) { const next = new URLSearchParams(draft); const selected = next.getAll(name); next.delete(name); (selected.includes(value) ? [] : [value]).forEach((v) => next.append(name,v)); next.delete('page'); if(name === 'category') next.delete('sub'); setDraft(next) }
  function reset() { const next = new URLSearchParams(draft); ['category','sub','store','min_price','max_price','page'].forEach((key) => next.delete(key)); setDraft(next) }
  const selectedCategory = draft.getAll('category').length === 1 ? categories.find((c) => c.slug === draft.get('category')) : undefined
  const content = <div className="catalog-filter-content"><fieldset><legend>نطاق السعر</legend><div className="price-range-labels"><span><span className="num">{min}</span> ₪</span><span><span className="num">{max}</span> ₪</span></div><div className="dual-range"><input aria-label="أقل سعر" type="range" min="0" max={ceiling} value={min} onChange={(e) => set('min_price',String(Math.min(Number(e.target.value),max)))} /><input aria-label="أعلى سعر" type="range" min="0" max={ceiling} value={max} onChange={(e) => set('max_price',String(Math.max(Number(e.target.value),min)))} /></div><div className="price-inputs"><label>من ₪<input className="form-field" type="number" min="0" max={max} value={min} onChange={(e) => set('min_price',String(Math.max(0,Math.min(Number(e.target.value),max))))}/></label><label>إلى ₪<input className="form-field" type="number" min={min} max={ceiling} value={max} onChange={(e) => set('max_price',String(Math.max(min,Number(e.target.value))))}/></label></div></fieldset><fieldset><legend>الأقسام</legend>{categories.map((c) => <label className="filter-check" key={c.slug}><input type="radio" name="category-filter" checked={draft.getAll('category').includes(c.slug)} onChange={() => toggle('category',c.slug)}/>{c.name}</label>)}{!!selectedCategory?.children.length && <label className="field-label mt-4">الفئة الفرعية<select className="form-field" value={draft.get('sub') || ''} onChange={(e) => { const next = new URLSearchParams(draft); if(e.target.value) next.set('sub',e.target.value); else next.delete('sub'); next.delete('page'); setDraft(next) }}><option value="">كل الفئات الفرعية</option>{selectedCategory.children.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>}</fieldset><div className="filter-footer"><button className="btn-primary" onClick={() => { const next = new URLSearchParams(draft); next.delete('store'); setParams(next,{state:{preserveScroll:true}});onClose()}}>تطبيق الفلاتر</button><button className="text-link" onClick={reset}>إعادة تعيين</button></div></div>
  return <ResponsiveFilters onClose={onClose}>{content}</ResponsiveFilters>
}

function ResponsiveFilters({children,onClose}: {children: React.ReactNode;onClose:()=>void}) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {const query = window.matchMedia('(max-width: 767px)'); const changed = () => setMobile(query.matches); query.addEventListener('change',changed); return () => query.removeEventListener('change',changed)}, [])
  return mobile ? <Dialog title="تصفية اختياراتكِ" bottom onClose={onClose}>{children}</Dialog> : <div className="filter-panel filter-panel--expanded">{children}</div>
}
