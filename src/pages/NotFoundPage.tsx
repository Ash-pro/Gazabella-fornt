import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <div className="container-page py-24 text-center"><img src="/brand/symbol/logo-512.webp" className="mx-auto size-28 rounded-full" alt="" /><p className="mt-6 font-mono text-sm text-[var(--primary)]">404</p><h1 className="mt-2 text-3xl font-extrabold">هذه الصفحة غير موجودة</h1><p className="mt-3 text-[var(--text-2)]">ربما انتقلت، أو أن الرابط غير صحيح.</p><Link className="btn-primary mt-7" to="/">العودة للرئيسية</Link></div>
}
