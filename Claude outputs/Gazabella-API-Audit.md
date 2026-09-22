# Gazabella Frontend — API Audit Report
**تاريخ التدقيق:** 22 سبتمبر 2026  
**المشروع:** Gazabella-Front (React 19 + TypeScript + Vite)  
**الـ API:** `https://stuck-palace-compatibility-counties.trycloudflare.com/api/v1/`

---

## ملخص تنفيذي

الكود الحالي مبني على API مختلف جذريًا عن الـ Real API. المشاكل تمتد لثلاثة محاور أساسية: نظام المصادقة، آلية السلة للزوار، وتدفق الـ Checkout. لا يمكن الانتقال لـ Real API دون حل المشاكل الـ Critical أولًا.

---

## 🔴 CRITICAL (4 مشاكل) — تُوقف التطبيق فورًا مع الـ Real API

---

### C-1: نظام المصادقة غلط بالكامل

**الملفات المتأثرة:**
- `src/api/gazabella.ts` → `sendOtp`, `verifyOtp`
- `src/pages/AuthPage.tsx` (أو ما يعادلها)
- `src/types/api.ts` → `User` interface

**المشكلة:**

| الكود الحالي | الـ Real API |
|---|---|
| `POST /auth/otp/send { phone }` | ❌ **غير موجود** |
| `POST /auth/otp/verify { phone, otp }` | ❌ **غير موجود** |
| — | ✅ `POST /auth/register { name, email, password, password_confirmation }` |
| — | ✅ `POST /auth/login { email, password }` |
| — | ✅ `GET /auth/me` |

**مشكلة إضافية — `User` type خاطئ:**
```typescript
// الحالي (خاطئ):
interface User {
  id: number
  name: string | null
  phone: string        // ❌ الـ Real API يستخدم email
  role: UserRole
  created_at: string
}

// الصح:
interface User {
  id: number
  name: string
  email: string        // ✅
  role: UserRole
  created_at: string
}
```

**الحل المطلوب:**
1. حذف `sendOtp` و`verifyOtp` من `gazabella.ts`
2. إضافة `register(name, email, password, password_confirmation)` و`login(email, password)` و`getMe()`
3. تصحيح `User` interface في `types/api.ts`
4. إعادة كتابة صفحة تسجيل الدخول/إنشاء الحساب من email/password بدل OTP

---

### C-2: آلية Guest Cart غلطة — `X-Cart-Token` مش مطبّق

**الملفات المتأثرة:**
- `src/api/gazabella.ts` → `initGuest`
- `src/lib/apiClient.ts`
- `src/components/layout/AppShell.tsx`

**المشكلة:**

| الكود الحالي | الـ Real API |
|---|---|
| `POST /auth/guest/init { guest_uuid }` | ❌ **غير موجود** |
| لا يوجد X-Cart-Token في أي مكان | ✅ Header `X-Cart-Token` في كل response للسلة |
| — | ✅ يُرسل مع كل request على `/cart` و`/checkout` |
| — | ✅ يُرسل مع `login`/`register` لدمج سلة الزائر |

**الـ Real API workflow:**
```
1. GET /cart
   ← Response headers: X-Cart-Token: "abc123"
   → خزّن في localStorage

2. كل request بعدها على السلة:
   → Request headers: X-Cart-Token: "abc123"

3. عند تسجيل الدخول:
   → POST /auth/login + Header: X-Cart-Token: "abc123"
   ← السلة تُدمج تلقائيًا في الحساب
```

**الحل المطلوب:**
1. حذف `initGuest` من `gazabella.ts`
2. حذف `guest-session` query من `AppShell.tsx`
3. إضافة Axios interceptor في `apiClient.ts`:
   - **Response interceptor**: يستخرج `X-Cart-Token` من headers ويخزنه
   - **Request interceptor**: يُضيف `X-Cart-Token` لكل request لو متوفر

---

### C-3: مسارات السلة والـ Body خاطئة

**الملفات المتأثرة:**
- `src/api/gazabella.ts` → `addToCart`, `updateCartItem`, `removeCartItem`

**المشكلة:**

| الكود الحالي | الـ Real API |
|---|---|
| `POST /cart { product_variant_id, quantity }` | `POST /cart/items { product_id, quantity }` |
| `PATCH /cart/{id} { quantity }` | `PATCH /cart/items/{id} { quantity }` |
| `DELETE /cart/{id}` | `DELETE /cart/items/{id}` |
| — | `DELETE /cart` ❌ **ناقص في الكود** |

**ثلاث مشاكل متداخلة:**
1. المسار `/cart` بدل `/cart/items`
2. اسم الحقل `product_variant_id` بدل `product_id`
3. ناقص `DELETE /cart` (تفريغ السلة كاملة)

---

### C-4: تدفق الـ Checkout غلط بالكامل

**الملفات المتأثرة:**
- `src/api/gazabella.ts` → `beginCheckout`, `createOrder`, `reserveCart`, `heartbeat`
- `src/pages/CheckoutPage.tsx`
- `src/stores/checkoutStore.ts`
- `src/components/ui/ReservationBanner.tsx`

**المشكلة:**

| الكود الحالي | الـ Real API |
|---|---|
| `POST /orders/checkout/begin` | ❌ **غير موجود** |
| `POST /cart/reserve` | ❌ **غير موجود** |
| `POST /cart/heartbeat` | ❌ **غير موجود** |
| `POST /orders { delivery_option_id, coupon_code, notes, address }` | `POST /checkout { name, email, phone, address, notes? }` |

**الـ Real API بسيط جدًا:**
```typescript
// one-shot checkout:
POST /checkout
{
  name: string,
  email: string,
  phone: string,
  address: string,
  notes?: string
}
// → يحوّل السلة لطلب ويفضّيها تلقائيًا
```

**المترتبات:**
- `CheckoutPage` كاملة تحتاج إعادة كتابة (بسيطة أكثر بكثير)
- `checkoutStore` معظمه لن يُستخدم (delivery_options, reservation, heartbeat, session timer)
- `ReservationBanner` مبنية على منطق غير موجود في الـ Real API

---

## 🟠 HIGH (4 مشاكل) — Features ناقصة كليًا

---

### H-1: `GET /home` — غير موجود في الكود

الـ API يجيب في ضربة وحدة: البانرات (hero/promo)، التصنيفات، المنتجات المميزة.  
الكود الحالي يعمل requests منفصلة.  
**النتيجة:** البانرات لن تظهر خالص.

```typescript
// يُضاف لـ gazabella.ts:
getHome: () =>
  isMockMode()
    ? mockServices.getHome()
    : apiClient.get('/home').then((res) => res.data.data),
```

---

### H-2: Wishlist — غير موجود خالص

```typescript
// ناقص في gazabella.ts:
getWishlist: () => apiClient.get('/wishlist').then((res) => res.data.data),
toggleWishlist: (productSlug: string) =>
  apiClient.post(`/wishlist/${productSlug}`).then((res) => res.data),
```

وناقص في `ProductBrief` type:
```typescript
interface ProductBrief {
  // ... الحقول الموجودة
  is_wishlisted: boolean  // ❌ ناقص
}
```

---

### H-3: `GET /auth/me` — غير موجود

بعد الـ login ما في طريقة تجيب بيانات المستخدم الحالي.

```typescript
// يُضاف لـ gazabella.ts:
getMe: () => apiClient.get<ApiData<User>>('/auth/me').then((res) => res.data.data),
```

---

### H-4: Brands — غير موجود خالص

لا `GET /brands` ولا `GET /brands/{slug}` ولا `brand_id` في `ProductFilters`.

```typescript
// يُضاف لـ types/api.ts:
interface Brand {
  id: number
  name: string
  slug: string
  logo_url: string | null
}

// يُضاف لـ ProductFilters:
brand_id?: number
category_id?: number   // الـ API يقبل ID واحد وليس array

// يُضاف لـ gazabella.ts:
getBrands: () => apiClient.get<ApiData<Brand[]>>('/brands').then((res) => res.data.data),
getBrand: (slug: string) => apiClient.get<ApiData<Brand>>(`/brands/${slug}`).then((res) => res.data.data),
```

---

## 🟡 MEDIUM (3 مشاكل) — Type Mismatches

---

### M-1: `ProductFilters` — params غلط

```typescript
// الحالي:
interface ProductFilters {
  category_slugs?: string[]   // ❌ Real API يقبل category_id واحد
  stores?: string[]           // ❌ غير موجود في Real API
  // ...
}

// الصح:
interface ProductFilters {
  category_id?: number        // ✅
  brand_id?: number           // ✅
  search?: string
  min_price?: number
  max_price?: number
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular'
  page?: number
}
```

---

### M-2: `CartItem` — حقل `available_quantity` غير مضمون

الحقل موجود في الموك ومستخدم لحساب max quantity في السلة والـ drawer.  
إذا الـ Real API ما بيرجعه، الـ fallback `?? 10` هو الوحيد اللي حمانا.  
**التوصية:** تأكيد مع الـ Backend إن الحقل موجود في response السلة.

---

### M-3: `initPayment` — غير موثق في الـ API

```typescript
initPayment: (order_id: number) => // POST /payments/init
```
مش موجود في التوثيق المُقدم. إذا Jawwal Pay مش في MVP0 يُحذف من الكود.

---

## خلاصة الأولوية

```
المرحلة 1 — قبل أي اختبار حقيقي:
  [C-1] إعادة كتابة Auth → email/password
  [C-2] X-Cart-Token interceptor + حذف initGuest
  [C-3] تصحيح مسارات السلة + product_id
  [C-4] تبسيط Checkout → POST /checkout

المرحلة 2 — Features:
  [H-1] إضافة getHome()
  [H-2] إضافة Wishlist endpoints
  [H-3] إضافة getMe()
  [H-4] إضافة Brands

المرحلة 3 — Cleanup:
  [M-1] تصحيح ProductFilters
  [M-2] تأكيد available_quantity مع Backend
  [M-3] حذف initPayment لو Jawwal Pay خارج MVP0
```

---

*تم التدقيق بمقارنة `src/api/gazabella.ts` + `src/types/api.ts` مع توثيق الـ API المقدم.*
