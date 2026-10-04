import { isMvp0Api } from '../lib/apiContract'
// AuthPage.tsx — full replacement
import { useState, useEffect, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LegalConsent } from '../components/checkout/LegalConsent'
import { track } from '../lib/analytics'
import { gazabellaApi } from '../api/gazabella'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import type { User } from '../types/api'
import { loadLastOrder } from '../lib/lastOrder'

type Step = 'phone' | 'otp'

const PHONE_REGEX = /^(\+?(970|972))?0?5\d{8}$/

export function AuthPage() {
  const [params] = useSearchParams()
  // قادمة من صفحة الشكر: نعرض سياق الطلب ونعبّئ رقم الجوال من الجلسة (لا نضعه في الرابط)
  const [lastOrder] = useState(() => (params.get('from') === 'order' ? loadLastOrder() : null))
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState(lastOrder?.phone ?? '')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const navigate = useNavigate()

  const next = params.get('next') || '/orders'
  const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/orders'

  // countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function onSuccess(token: string, user: User) {
    useAuthStore.getState().setSession(token, user)
    track('login', { method: 'otp' })
    void queryClient.invalidateQueries({ queryKey: ['cart'] })
    navigate(safeNext, { replace: true })
  }

  const sendOtp = useMutation({
    mutationFn: () => gazabellaApi.otpSend(phone.trim()),
    onSuccess: () => { setStep('otp'); setCountdown(60); setOtp(''); setOtpError('') },
  })

  const verifyOtp = useMutation({
    mutationFn: () => gazabellaApi.otpVerify(phone.trim(), otp.trim(), isNewUser ? name.trim() : undefined),
    onSuccess: (result) => onSuccess(result.token, result.user),
  })

  function submitPhone(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setPhoneError('')
    if (!PHONE_REGEX.test(phone.trim())) {
      setPhoneError('أدخل رقم جوال فلسطينيًا صحيحًا (مثال: 0591234567)')
      return
    }
    if (isNewUser && !name.trim()) {
      setPhoneError('أدخل اسمك الكامل')
      return
    }
    sendOtp.mutate()
  }

  function submitOtp(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setOtpError('')
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError('الكود مكوّن من 6 أرقام')
      return
    }
    verifyOtp.mutate()
  }

  const pending = sendOtp.isPending || verifyOtp.isPending

  return (
    <div className="container-page auth-page">
      <Link to="/" className="auth-back">
        <Icon name="arrow" className="size-4" /> العودة للتسوق
      </Link>
      <div className="auth-layout auth-layout--refined">
        <div className="auth-form">
          {!isMvp0Api() && <Link className="text-link mb-4" to="/orders/lookup">لديكِ مرجع دفع؟ تابعي طلبكِ هنا</Link>}
          {lastOrder ? (
            <p className="auth-context" role="status">
              <Icon name="check" className="size-5 shrink-0" />
              <span>طلبكِ <b className="num" dir="ltr">{lastOrder.order.order_number}</b> مسجّل عندنا. ادخلي بنفس رقم الجوال لمتابعة حالته — نرسل لكِ كود تحقق فقط.</span>
            </p>
          ) : safeNext.startsWith('/orders') && (
            <p className="auth-context auth-context--plain" role="status">
              <Icon name="package" className="size-5 shrink-0" />
              <span>سجّلي الدخول برقم الجوال الذي طلبتِ به لعرض طلباتكِ ومتابعتها.</span>
            </p>
          )}
          <span className="eyebrow">مساحتكِ في Gazabella</span>
          <h1>{step === 'phone' ? 'أهلًا بكِ.' : 'تحقّقي من جوالكِ'}</h1>
          <p>
            {step === 'phone'
              ? 'أدخلي رقم جوالكِ للدخول أو إنشاء حساب جديد.'
              : `أرسلنا كود مكوّن من 6 أرقام إلى ${phone}`}
          </p>

          {step === 'phone' && (
            <form onSubmit={submitPhone} className="auth-fields">
              <div className="auth-switch" role="group" aria-label="نوع الحساب">
                {([false, true] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    aria-pressed={isNewUser === val}
                    disabled={pending}
                    onClick={() => setIsNewUser(val)}
                  >
                    {val ? 'مستخدمة جديدة' : 'لديّ حساب'}
                  </button>
                ))}
              </div>

              {isNewUser && (
                <div>
                  <label className="field-label" htmlFor="auth-name">الاسم الكامل</label>
                  <input
                    id="auth-name"
                    className="form-field"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setPhoneError('') }}
                    placeholder="مثال: سارة أحمد"
                    disabled={pending}
                    required
                  />
                </div>
              )}

              <div>
                <label className="field-label" htmlFor="auth-phone">رقم الجوال</label>
                <input
                  id="auth-phone"
                  className="form-field"
                  type="tel"
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError('') }}
                  placeholder="0591234567"
                  disabled={pending}
                  required
                />
              </div>

              {(phoneError || sendOtp.error) && (
                <p role="alert" className="auth-error">
                  {phoneError || getApiErrorMessage(sendOtp.error)}
                </p>
              )}

              <button className="btn-primary auth-submit" disabled={pending}>
                {pending ? 'جارٍ الإرسال…' : 'إرسال الكود'}
                <Icon name="arrow" className="size-4 rotate-180" />
              </button>
              <LegalConsent action="بالمتابعة" />
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={submitOtp} className="auth-fields">
              <div>
                <label className="field-label" htmlFor="auth-otp">كود التحقق</label>
                <input
                  id="auth-otp"
                  className="form-field"
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                  placeholder="123456"
                  disabled={pending}
                  autoFocus
                  required
                />
              </div>

              {(otpError || verifyOtp.error || sendOtp.error) && (
                <p role="alert" className="auth-error">
                  {otpError || getApiErrorMessage(verifyOtp.error || sendOtp.error)}
                </p>
              )}

              <button className="btn-primary auth-submit" disabled={pending}>
                {pending ? 'جارٍ التحقق…' : 'تأكيد الكود'}
                <Icon name="arrow" className="size-4 rotate-180" />
              </button>

              <div className="auth-shopping">
                {countdown > 0 ? (
                  <span>إعادة الإرسال بعد {countdown} ثانية</span>
                ) : (
                  <button
                    type="button"
                    className="text-link"
                    disabled={pending}
                    onClick={() => { verifyOtp.reset(); sendOtp.mutate() }}
                  >
                    إعادة إرسال الكود
                  </button>
                )}
                <button type="button" className="text-link" disabled={pending} onClick={() => { sendOtp.reset(); verifyOtp.reset(); setStep('phone'); setOtp(''); setOtpError('') }}>
                  تغيير رقم الجوال
                </button>
              </div>
            </form>
          )}

          <div className="auth-shopping">
            <span>تفضّلين الاستكشاف أولًا؟</span>
            <Link to="/">متابعة التسوق دون تسجيل <Icon name="arrow" className="size-4 rotate-180" /></Link>
          </div>
        </div>
        <aside className="auth-editorial" aria-label="Gazabella">
          <img src="/images/products/perfume.webp" alt="" />
          <div>
            <span>GAZABELLA</span>
            <h2>اختيارات تشبهكِ.<br />وتفاصيل تحبينها.</h2>
            <p>مساحة صغيرة لكل ما يلفت قلبكِ.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
