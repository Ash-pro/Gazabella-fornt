import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { INFO_NAV, policiesApproved, STORE_INFO } from '../../content/storeInfo'

const updatedLabel = new Intl.DateTimeFormat('ar-PS-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(STORE_INFO.policiesUpdatedAt))

export function InfoLayout({ title, lead, children, showUpdated = true }: { title: string; lead?: string; children: ReactNode; showUpdated?: boolean }) {
  return (
    <div className="container-page info-page">
      <nav aria-label="مسار الصفحة" className="info-breadcrumb"><Link to="/">الرئيسية</Link><span aria-hidden="true">/</span><span>{title}</span></nav>
      <div className="info-grid">
        <aside className="info-nav" aria-label="صفحات المساعدة والسياسات">
          <p className="eyebrow">المساعدة والسياسات</p>
          <ul>{INFO_NAV.map((item) => <li key={item.to}><NavLink to={item.to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>{item.label}</NavLink></li>)}</ul>
        </aside>
        <article className="info-article">
          <header className="info-header">
            <h1 className="section-title">{title}</h1>
            {lead && <p className="info-lead">{lead}</p>}
            <div className="info-meta">
              {showUpdated && <span>آخر تحديث: <time dateTime={STORE_INFO.policiesUpdatedAt}>{updatedLabel}</time></span>}
              {!policiesApproved() && <span className="info-draft">نسخة أولية — قيد الاعتماد</span>}
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
