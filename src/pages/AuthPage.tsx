import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { gazabellaApi } from '../api/gazabella'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'

type Mode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = params.get('next') || '/orders'
  const safeNext =
    next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/orders'

  function onSuccess(token: string, user: Parameters<typeof useAuthStore.getState>['0'] extends { setSession: (t: string, u: infer U) => void } ? U : never) {
    queryClient.removeQueries({ queryKey: ['orders'] })
    queryClient.removeQueries({ queryKey: ['order'] })
    useAuthStore.getState().setSession(token, user)
    void queryClient.invalidateQueries({ queryKey: ['cart'] })
    navigate(safeNext, { replace: true })
  }

  const loginMutation = useMutation({
    mutationFn: () => gazabellaApi.login(email.trim(), password),
    onSuccess: (r) => onSuccess(r.token, r.user),
    onError: () => setError(''),
  })

  const registerMutation = useMutation({
    mutationFn: () =>
      gazabellaApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirm,
      }),
    onSuccess: (r) => onSuccess(r.token, r.user),
    onError: () => setError(''),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('البريد الإلكتروني وكلمة المرور مطلوبان'); return }
    if (mode === 'register') {
      if (!name.trim()) { setError('الاسم مطلوب'); return }
      if (password.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return }
      if (password !== confirm) { setError('كلمتا المرور غير متطابقتين'); return }
      registerMutation.mutate()
    } else {
      loginMutation.mutate()
    }
  }

  const isPending = loginMutation.isPending || registerMutation.isPending
  const mutationError = loginMutation.isError
    ? getApiErrorMessage(loginMutation.error)
    : registerMutation.isError
      ? getApiErrorMessage(registerMutation.error)
      : ''

  return (
    <div className="container-page py-10 sm:py-16">
      <div className="auth-layout">
        <div className="auth-editorial">
          <img src="/images/products/perfume.webp" alt="تشكيلة عطور Gazabella" />
          <div>
            <span>GAZABELLA</span>
            <h2>أهلًا بكِ<br />إلى ما تحبين.</h2>
          </div>
        </div>

        <div className="auth-form">
          <span className="eyebrow">تجربة واحدة، أقرب إليكِ</span>

          {/* تبويب تسجيل الدخول / إنشاء حساب */}
          <div className="flex gap-1 mt-4 mb-6 border-b border-[var(--border)]">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                  mode === m
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--text-2)] hover:text-[var(--text-1)]'
                }`}
                onClick={() => { setMode(m); setError(''); loginMutation.reset(); registerMutation.reset() }}
              >
                {m === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
              </button>
            ))}
          </div>

          <h1>{mode === 'login' ? 'مرحبًا بعودتكِ' : 'انضمي إلى Gazabella'}</h1>

          <form onSubmit={submit} className="space-y-4 mt-6">
            {mode === 'register' && (
              <label className="field-label">
                الاسم الكامل
                <input
                  className="form-field mt-2"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: سارة أحمد"
                  required
                />
              </label>
            )}

            <label className="field-label">
              البريد الإلكتروني
              <input
                className="form-field mt-2"
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                required
              />
            </label>

            <label className="field-label">
              كلمة المرور
              <input
                className="form-field mt-2"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            {mode === 'register' && (
              <label className="field-label">
                تأكيد كلمة المرور
                <input
                  className="form-field mt-2"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>
            )}

            <p id="auth-error" role="alert" className="field-error">
              {error || mutationError}
            </p>

            <button disabled={isPending} className="btn-primary w-full">
              {isPending
                ? 'لحظة من فضلكِ…'
                : mode === 'login'
                  ? 'تسجيل الدخول'
                  : 'إنشاء الحساب'}
              <Icon name="arrow" className="size-4 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
