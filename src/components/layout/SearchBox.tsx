import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { money } from '../../lib/format'
import { Icon } from '../ui/Icon'

const key = 'gazabella_recent_searches'
function readHistory(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, 5) : [] } catch { return [] }
}
export function SearchBox() {
  const location = useLocation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState({key: location.key, value: params.get('search') || ''})
  const value = draft.key === location.key ? draft.value : params.get('search') || ''
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState(readHistory)
  const [activeIdx, setActiveIdx] = useState(-1)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => { const timer = setTimeout(() => setTerm(value.trim()), 300); return () => clearTimeout(timer) }, [value])
  useEffect(() => { setActiveIdx(-1) }, [term, open])
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  const results = useQuery({queryKey: ['search-suggestions', term], queryFn: () => gazabellaApi.getProducts({search:term, per_page:6}), enabled: open && !!term})
  function save(items: string[]) { setRecent(items); try { localStorage.setItem(key, JSON.stringify(items)) } catch { /* Browsing still works without storage. */ } }
  function remember(text: string) { if(text) save([text, ...readHistory().filter((v) => v !== text)].slice(0,5)) }
  function search(text: string) { remember(text); setOpen(false); navigate(text ? `/?search=${encodeURIComponent(text)}#products` : '/#products') }
  const items = open ? (value.trim() ? (results.data?.data || []) : recent) : []
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); return }
    if (!open || !items.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      const isRecent = !value.trim()
      if (isRecent) { search(recent[activeIdx] as string) }
      else {
        const p = results.data?.data[activeIdx]
        if (p) { remember(value.trim()); setOpen(false); navigate(`/products/${p.slug}`) }
      }
    }
  }, [open, items, activeIdx, value, recent, results.data])
  return <div className="search-box" ref={root} onKeyDown={handleKeyDown} onBlur={(e) => { if(!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
    <form role="search" className="header-search" onSubmit={(e) => { e.preventDefault(); search(value.trim()) }}><Icon name="search" className="size-5"/><input autoComplete="off" role="combobox" aria-label="ابحثي في Gazabella" aria-expanded={open} aria-autocomplete="list" aria-controls="search-listbox" aria-haspopup="listbox" placeholder="عن ماذا تبحثين اليوم؟" value={value} onFocus={() => {setRecent(readHistory());setOpen(true)}} onChange={(e) => {setDraft({key:location.key,value:e.target.value});setOpen(true)}}/><button type="submit">بحث</button></form>
    {open && <div id="search-listbox" role="listbox" className="search-dropdown" aria-label="اقتراحات البحث">
      {!value.trim() ? <><h3>عمليات البحث الأخيرة</h3>{recent.length ? recent.map((text, i) => <div className={`recent-search${activeIdx === i ? ' is-active' : ''}`} key={text} role="option" aria-selected={activeIdx === i}><button onClick={() => search(text)}>{text}</button><button aria-label={`حذف البحث ${text}`} onClick={() => save(recent.filter((v) => v !== text))}>×</button></div>) : <p>ستظهر هنا عمليات بحثكِ الأخيرة</p>}{!!recent.length && <button className="text-link" onClick={() => save([])}>مسح السجل</button>}</> : term !== value.trim() || results.isLoading ? <p role="status">نبحث عن اختياراتكِ…</p> : results.isError ? <p role="alert">تعذّر البحث. حاولي مجددًا.</p> : results.data?.data.length ? results.data.data.map((p, i) => <button className={`search-result${activeIdx === i ? ' is-active' : ''}`} key={p.id} role="option" aria-selected={activeIdx === i} onClick={() => {remember(value.trim());setOpen(false);navigate(`/products/${p.slug}`)}}><img src={p.thumbnail_url || '/brand/symbol/logo-128.webp'} alt=""/><span><b>{p.name}</b><span className="search-result__prices">{p.compare_at_price && Number(p.compare_at_price) > Number(p.min_price) && <del className="line-through text-gray-400 text-sm"><span className="num">{money(p.compare_at_price)}</span></del>}<strong><span className="num">{money(p.min_price)}</span></strong></span></span></button>) : <p className="search-empty"><Icon name="search" className="size-6"/>لا توجد نتائج</p>}
    </div>}
  </div>
}
