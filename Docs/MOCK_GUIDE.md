# Gazabella — Mock Server Guide
## للمطور: كودكس (Frontend)

---

## العناوين الثابتة (لا تتغير)

| الخدمة | العنوان | الملاحظة |
|--------|---------|----------|
| Laravel API | `http://127.0.0.1:8000/api/v1` | `php artisan serve --host=127.0.0.1 --port=8000` |
| Vite (React) | `http://127.0.0.1:5173` | `npm run dev` |
| Reverb (WebSocket) | `ws://127.0.0.1:8080` | `php artisan reverb:start --port=8080` |
| Health Check | `http://127.0.0.1:8000/api/v1/health` | GET — بدون auth |
| OpenAPI YAML | `http://127.0.0.1:8000/openapi.yaml` | رابط ثابت للـ spec |
| OpenAPI (API) | `http://127.0.0.1:8000/api/v1/openapi` | نفس الملف عبر API |

---

## إعدادات Vite (.env في مجلد Frontend)

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_REVERB_HOST=127.0.0.1
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
VITE_REVERB_APP_KEY=gazabella-key
```

> ⚠️ استخدم `127.0.0.1` دائماً — وليس `localhost` — لتفادي مشاكل cookies وCORS

---

## Headers المطلوبة في كل طلب

```http
Content-Type: application/json
Accept: application/json
X-Guest-UUID: <uuid>              # للزوار — أنشئه بـ crypto.randomUUID()
Authorization: Bearer <token>     # للمسجلين — بعد otpVerify
```

---

## بيانات Mock

| البيان | القيمة |
|-------|--------|
| OTP (أي هاتف) | **123456** |
| رقم الهاتف | أي رقم بصيغة `+970XXXXXXXXX` |
| slug المنتج #1 | `nivea-face-cream-001` |
| slug المنتج #2 | `rose-perfume-50ml-002` |
| رقم طلب mock | `GAZ-2026-0014` |
| Reverb App Key | `gazabella-key` |

---

## قائمة الـ Endpoints الجاهزة

| Method | Endpoint | Auth | ملاحظة |
|--------|----------|------|--------|
| GET | `/health` | ❌ | أول اختبار بعد تشغيل السيرفر |
| GET | `/openapi` | ❌ | spec YAML |
| POST | `/auth/guest/init` | ❌ | أول استدعاء — أرسل UUID |
| POST | `/auth/otp/send` | ❌ | OTP = 123456 |
| POST | `/auth/otp/verify` | ❌ | يعيد Bearer token |
| POST | `/auth/logout` | Bearer | - |
| GET | `/categories` | ❌ | 3 تصنيفات + 6 فروع |
| GET | `/products` | ❌ | 5 منتجات |
| GET | `/products/{slug}` | ❌ | منتجان مفصّلان |
| GET | `/cart` | اختياري | سلة بعنصرين |
| POST | `/cart` | اختياري | إضافة |
| PATCH | `/cart/{id}` | اختياري | تحديث كمية |
| DELETE | `/cart/{id}` | اختياري | حذف |
| POST | `/cart/reserve` | اختياري | حجز 15 دقيقة |
| POST | `/cart/heartbeat` | اختياري | READ-ONLY — لا يمدد |
| POST | `/orders/checkout/begin` | Bearer | تمديد الحجز مرة واحدة |
| POST | `/orders` | Bearer | إنشاء طلب |
| GET | `/orders` | Bearer | قائمة الطلبات |
| GET | `/orders/{order_number}` | Bearer | تفاصيل طلب |
| POST | `/payments/init` | Bearer | رابط Jawwal Pay |
| POST | `/payments/webhook` | ❌ | Jawwal Pay فقط |

---

## تدفق الشراء الكامل (Happy Path)

```javascript
// 1. عند فتح التطبيق
const guestUuid = localStorage.getItem('guest_uuid') || crypto.randomUUID();
await fetch(`${API}/auth/guest/init`, {
  method: 'POST',
  body: JSON.stringify({ guest_uuid: guestUuid })
});
localStorage.setItem('guest_uuid', guestUuid);

// 2. تصفح المنتجات
const products = await fetch(`${API}/products`).then(r => r.json());

// 3. إضافة للسلة
await fetch(`${API}/cart`, {
  method: 'POST',
  headers: { 'X-Guest-UUID': guestUuid, 'Content-Type': 'application/json' },
  body: JSON.stringify({ product_variant_id: 1, quantity: 2 })
});

// 4. حجز
await fetch(`${API}/cart/reserve`, {
  method: 'POST',
  headers: { 'X-Guest-UUID': guestUuid }
});

// 5. تسجيل دخول
await fetch(`${API}/auth/otp/send`, {
  method: 'POST',
  body: JSON.stringify({ phone: '+970591234567' })
});
const { token } = await fetch(`${API}/auth/otp/verify`, {
  method: 'POST',
  body: JSON.stringify({ phone: '+970591234567', otp: '123456' }),
  headers: { 'X-Guest-UUID': guestUuid }
}).then(r => r.json());

// 6. بدء الدفع
const checkout = await fetch(`${API}/orders/checkout/begin`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
// checkout.delivery_options → اعرضها للمستخدم

// 7. إنشاء الطلب
const order = await fetch(`${API}/orders`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    delivery_option_id: 1,
    address: { full_name: 'محمد أبو علي', phone: '+970591234567',
                city: 'غزة', area: 'الرمال', details: 'ش. عمر المختار' }
  })
}).then(r => r.json());
// order.data.order_number → GAZ-2026-0014

// 8. الدفع
const { payment_url } = await fetch(`${API}/payments/init`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ order_id: order.data.id })
}).then(r => r.json());
window.location.href = payment_url; // توجيه لـ Jawwal Pay
```

---

## WebSocket (Laravel Reverb) — سيُفعَّل لاحقاً

```javascript
// المنفذ: 8080 (ثابت)
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  wssPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: false,
  enabledTransports: ['ws'],
});

// عداد انتهاء الحجز
echo.channel(`cart.${userId}`)
  .listen('ReservationExpired', (e) => {
    // أعد توجيه المستخدم للسلة
  });

// نتيجة الدفع
echo.private(`orders.${userId}`)
  .listen('PaymentConfirmed', (e) => { /* نجح */ })
  .listen('PaymentFailed',    (e) => { /* فشل */ });
```

---

## قواعد لا تُخالَف

1. **`store_id`** غائب من كل response — لا تتوقعه ولا تبحث عنه
2. **`heartbeat`** لا يمدد الحجز — عداد فقط
3. **`checkout/begin`** يُستدعى مرة واحدة — `reservation_extended: true` يعني لا تُعده
4. **`order_number`** بصيغة `GAZ-YYYY-XXXX` — استخدمه في URL وأظهره للمستخدم
5. **`127.0.0.1`** دائماً — وليس `localhost`
