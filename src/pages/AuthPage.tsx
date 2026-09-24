import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { gazabellaApi } from '../api/gazabella'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import type { User } from '../types/api'

type Mode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [confirmationError, setConfirmationError] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const settings = useQuery({ queryKey: ['settings'], queryFn: gazabellaApi.getSettings })
  const next = params.get('next') || '/orders'
  const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/orders'

  function onSuccess(token: string, user: User) {
    useAuthStore.getState().setSession(token, user)
    void queryClient.invalidateQueries({ queryKey: ['cart'] })
    navigate(safeNext, { replace: true })
  }
  const login = useMutation({ mutationFn: () => gazabellaApi.login(email.trim(), password), onSuccess: (result) => onSuccess(result.token, result.user) })
  const register = useMutation({ mutationFn: () => gazabellaApi.register({ name: name.trim(), email: email.trim(), password, password_confirmation: confirmation }), onSuccess: (result) => onSuccess(result.token, result.user) })
  const pending = login.isPending || register.isPending
  const serverError = mode === 'login' ? login.error : register.error
  function changeMode(value: Mode) {
    if (pending || value === mode) return
    setMode(value); setPassword(''); setConfirmation(''); setConfirmationVisible(false); setConfirmationError(''); setVisible(false); setError(''); login.reset(); register.reset()
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setError('')
    if (mode === 'register' && !name.trim()) { setError('أدخلي اسمكِ الكامل.'); return }
    if (!email.trim() || !password) { setError('أدخلي البريد الإلكتروني وكلمة المرور.'); return }
    if (mode === 'register' && password.length < 8) { setError('استخدمي كلمة مرور من 8 أحرف على الأقل.'); return }
    if (mode === 'register' && password !== confirmation) {
      setConfirmationError('كلمتا المرور غير متطابقتين. أعيدي التأكيد.');
      document.getElementById('auth-password-confirmation')?.focus();
      return
    }
    setConfirmationError('')
    if (mode === 'login') login.mutate(); else register.mutate()
  }
  return <div className="container-page auth-page">
    <Link to="/" className="auth-back"><Icon name="arrow" className="size-4" /> العودة للتسوق</Link>
    <div className="auth-layout auth-layout--refined">
      <div className="auth-form">
        <span className="eyebrow">مساحتكِ في Gazabella</span>
        <h1>{mode === 'login' ? 'أهلًا بعودتكِ.' : 'بداية جميلة، معكِ.'}</h1>
        <p>{mode === 'login' ? 'ادخلي لمتابعة طلباتكِ والوصول إلى مفضلتكِ.' : 'أنشئي حسابكِ واحتفظي باختياراتكِ في مكان واحد.'}</p>
        <div className="auth-switch" role="group" aria-label="نوع الدخول">
          {(['login', 'register'] as const).map((value) => <button key={value} type="button" aria-pressed={value === mode} disabled={pending} onClick={() => changeMode(value)}>{value === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</button>)}
        </div>
        <form onSubmit={submit} aria-label={mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'} aria-busy={pending} className="auth-fields">
          {mode === 'register' && <div><label className="field-label" htmlFor="auth-name">الاسم الكامل</label><input id="auth-name" className="form-field" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="مثال: سارة أحمد" disabled={pending} required /></div>}
          <div><label className="field-label" htmlFor="auth-email">البريد الإلكتروني</label><input id="auth-email" className="form-field" type="email" inputMode="email" dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="name@example.com" disabled={pending} required /></div>
          <div><label className="field-label" htmlFor="auth-password">كلمة المرور</label><div className="auth-password"><input id="auth-password" className="form-field" type={visible ? 'text' : 'password'} dir="ltr" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} aria-describedby={mode === 'register' ? 'password-guidance' : undefined} value={password} onChange={(event) => { setPassword(event.target.value); setError(''); setConfirmationError('') }} disabled={pending} required /><button type="button" aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-controls="auth-password" aria-pressed={visible} onClick={() => setVisible(!visible)}><Icon name="eye" className="size-4" />{visible ? 'إخفاء' : 'إظهار'}</button></div>{mode === 'register' && <p id="password-guidance" className="auth-hint">8 أحرف على الأقل. استخدمي كلمة مرور فريدة، ويمكنكِ إظهارها للتأكد منها.</p>}</div>
          {mode === 'register' && <div>
            <label className="field-label" htmlFor="auth-password-confirmation">تأكيد كلمة المرور</label>
            <div className="auth-password">
              <input id="auth-password-confirmation" className="form-field" type={confirmationVisible ? 'text' : 'password'} dir="ltr" autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setConfirmationError(''); setError('') }} aria-invalid={!!confirmationError} aria-describedby={confirmationError ? 'confirmation-error' : undefined} disabled={pending} required />
              <button type="button" aria-label={confirmationVisible ? 'إخفاء تأكيد كلمة المرور' : 'إظهار تأكيد كلمة المرور'} aria-controls="auth-password-confirmation" aria-pressed={confirmationVisible} onClick={() => setConfirmationVisible(!confirmationVisible)}><Icon name="eye" className="size-4" />{confirmationVisible ? 'إخفاء' : 'إظهار'}</button>
            </div>
            {confirmationError && <p id="confirmation-error" role="alert" className="field-error">{confirmationError}</p>}
          </div>}
          {mode === 'login' && <details className="auth-recovery"><summary>نسيتِ كلمة المرور؟</summary><p>استعادة كلمة المرور غير متاحة حاليًا.{settings.data?.email && <> يمكنكِ <a href={`mailto:${settings.data.email}`}>التواصل مع الدعم للمساعدة</a>.</>} لا تشاركي كلمة مروركِ مع أي شخص.</p></details>}
          {(error || serverError) && <p id="auth-error" role="alert" className="auth-error">{error || getApiErrorMessage(serverError)}</p>}
          <button className="btn-primary auth-submit" disabled={pending}>{pending ? 'جارٍ المتابعة…' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}<Icon name="arrow" className="size-4 rotate-180" /></button>
        </form>
        <div className="auth-shopping"><span>تفضّلين الاستكشاف أولًا؟</span><Link to="/">متابعة التسوق دون تسجيل <Icon name="arrow" className="size-4 rotate-180" /></Link></div>
      </div>
      <aside className="auth-editorial" aria-label="Gazabella">
        <img src="/images/products/perfume.webp" alt="" />
        <div><span>GAZABELLA</span><h2>اختيارات تشبهكِ.<br />وتفاصيل تحبينها.</h2><p>مساحة صغيرة لكل ما يلفت قلبكِ.</p></div>
      </aside>
    </div>
  </div>
}
