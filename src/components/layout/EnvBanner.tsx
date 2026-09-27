/**
 * P1-FE-01 — شريط البيئة (Staging). يظهر فقط عند ضبط VITE_ENV_LABEL،
 * ولا يظهر في وضع Mock (له شريطه الخاص) ولا في الإنتاج (المتغير فارغ).
 */
export function EnvBanner() {
  const label = (import.meta.env.VITE_ENV_LABEL as string | undefined)?.trim()
  if (!label || import.meta.env.VITE_DATA_SOURCE === 'mock') return null
  return (
    <div className="env-banner" role="status">
      <span className="env-banner__dot" aria-hidden="true" />
      {label}
    </div>
  )
}
