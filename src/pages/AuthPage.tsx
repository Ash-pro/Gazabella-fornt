import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { gazabellaApi, isMockMode } from '../api/gazabella'
import { Icon } from '../components/ui/Icon'
import { getApiErrorMessage } from '../lib/apiClient'
import { normalizePhone } from '../lib/format'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
export function AuthPage() {
  const [step,setStep]=useState<'phone'|'otp'>('phone')
  const [phone,setPhone]=useState('')
  const [otp,setOtp]=useState('')
  const [error,setError]=useState('')
  const [resendAt,setResendAt]=useState(0)
  const [remaining,setRemaining]=useState(0)
  const [params]=useSearchParams()
  const navigate=useNavigate()
  const next=params.get('next') || '/orders'
  const safeNext=next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/orders'
  useEffect(()=>{ const tick=()=>setRemaining(Math.max(0,Math.ceil((resendAt-Date.now())/1000))); tick();const id=setInterval(tick,1000);return()=>clearInterval(id) },[resendAt])
  const send=useMutation({mutationFn:gazabellaApi.sendOtp,onSuccess:()=>{setStep('otp');setResendAt(Date.now()+60_000);setOtp('');setError('')}})
  const verify=useMutation({mutationFn:()=>gazabellaApi.verifyOtp(normalizePhone(phone),otp),onSuccess:(response)=>{
    queryClient.removeQueries({queryKey:['orders']});queryClient.removeQueries({queryKey:['order']})
    useAuthStore.getState().setSession(response.token,response.user)
    void queryClient.invalidateQueries({queryKey:['cart']})
    navigate(safeNext,{replace:true})
  }})
  function submit(e:React.FormEvent){e.preventDefault();setError('');if(step==='phone'){const normalized=normalizePhone(phone);if(!/^\+970[0-9]{9}$/.test(normalized)){setError('أدخلي رقمًا صحيحًا مثل 0591234567');return}setPhone(normalized);send.mutate(normalized)}else{if(!/^\d{6}$/.test(otp)){setError('أدخلي الرمز المكوّن من 6 أرقام');return}verify.mutate()}}
  return <div className="container-page py-10 sm:py-16"><div className="auth-layout"><div className="auth-editorial"><img src="/images/products/perfume.webp" alt="تشكيلة عطور Gazabella" /><div><span>GAZABELLA</span><h2>أهلًا بعودتكِ<br />إلى ما تحبين.</h2></div></div><div className="auth-form"><span className="eyebrow">تجربة واحدة، أقرب إليكِ</span><h1>{step==='phone'?'أهلًا بكِ':'رمز صغير، وخطوة أخيرة'}</h1><p>{step==='phone'?'أدخلي رقم جوالكِ لتسجيل الدخول ومتابعة طلباتكِ.':`أرسلنا رمز التحقق إلى ${phone}`}</p><form onSubmit={submit} className="space-y-5 mt-8"><label className="field-label" htmlFor="auth-input">{step==='phone'?'رقم الجوال':'رمز التحقق'}</label><input key={step} id="auth-input" className={step==='phone'?'form-field text-left':'otp-field'} dir="ltr" inputMode={step==='phone'?'tel':'numeric'} autoComplete={step==='phone'?'tel':'one-time-code'} value={step==='phone'?phone:otp} maxLength={step==='phone'?20:6} onChange={(e)=>step==='phone'?setPhone(e.target.value):setOtp(e.target.value.replace(/[٠-٩]/g,n=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(n))).replace(/\D/g,''))} placeholder={step==='phone'?'0591234567':'••••••'} aria-invalid={!!error} aria-describedby="auth-error" autoFocus />
      {isMockMode() && <div className="demo-note"><Icon name="shield" className="size-4" /><span>{step==='phone'?'عرض تجريبي: لا يتم إرسال رسائل SMS حقيقية.':'للعرض التجريبي، استخدمي الرمز 123456.'}</span></div>}
      <p id="auth-error" role="alert" className="field-error">{error || (send.isError?getApiErrorMessage(send.error):verify.isError?getApiErrorMessage(verify.error):'')}</p><button disabled={send.isPending||verify.isPending} className="btn-primary w-full">{send.isPending||verify.isPending?'لحظة من فضلكِ…':step==='phone'?'إرسال رمز التحقق':'تأكيد ومتابعة'}<Icon name="arrow" className="size-4 rotate-180" /></button>
      {step==='otp' && <div className="flex justify-between gap-3 text-xs"><button type="button" className="py-3 underline" onClick={()=>{setStep('phone');setError('');verify.reset()}}>تغيير الرقم</button><button type="button" className="py-3 text-[var(--primary)]" disabled={remaining>0||send.isPending} onClick={()=>send.mutate(normalizePhone(phone))}>{remaining>0?`إعادة الإرسال بعد ${remaining}ث`:'إعادة إرسال الرمز'}</button></div>}
      </form></div></div></div>
}
