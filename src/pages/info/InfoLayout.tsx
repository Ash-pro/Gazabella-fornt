import { t } from '../../i18n'
import { formatDate } from '../../lib/format'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { INFO_NAV, policiesApproved } from '../../content/storeInfo'
import { useStoreInfo } from '../../hooks/useStoreInfo'

const formatUpdated = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : formatDate(d) }

export function InfoLayout({ title, lead, children, showUpdated = true }: { title: string; lead?: string; children: ReactNode; showUpdated?: boolean }) {
  const { policiesUpdatedAt } = useStoreInfo()
  return (
    <div className="container-page info-page">
      <nav aria-label={t('مسار الصفحة')} className="info-breadcrumb"><Link to="/">{t('الرئيسية')}</Link><span aria-hidden="true">/</span><span>{title}</span></nav>
      <div className="info-grid">
        <aside className="info-nav" aria-label={t('صفحات المساعدة والسياسات')}>
          <p className="eyebrow">{t('المساعدة والسياسات')}</p>
          <ul>{INFO_NAV.map((item) => <li key={item.to}><NavLink to={item.to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>{t(item.label)}</NavLink></li>)}</ul>
        </aside>
        <article className="info-article">
          <header className="info-header">
            <h1 className="section-title">{title}</h1>
            {lead && <p className="info-lead">{lead}</p>}
            <div className="info-meta">
              {showUpdated && <span>{t('آخر تحديث:')} <time dateTime={policiesUpdatedAt}>{formatUpdated(policiesUpdatedAt)}</time></span>}
              {!policiesApproved() && <span className="info-draft">{t('نسخة أولية — قيد الاعتماد')}</span>}
            </div>
          </header>
          <div className="info-body">{children}</div>
        </article>
      </div>
    </div>
  )
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return <section id={id} className="info-section"><h2>{title}</h2>{children}</section>
}
