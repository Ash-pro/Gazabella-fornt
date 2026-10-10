import { plural, t } from '../../i18n'
import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { gazabellaApi } from '../../api/gazabella'
import { money } from '../../lib/format'
import { getImageUrl, getApiErrorMessage } from '../../lib/apiClient'
import { searchHref } from '../../lib/catalogParams'
import { Icon } from '../ui/Icon'

const key = 'gazabella_recent_searches'
const SUGGESTIONS = 6
const RESULT_FORMS = { one: 'نتيجة واحدة', two: 'نتيجتان', few: '{n} نتائج', many: '{n} نتيجة' }
function readHistory(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, 5) : [] } catch { return [] }
}

/**
 * البحث في الهيدر (combobox): اقتراحات من الخادم بعد توقف الكتابة 300ms، بحد أقصى 6 مع خيار «عرض كل النتائج».
 * - كل عبارة لها مفتاح استعلام خاص بها، ولا تُعرض إلا اقتراحات العبارة الحالية؛ فرد قديم يصل متأخرًا لا يحل محل الأحدث.
 * - الأسهم تتنقل بين الخيارات و Enter يختار الخيار النشط (أو يفتح نتائج العبارة)، و Escape يغلق دون مسح النص.
 */
export function SearchBox() {
  const location = useLocation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const listId = useId()
  const statusId = useId()
  const [draft, setDraft] = useState({key: location.key, value: params.get('search') || ''})
  const value = draft.key === location.key ? draft.value : params.get('search') || ''
  const trimmed = value.trim()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recent, setRecent] = useState(readHistory)
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { const timer = setTimeout(() => setTerm(trimmed), 300); return () => clearTimeout(timer) }, [trimmed])
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  const results = useQuery({queryKey: ['search-suggestions', term], queryFn: () => gazabellaApi.getProducts({search:term, per_page:SUGGESTIONS}), enabled: open && !!term, staleTime: 30_000})
  const settled = !!trimmed && term === trimmed && results.isSuccess
  const items = settled ? results.data.data : []
  const total = settled ? results.data.meta?.total ?? items.length : 0
  // الخيارات القابلة للتنقل: المنتجات ثم «عرض كل النتائج»
  const optionCount = items.length ? items.length + 1 : 0
  const listOpen = open && optionCount > 0
  const active = listOpen && activeIndex >= 0 && activeIndex < optionCount ? activeIndex : -1

  function save(list: string[]) { setRecent(list); try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* Browsing still works without storage. */ } }
  function remember(text: string) { if(text) save([text, ...readHistory().filter((v) => v !== text)].slice(0,5)) }
  function search(text: string) {
    const clean = text.trim()
    if (!clean) return // عبارة فارغة أو مسافات: لا ننتقل ولا نرسل طلبًا
    remember(clean); setOpen(false); setActiveIndex(-1); navigate(searchHref(clean))
  }
  function openProduct(slug: string) { remember(trimmed); setOpen(false); setActiveIndex(-1); navigate(`/products/${slug}`) }
  function choose(index: number) { if (index < items.length) openProduct(items[index].slug); else search(trimmed) }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) { setOpen(true); return }
      if (!optionCount) return
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((i) => (i < 0 ? (step > 0 ? 0 : optionCount - 1) : (i + step + optionCount) % optionCount))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault(); choose(active)
    } else if (e.key === 'Escape' && open) {
      e.preventDefault(); e.stopPropagation(); setOpen(false); setActiveIndex(-1)
    }
  }
  const optionId = (i: number) => `${listId}-o${i}`
  const statusText = !trimmed ? '' : term !== trimmed || results.isLoading ? t('نبحث عن اختياراتكِ…') : results.isError ? t('تعذّر البحث. حاولي مجددًا.') : total ? plural(total, RESULT_FORMS) : t('لا توجد نتائج لـ «{q}»', { q: trimmed })

  return <div className="search-box" ref={root} onKeyDown={(e) => { if (e.key === 'Escape' && open) { setOpen(false); setActiveIndex(-1); input.current?.focus() } }} onBlur={(e) => { if(!e.currentTarget.contains(e.relatedTarget)) { setOpen(false); setActiveIndex(-1) } }}>
    <form role="search" aria-label={t('البحث في منتجات المتجر')} className="header-search" onSubmit={(e) => { e.preventDefault(); search(value) }}>
      <Icon name="search" className="size-5"/>
      <input
        ref={input} type="text" enterKeyHint="search" autoComplete="off" spellCheck={false}
        role="combobox" aria-autocomplete="list" aria-expanded={listOpen} aria-controls={listOpen ? listId : undefined}
        aria-activedescendant={active >= 0 ? optionId(active) : undefined} aria-describedby={statusId}
        aria-label={t('ابحثي في Gazabella')} placeholder={t('عن ماذا تبحثين اليوم؟')} value={value}
        onFocus={() => {setRecent(readHistory());setOpen(true)}}
        onChange={(e) => {setDraft({key:location.key,value:e.target.value});setOpen(true);setActiveIndex(-1)}}
        onKeyDown={onKeyDown}
      />
      <button type="submit">{t('بحث')}</button>
    </form>
    <span id={statusId} className="sr-only" role="status" aria-live="polite">{open ? statusText : ''}</span>
    {open && <div className="search-dropdown">
      {!trimmed ? <><h3>{t('عمليات البحث الأخيرة')}</h3>{recent.length ? recent.map((text) => <div className="recent-search" key={text}><button type="button" onClick={() => search(text)}>{text}</button><button type="button" aria-label={t('حذف البحث {text}', { text: text })} onClick={() => save(recent.filter((v) => v !== text))}>×</button></div>) : <p>{t('ستظهر هنا عمليات بحثكِ الأخيرة')}</p>}{!!recent.length && <button type="button" className="text-link" onClick={() => save([])}>{t('مسح السجل')}</button>}</>
        : term !== trimmed || results.isLoading ? <p aria-hidden="true">{t('نبحث عن اختياراتكِ…')}</p>
        : results.isError ? <div className="search-error" aria-hidden="true"><p>{t('تعذّر البحث. حاولي مجددًا.')}</p><button type="button" className="text-link" onMouseDown={(e) => e.preventDefault()} onClick={() => void results.refetch()} title={getApiErrorMessage(results.error)}>{t('إعادة المحاولة')}</button></div>
        : items.length ? <ul id={listId} role="listbox" aria-label={t('اقتراحات البحث')}>
            {items.map((p, i) => <li key={p.id} id={optionId(i)} role="option" aria-selected={active === i} className={`search-result${active === i ? ' is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => openProduct(p.slug)}>
              <img src={getImageUrl(p.images?.find((im) => im.is_primary)?.url ?? p.images?.[0]?.url ?? null) || '/brand/symbol/logo-128.webp'} alt="" width="52" height="64" loading="lazy" />
              <span><b>{p.name}</b><span className="search-result__prices">{p.discount_price != null && p.discount_price < p.price && <del className="line-through text-gray-400 text-sm"><span className="num">{money(p.price)}</span></del>}<strong><span className="num">{money(p.discount_price ?? p.price)}</span></strong></span></span>
            </li>)}
            <li id={optionId(items.length)} role="option" aria-selected={active === items.length} className={`search-all${active === items.length ? ' is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => search(trimmed)}>
              <span><bdi>{total > items.length ? t('عرض كل النتائج ({n})', { n: total }) : t('عرض النتائج في صفحة')}</bdi></span><Icon name="arrow" className="size-4 rtl:rotate-180" />
            </li>
          </ul>
        : <p className="search-empty" aria-hidden="true"><Icon name="search" className="size-6"/><bdi>{t('لا توجد نتائج لـ «{q}»', { q: trimmed })}</bdi></p>}
    </div>}
  </div>
}
