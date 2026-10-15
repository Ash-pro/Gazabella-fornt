import { useAuthStore } from '../stores/authStore'
import { clearCartToken } from './apiClient'
import { clearGuestUuid } from './guest'
import { clearCheckoutAttempt } from './checkoutAttempt'
import { clearViewed } from './recentlyViewed'
import { queryClient } from './queryClient'

/** مفاتيح sessionStorage تحمل بيانات شخصية (جوال · عنوان · طلب) — تُمسح عند الخروج على الأجهزة المشتركة */
const PERSONAL_SESSION_KEYS = ['gz_last_order', 'gz_tracked']

/**
 * إنهاء الجلسة محلياً — مصدر واحد لكل مسارات الخروج (القائمة · صفحة الحساب · تعطيل الحساب).
 * يُستدعى دائماً بغض النظر عن رد الخادم: فشل POST /auth/logout (شبكة أو توكن منتهي)
 * يجب ألا يُبقي المستخدمة مسجلة دخول على الجهاز.
 */
export function clearLocalSession(): void {
  useAuthStore.getState().clearSession() // main.tsx يلغي الاستعلامات ويمسح الكاش ومخزن الدفع عند تغيّر التوكن
  queryClient.clear()
  clearCartToken()
  try { clearGuestUuid() } catch { /* تخزين غير متاح */ }
  clearCheckoutAttempt()
  clearViewed()
  try { PERSONAL_SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k)) } catch { /* ignore */ }
}
