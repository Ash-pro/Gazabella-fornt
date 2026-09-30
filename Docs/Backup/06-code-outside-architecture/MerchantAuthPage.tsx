import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMerchantPortalStore } from '../../stores/portalAuthStore'
import { isMockMode } from '../../api/gazabella'

// Mock credentials (بيانات تجريبية للعرض)
const MOCK_CREDENTIALS = [
  { email: 'layla@gazabella.ps', password: 'store123', name: 'ليلى الحموي', store_name: 'متجر سهرة', store_id: 1 },
  { email: 'rana@gazabella.ps',  password: 'store456', name: 'رنا أبو عيشة', store_name: 'رنا للتجميل', store_id: 2 },
]

export function MerchantAuthPage() {
  const navigate = useNavigate()
  const setSession = useMerchantPortalStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isMockMode() || true /* always show mock for now */) {
      await new Promise((r) => setTimeout(r, 600))
      const found = MOCK_CREDENTIALS.find((c) => c.email === email && c.password === password)
      if (!found) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        setLoading(false)
        return
      }
      setSession('mock-merchant-token-' + found.store_id, {
        id: found.store_id,
        name: found.name,
        store_name: found.store_name,
        store_id: found.store_id,
        email: found.email,
      })
      navigate('/merchant')
      return
    }

    // TODO: عاصم — POST /portal/merchant/login { email, password }
    // Returns: { token: string, user: { id, name, store_name, store_id, email } }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-2)] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-2xl font-black text-[var(--primary)]">Gazabella</span>
            <span className="text-xs font-medium bg-[var(--primary)] text-white rounded-full px-2 py-0.5">بائع</span>
          </div>
          <p className="text-sm text-[var(--text-2)]">بوابة المتاجر الشريكة</p>
        </div>

        {/* Demo credentials card */}
        <div className="mb-6 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-dim)] p-4">
          <p className="text-xs font-semibold text-[var(--primary)] mb-2">⚡ بيانات تجريبية للاختبار</p>
          {MOCK_CREDENTIALS.map((c) => (
            <button
              key={c.email}
              type="button"
              className="w-full text-right text-xs text-[var(--text-2)] hover:text-[var(--primary)] mb-1 transition-colors"
              onClick={() => { setEmail(c.email); setPassword(c.password) }}
            >
              <span className="font-medium">{c.store_name}</span>
              <span className="font-mono text-[var(--text-3)] mr-2 text-[10px]" dir="ltr">{c.email} / {c.password}</span>
            </button>
          ))}
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="card space-y-4">
          <h1 className="text-lg font-bold text-[var(--text)]">تسجيل الدخول</h1>

          <div className="field-group">
            <label className="field-label">البريد الإلكتروني</label>
            <input
              type="email"
              className="field-input"
              placeholder="your@email.com"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="field-group">
            <label className="field-label">كلمة المرور</label>
            <input
              type="password"
              className="field-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'جارٍ الدخول…' : 'دخول'}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--text-3)] mt-6">
          هذه البوابة للمتاجر الشريكة فقط ·{' '}
          <a href="/" className="text-link">عودة للمتجر</a>
        </p>
      </div>
    </div>
  )
}
