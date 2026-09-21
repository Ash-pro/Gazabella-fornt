import { Icon } from './Icon'

export function PageLoader({ label = 'نرتّب لكِ أجمل الاختيارات…' }: { label?: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4" role="status">
      <span className="loader-ring" />
      <p className="text-sm text-[var(--text-2)]">{label}</p>
    </div>
  )
}

export function ErrorState({
  title = 'لم نتمكن من تحميل المحتوى',
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="mx-auto my-10 max-w-lg rounded-[var(--r-xl)] border border-[var(--border)] bg-white p-8 text-center shadow-sm">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[var(--primary-dim)] text-[var(--primary)]">
        <Icon name="sparkle" className="size-6" />
      </span>
      <h2 className="mb-2 text-xl font-bold text-[var(--text)]">{title}</h2>
      <p className="mb-5 text-sm leading-7 text-[var(--text-2)]">{message}</p>
      {onRetry && (
        <button className="btn-primary" type="button" onClick={onRetry}>إعادة المحاولة</button>
      )}
    </div>
  )
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="py-16 text-center">
      <img className="mx-auto mb-5 size-24 rounded-full opacity-80" src="/brand/symbol/logo-512.webp" alt="" />
      <h2 className="text-2xl font-bold text-[var(--text)]">{title}</h2>
      <p className="mt-2 text-[var(--text-2)]">{message}</p>
    </div>
  )
}
