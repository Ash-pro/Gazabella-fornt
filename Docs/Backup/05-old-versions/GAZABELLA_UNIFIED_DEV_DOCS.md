# Gazabella — وثيقة التطوير الموحدة

**تاريخ آخر تحديث:** سبتمبر 2026 — تصحيح شامل بناءً على مراجعة التكامل GAZABELLA_INTEGRATION_REVIEW_AR  
**المرجع الملزم لعقد API:** `Docs/openapi.yaml`  
**صاحب المشروع:** أشرف الصليبي

> ⚠️ **تحذير:** القسم 10 (حالة الاختبارات) مُصحَّح. الأرقام السابقة «49 ناجح / 4 skipped / 0 فشل» كانت خاطئة — الواقع الموثق أدناه.

---

## الفريق

| العضو | الدور |
|--|--|
| **أشرف** | Product Lead · تحليل · توثيق · Frontend (Codex Desktop / Intergravity) |
| **عاصم** | Backend Engineer · Laravel + Infrastructure |

> الفرونت اند يُبنى بالكامل بمساعدة الذكاء الاصطناعي (Codex Desktop / Intergravity). عاصم يتولى البناء والصيانة الكاملة للـ Backend.

---

## 1. ما هي Gazabella؟

Gazabella ليست متجراً يملك مخزوناً، بل **وسيط ذكي (Aggregator Marketplace)** تعمل كحلقة وصل بين 3 متاجر أو أكثر شريكة وعملاء غزة. العميل يتسوق من متجر واحد موحد، لكن المنتجات تأتي من متاجر متعددة ويصلها توصيل واحد منسق.

---

## 2. قرار المعمارية المعتمد

### تقسيم الواجهات

| الطبقة | التقنية | المسار | الملاحظة |
|--|--|--|--|
| Super Admin Panel | Filament v3 | `/admin` | داخلي فقط |
| Customer App | React 19 | `frontend/` | الواجهة الرئيسية |
| Store Panel | React 19 | `frontend/` | لوحة صاحب المتجر |
| Delivery Panel | React 19 | `frontend/` | لوحة السائق |
| API Layer | Laravel REST | `/api/v1/*` | مشترك |

**القرار الثابت:** React لكل الواجهات الخارجية (العميل والمتجر والسائق)، Filament للأدمن الداخلي فقط.

> ~~Filament لبوابة المتجر~~ — هذا القرار القديم مُلغى. بوابة المتجر React في MVP1، تحليلاتها وصلاحياتها المتقدمة في MVP2.

---

## 3. البيئة التقنية

### Backend
```
PHP 8.2 + Laravel 12 (lock: v12.69.2)   ← ملاحظة: الوثيقة القديمة ذكرت "11" — الملف المقفل يثبت 12
Filament: v3.3.55
Database (Production):  MySQL
Database (Testing):     SQLite :memory:
Auth:                   Laravel Sanctum (Bearer Token) — لا SPA cookies
Admin Auth:             Filament Session
Queue:                  sync (محلي) / Redis (إنتاج)
Cache:                  file (محلي)
WebSocket:              Laravel Reverb
OTP:                    Redis (إنتاج) / test_mode bypass (محلي)
Tests:                  PHPUnit
```

> ⚠️ **عاصم:** لا تغيّر الحزم لتطابق رقم Laravel 11 القديم في أي نص — الـ lock هو المرجع.

**المسار:** `C:\Users\HP\Desktop\GazabellaOnlineStore\backend`  
**تشغيل الاختبارات:** `php artisan test --no-coverage`

### Frontend
```
React 19 + TypeScript
Build:          Vite 8
Styling:        Tailwind CSS 4
Routing:        React Router v7
Server State:   TanStack Query v5
Client State:   Zustand
Forms:          React Hook Form + Zod
HTTP:           Axios (instance مركزية)
WebSocket:      Laravel Echo 2.2.6 + pusher-js
Linting:        Oxlint
Package Mgr:    npm
Dev Tools:      Codex Desktop / Intergravity (على Windows / PowerShell)
```

**المسار:** `C:\Users\HP\Desktop\GazabellaOnlineStore\frontend`

### المنافذ المحلية
```
Frontend Dev Server  →  http://127.0.0.1:5173
Backend API          →  http://127.0.0.1:8000/api/v1
Laravel Reverb WS    →  ws://127.0.0.1:8080
```

> ⚠️ دائماً استخدم `127.0.0.1` وليس `localhost`

### التصميم البصري
- **الألوان:** وردي Venetian Rose `#9B2D52` + ذهبي Antique Gold `#BF9545`
- **الخطوط:** Tajawal (واجهة عربية) + Cormorant Garamond (شعار وـ hero) + JetBrains Mono (كود)
- **RTL عربي:** كامل ومتجاوب
- **Design Tokens:** في `src/index.css`

---

## 4. Guards و Auth Map

| الجهة | طريقة Auth | Guard | Token / Session |
|--|--|--|--|
| عميل | Phone + OTP | `sanctum` | Bearer Token |
| صاحب متجر | Email + Password | `store` *(قيد الإنشاء — P1)* | Bearer Token |
| سائق توصيل | Phone + Password | `delivery` *(قيد الإنشاء — P1)* | Bearer Token |
| Super Admin | Email + Password | `admin` | Filament Session |

> ⚠️ **P1:** `GET /auth/me` موثق كمبني لكنه **غير مسجل في routes** — اختباراته skipped بسببه. المسارات Store/Delivery غائبة أيضاً. لا تُعلن endpoint مبنياً قبل تسجيله وتشغيل اختباره.

---

## 5. قواعد الأمان الثابتة (لا تُخرق أبداً)

| الحقل | القيد |
|--|--|
| `store_id` | ❌ لا يظهر أبداً في أي Response للعميل — لا HTTP ولا WebSocket ولا أخطاء |
| `commission_amount` | ❌ لا يظهر أبداً في أي Response للعميل |
| `vendor_orders` / `sub_orders` | ❌ داخلي فقط — لا يُكشف للعملاء |
| OTP | 6 أرقام، TTL = 300 ثانية، hash في Redis، استعمال واحد، حدود محاولات |
| OTP test_mode | **بيئة التطوير فقط** — يُمنع في الإنتاج بشكل قاطع |
| OTP في logs | ❌ لا تُكتب الرموز في logs الإنتاج |
| Heartbeat | READ-ONLY — لا يُمدد الحجز أبداً |
| تمديد الحجز | مرة واحدة فقط عبر `POST /orders/checkout/begin` |
| Webhook secret | غياب secret في الإنتاج = رفض المعالجة — لا تجاوز التحقق |
| كود التسليم | لا يُكشف للسائق قبل تكليفه — لا يظهر في response الطلب العادي |

---

## 6. نموذج البيانات الجوهري

### التسمية: sub_orders (اسم التخزين الحالي) / Vendor Order (المفهوم)

> **تصحيح مراجعة التكامل:** الكود والـ migrations يستخدمان `sub_orders`. هذا هو اسم التخزين المعتمد حالياً. مصطلح "Vendor Order" يُستخدم كمفهوم في التوثيق فقط. أي تحويل إلى `vendor_orders` يحتاج migration متوافقة وتحديث جميع العلاقات — لا استبدال نصي.

```
orders
  └── sub_orders (vendor_orders مفهوماً — واحد لكل متجر ضمن الطلب)
        └── order_items
order_tracking
```

**قاعدة مهمة:** `auth()->id()` ليس `store_id` — استخرج المتجر دائماً من علاقة موثقة وافحص الملكية في كل endpoint.

### نموذج العنوان المعتمد (Hybrid Address)

العنوان يُخزَّن كـ JSON object داخل الطلب:

```json
{
  "full_name": "أحمد محمد",
  "phone": "0599123456",
  "city": "خانيونس",
  "area": "الأمل",
  "details": "شارع النصر، مقابل المدرسة",
  "landmark": "بجانب مسجد الرحمة",   // nullable — نص حر اختياري
  "lat": 31.3452,                      // nullable — لا يُشترط
  "lng": 34.3092                       // nullable — لا يُشترط
}
```

**Validation في Laravel:**
```php
'address.city' => ['required', 'string', Rule::in(config('gazabella.active_cities'))],
'address.landmark' => 'nullable|string|max:200',
'address.lat'      => 'nullable|numeric|between:-90,90',
'address.lng'      => 'nullable|numeric|between:-180,180',
```

### نطاق المدن المفعَّلة

**القرار:** خانيونس فقط كنقطة بداية — عبر config وليس DB enum.

```php
// config/gazabella.php
'active_cities' => ['خانيونس'],
```

> التوسع الجغرافي يبدأ في MVP3 بعد إثبات القدرة التشغيلية. ~~«مدينة غزة فقط»~~ و~~«خانيونس مدينة ثانية»~~ عبارات قديمة مُلغاة.

### CartReservation — النموذج الكامل

```
cart_item_id          — FK إلى cart_items
product_variant_id    — FK إلى product_variants
quantity
first_reserved_at     — وقت أول حجز (لحساب سقف 30 دقيقة الإجمالي)
expires_at            — موعد انتهاء الحجز الحالي (ISO8601)
extended_at           — null = لم يُمدد؛ not null = مُمدد
```

**دوال الاستخدام:**
- `canBeExtended()` → `$this->extended_at === null && !$this->isExpired()`
- `isExpired()` → `now() > $this->expires_at`
- `secondsRemaining()` → `max(0, $this->expires_at->diffInSeconds(now(), false) * -1)`
- `is_extended` في Response → `$reservation->extended_at !== null` (ليس حقلاً في DB)
- **سقف التمديد:** `expires_at = min(now()+15min, first_reserved_at+30min)` تحت قفل

> ⚠️ **P0:** `canBeExtended()` الحالية تفحص `extended_at` فقط دون التحقق من `MAX_TOTAL_MINUTES` — يجب إصلاحها.

### سياسة الحجز المعتمدة (تصحيح التعارض #1 و#2 من المراجعة)

| الإجراء | يحجز المخزون؟ |
|--|--|
| إضافة منتج للسلة | ❌ لا — تصفح فقط |
| `POST /cart/reserve` | ✅ نعم — 15 دقيقة |
| `POST /orders/checkout/begin` | ✅ تمديد واحد فقط ضمن 30 دقيقة من `first_reserved_at` |
| Heartbeat | ❌ قراءة فقط — لا تمديد |

> ~~«الحجز عند إضافة السلة لمدة 15 دقيقة»~~ — هذا النص القديم مُلغى.

### المخزون — نموذج الكميات

```
stock_quantity    = الكمية المادية الفعلية
reserved_quantity = الكمية المحجوزة حالياً
available         = stock_quantity - reserved_quantity
```

**القواعد:**
- الحجز: يزيد `reserved_quantity` فقط
- التأكيد (بعد الدفع): ينقص `stock_quantity` و`reserved_quantity` مرة واحدة ذرياً
- لا خصم مزدوج — `stock_quantity` لا يُلمس قبل تأكيد الدفع أو اعتماد تدفق COD

### Order — حالات الطلب (order_status)

```
pending     → تم الإنشاء، في انتظار الدفع
confirmed   → تأكيد الدفع (ليس "paid" — هذا payment_status)
processing  → قيد التجهيز
shipped     → قيد التوصيل
delivered   → مُسلَّم
cancelled   → ملغى
refunded    → مُسترجع (عملية مالية مستقلة — استرداد جزئي لا يحوّل الطلب كله)
```

### Order — حالات الدفع (payment_status) — منفصلة عن order_status

```
pending   → في انتظار إتمام الدفع
paid      → مدفوع
failed    → فشل الدفع
refunded  → مُسترد
```

> ⚠️ **P0:** `PaymentService::handleWebhook` الحالية تكتب `order.status=paid` — هذا خطأ. `paid` حالة دفع وليست حالة طلب. الطلب بعد الدفع يصبح `confirmed`.

### توقيت إنشاء حصص الموردين (تصحيح التعارض #20)

```
عند إنشاء الطلب (pending):
  → إنشاء sub_orders وsnapshot الأسعار والعمولة والخصم
  → الحصص غير قابلة للتنفيذ بعد (لا تُرسل مهام للمتاجر)

بعد تأكيد الدفع (confirmed) أو اعتماد COD:
  → إتاحة الحصص للمتاجر وإرسال مهام التنفيذ
```

---

## 7. ميزات MVP المعتمدة — نسخة موحدة مصححة

> **قاعدة الحالة:** المبني ≠ المختبر تكاملياً ≠ المفعّل إنتاجياً. كل ميزة تحمل حالتها الفعلية المبنية على دليل.

### 7.1 MVP0 — تثبيت الأساس

| الميزة | الحالة الفعلية |
|--|--|
| تسجيل/دخول العميل عبر OTP | ✅ مبني — test_mode |
| تصفح المنتجات والكتالوج | ✅ مبني |
| سلة تسوق موحدة + CartReservation | ✅ مبني — ⚠️ P0 قائمة |
| Checkout + إنشاء الطلب | ✅ مبني — ⚠️ P0 قائمة |
| كوبونات الخصم (أساسية) | ✅ مبني |
| لوحة الأدمن (Filament) | ✅ مبني |
| محاكاة دفع (Sandbox) | ✅ Sandbox — **ليس تكاملاً مثبتاً** |
| GET /auth/me | ❌ غير مسجل في routes |
| Scheduler (Cleanup) | ❌ `schedule:list` يُرجع: No scheduled tasks — P0 |

> MVP0 **غير مغلق** ما دامت عوائق P0 قائمة.

### 7.2 MVP1 — إطلاق قابل للتشغيل

| الميزة | الأولوية |
|--|--|
| ربط واجهة العميل React بـ API الحالية | عالية |
| Store Panel React (أساسي) + APIs | عالية |
| Delivery Panel React (أساسي) + APIs | عالية |
| Guards للمتجر والسائق | عالية |
| تفعيل Reverb لتتبع الطلبات real-time | عالية |
| وسيلة تحصيل مثبتة (COD أو Jawwal Pay الفعلي) | **قرار أعمال مطلوب** |
| Escrow logic + نافذة 48 ساعة | عالية |
| نظام النزاعات (Dispute) — متاح قبل التسليم أيضاً | عالية |
| كود تأكيد التسليم | عالية |
| تسوية أسبوعية (كل أحد بعد delivered_at+48h) | عالية |
| KYC المتاجر | متوسطة |
| Idempotency Key على payment endpoints | **P0 — قبل أي دفع حقيقي** |
| نظام التقييم — تجربة الطلب والتوصيل (لا كشف متجر) | متوسطة |
| فاتورة الطلب الأساسية | متوسطة |

### 7.3 MVP2 — تحسين الاستخدام

| الميزة | ملاحظة |
|--|--|
| المفضلة (مع اختيار variant عند النقل للسلة) | لا تنشئ جدول wishlist جديداً |
| مراجعات المنتجات المشتراة | تتحقق من ملكية الطلب وتسليمه |
| تطوير الكوبونات الموجودة (استهداف + حدود) | لا تعيد إنشاء جدول coupons |
| FCM + عودة تنبيه المخزون | Reverb داخل التطبيق في MVP1 |
| تقارير المتجر المتقدمة وصلاحياتها | بوابة MVP1 الأساسية موجودة |
| الشحن الجزئي | إضافة صريحة بنموذج shipments مستقل إن اعتُمدت |

### 7.4 MVP3 — توسع مضبوط

| الميزة | ملاحظة |
|--|--|
| دعم تذاكر مرتبط بالنزاعات | |
| AR/EN عند الحاجة الفعلية | `name` حقل العربية الحالي، `name_en` إضافي |
| برنامج ولاء (دفتر حركات كامل) | يتحقق من ملكية الدفعات وعكس الاسترداد |
| مدينة ثانية | بعد إثبات القدرة التشغيلية في خانيونس |
| Partner API | مفاتيح محدودة، توقيع أحداث، منع replay |

> ~~HE (العبرية)~~ — طلب مستقل لاحق، ليس في النطاق.

### الميزات اليتيمة (backlog مؤجل)

CSV للتقارير، إعادة الطلب، المدونة، Gift Builder، الإحالات، الاشتراكات، الإعلانات. ظهورها في Design System ليس التزاماً بالتنفيذ في MVP1.

---

## 8. عقد API — المسارات الفعلية والمخططة

| المسار | الحالة | ملاحظة |
|--|--|--|
| `POST /auth/otp/send` | ✅ مبني | |
| `POST /auth/otp/verify` | ✅ مبني | يقبل X-Cart-Token لدمج سلة الضيف |
| `GET /auth/me` | ❌ غير مسجل | P1 |
| `POST /auth/logout` | ✅ مبني | |
| `GET /cart` | ✅ مبني | |
| `POST /cart` | ✅ مبني | |
| `PATCH /cart/{itemId}` | ✅ مبني | |
| `DELETE /cart/{itemId}` | ✅ مبني | |
| `POST /cart/reserve` | ✅ مبني | |
| `GET /cart/heartbeat` | ✅ مبني — READ-ONLY | |
| `POST /orders/checkout/begin` | ✅ مبني | تمديد واحد فقط |
| `POST /checkout` | ✅ مبني | |
| `GET /orders` | ✅ مبني — ⚠️ P1 | يُرجع summary بدون items — الواجهة تقرأ items.length |
| `GET /orders/{orderNumber}` | ✅ مبني | order_number وليس id رقمي |
| `POST /payments/init` | ✅ مبني — Sandbox | يستخدم order_id الرقمي حالياً — لا تغيّر بصمت |
| `POST /payments/jawwal/confirm` | 🚧 مخطط | |
| `GET /orders/lookup-by-reference` | 🚧 مخطط | |
| `/search` | ❌ غير موجود | لا تقدّمه كمبني |
| `/account/*` | ❌ غير موجود | |
| `/coupons/validate` | ❌ غير موجود | |
| `/delivery-options` | ❌ غير موجود | |

> ⚠️ **P1 — GET /orders:** الواجهة الحالية تقرأ `order.items.length` لكن الـ endpoint يُرجع summary. يجب إما توحيد الـ response أو تغيير الواجهة لتستخدم `items_count`.

### شكل heartbeat (READ-ONLY — لا تمديد)

```json
{
  "has_reservation": true,
  "seconds_remaining": 743,
  "is_extended": false,
  "expires_at": "2026-09-20T10:45:00+00:00"
}
```

### أسماء حقول الحجز (تصحيح التعارض #22)

| الموضع | الاسم الحالي في الكود | الاسم المستهدف |
|--|--|--|
| `reserve()` response | `reserved_until` | `expires_at` ← انتقال تدريجي |
| `heartbeat()` response | `expires_at` | `expires_at` ✅ |
| `checkout/begin` | `reserved_until` | `expires_at` ← انتقال تدريجي |

> الانتقال إلى `expires_at` موحداً يتم مع إضافة `server_now` وحجوزات العناصر، مع مهلة توافق وإزالة `reserved_until` بعد تحديث جميع المستهلكين.

### عقد أحداث WebSocket (تصحيح التعارض #23)

| الحدث الفعلي في الكود | القناة الفعلية | ملاحظة |
|--|--|--|
| `OrderStatusChanged` | `orders.{userId}` | الواجهة تستمع لهذا |
| `ReservationExpired` | `private-cart` + اسم `reservation.expired` | الواجهة تستمع لقناة عامة — P1 |

> ⚠️ **P1:** توحيد القنوات الخاصة والأسماء بين البث والاستماع، واختبار حدث فعلي بعد commit.

---

## 9. إصلاحات تقنية مُنجزة

### 9.1 إزالة EnsureFrontendRequestsAreStateful من API Middleware

```php
// bootstrap/app.php
$middleware->api(prepend: [
    HandleCors::class,
    // EnsureFrontendRequestsAreStateful محذوف — نستخدم Bearer Token فقط
]);
```

### 9.2 OtpService — test_mode bypass

```php
// send()
if (config('gazabella.otp.test_mode')) {
    // لا تكتب الرمز في logs الإنتاج
    return config('gazabella.otp.test_code');
}
$hash = bcrypt($otp);
Redis::setex(self::PREFIX . $phone, self::TTL, $hash);

// ttlRemaining()
if (config('gazabella.otp.test_mode')) { return 0; }
```

### 9.3 Migration — إصلاح ENUM حالة الطلب

```php
// database/migrations/2026_09_20_110000_fix_orders_status_enum.php
if (DB::getDriverName() === 'sqlite') { return; }
DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM(
    'pending','confirmed','processing','shipped','delivered','cancelled','refunded'
) NOT NULL DEFAULT 'pending'");
```

> ⚠️ **عاصم:** `php artisan migrate` ضروري على الخادم لتطبيق هذا التغيير.

### 9.4 CartController — إصلاحات موثقة

| المشكلة | قبل | بعد |
|--|--|--|
| حد الكمية | `max:100` | `max:10` |
| كود إضافة عنصر | 201 | 200 |
| OUT_OF_STOCK | 422 | 409 |
| `reserve()` partial failure | 422 + `errors` | 409 + `unavailable_items` |
| `heartbeat()` شكل الـ response | array | object |
| `is_extended` | `$reservation->is_extended` | `$reservation->extended_at !== null` |

### 9.5 إعدادات البيئة المحلية

```env
# backend/.env
QUEUE_CONNECTION=sync
OTP_TEST_MODE=true
CACHE_STORE=file
```

---

## 10. حالة الاختبارات — الواقع الموثق (25 سبتمبر 2026)

```
Frontend: npm run build  → ✅ نجح (Vite 8.3.0 — 254 modules)
Frontend: npm run lint   → ✅ نجح (oxlint)

Backend: php artisan schedule:list → ⚠️ "No scheduled tasks have been defined"
  (Kernel.php موجود لكن المهام غير مسجلة فعلياً — P0)

Backend: php artisan test --no-coverage
  → 2 FAILED / 5 skipped / 46 passed (227 assertions)
```

### الاختباران الفاشلان (P1)

| الاختبار | المشكلة |
|--|--|
| `OrderFlowTest::test_checkout_begin_requires_items_in_cart` | يتوقع 400/422 لكن الخادم يُرجع 409 |
| `OrderFlowTest::test_checkout_begin_with_cart_items_reserves_stock` | يجهز mock Redis — يلزم fixtures فعلية في DB |

### الـ 5 Skipped

| الاختبار | السبب |
|--|--|
| `AuthTest: authenticated_user_can_get_profile` | `/auth/me` غير مسجل في routes |
| `AuthTest: unauthenticated_request_to_protected_endpoint` | نفس السبب |
| `CartTest: add_to_cart_rejects_inactive_variant` | لا يوجد variant غير نشط في seeder |
| `SecurityTest: cart_isolated_between_guests` | فشل إضافة العنصر |
| `SecurityTest: delivery_options_hides_internal_data` | `/delivery-options` غير موجود |

> ⚠️ الأرقام «49 ناجح / 4 skipped / 0 فشل» الواردة في الإصدارات السابقة من هذه الوثيقة كانت **غير صحيحة**. هذا هو الواقع الموثق من `GAZABELLA_VALIDATION_2026-09-25.txt`.

---

## 11. Filament Admin Panel

**المسار:** `/admin`  
**Guard:** `admin` + Filament Session Auth  
**Model:** `Admin` (منفصل عن `User`)

**Navigation:**
- المنتجات: Category, Product (مع Variants RelationManager)
- الطلبات: Order
- الإعدادات: Store, DeliveryOption

---

## 12. ما تبقّى — مُرتب بالأولوية

### P0 — عوائق إطلاق (يمنع الدخول الإنتاجي)

| المهمة | المسؤول |
|--|--|
| PaymentController::verifyWebhookSignature — يقبل الطلب عند غياب secret | عاصم |
| PaymentService::handleWebhook — يكتب `order.status=paid` بدل `confirmed` | عاصم |
| PaymentService — لا يطابق amount/currency/reference، لا قفل معالجة | عاصم |
| OrderService::createOrder — يخصم المخزون قبل الدفع | عاصم |
| CartController::update — تعديل الكمية بدون مزامنة الحجز | عاصم |
| CartReservation::canBeExtended — لا يفحص MAX_TOTAL_MINUTES | عاصم |
| release/cleanExpired — لا يمنع التحرير المتوازي | عاصم |
| `schedule:list` يُرجع فارغاً — Cleanup غير مسجل | عاصم |
| OtpService::send — TODO إرسال SMS، الرمز في logs | عاصم |
| Guest channel callbacks — لا تطابق UUID مقدم الطلب | عاصم |

### P1 — لازم للتكامل الأساسي

| المهمة | المسؤول |
|--|--|
| GET /orders — توحيد response (items vs items_count) | عاصم + أشرف |
| ReservationExpired — توحيد القناة والاسم مع الواجهة | عاصم + أشرف |
| GET /auth/me — تسجيل في routes + اختبار | عاصم |
| إصلاح اختباري OrderFlowTest الفاشلَين | عاصم |
| active_cities — تعريف في config + التحقق في OrderController | عاصم |
| Guards + Models للمتجر والسائق | عاصم |
| otpVerify — دمج آمن للسلة (كمية + حجز، لا مضاعفة) | عاصم |
| ربط واجهة العميل React بـ API الحالية | أشرف |

### P2 — قبل النمو

| المهمة | المسؤول |
|--|--|
| Escrow logic + Dispute model + Settlement scheduler | عاصم |
| كود تأكيد التسليم (generation + validation) | عاصم |
| Idempotency key على payment endpoints | عاصم |
| تفعيل Reverb لتتبع الطلبات real-time | عاصم |
| تكامل Jawwal Pay الفعلي (حالياً Sandbox غير مثبت) | عاصم |
| نظام التقييم (Rating model + API) | عاصم |
| KYC workflow للتجار | عاصم |
| FX rate snapshot عند إنشاء الطلب | عاصم |
| SMS fallback | عاصم |
| Acceptance Timeout (10 دقائق) على vendor_orders | عاصم |
| `php artisan migrate` على الخادم (ENUM migration) | عاصم |

---

## 13. قرارات أعمال لم تُحسم (مطلوبة قبل الإطلاق)

> هذه قرارات تجارية — لا يحق للكود أن يختارها بصمت.

| القرار | الخيارات |
|--|--|
| وسيلة الدفع المفعّلة | COD فقط / Jawwal Pay فقط / كلاهما |
| نسبة العمولة | لكل متجر في اتفاقيته — لا تثبت 15% كقيمة افتراضية |
| من يموّل الخصومات | Gazabella / المتجر / مشترك |
| شروط الإلغاء والمرتجع | سياسة موثقة |
| نقطة التجميع ومسؤولها | موقع وشخص |
| مواعيد الخدمة وقطع التسوية | المنطقة الزمنية + وقت القطع الأسبوعي |
| قدرات مزود الدفع | وثائق رسمية — لا افتراضات |

---

## 14. تشغيل المشروع محلياً

```powershell
# Backend
cd C:\Users\HP\Desktop\GazabellaOnlineStore\backend
php artisan serve            # يعمل على 127.0.0.1:8000
php artisan reverb:start     # WebSocket على 127.0.0.1:8080

# Frontend
cd C:\Users\HP\Desktop\GazabellaOnlineStore\frontend
npm run dev                  # يعمل على 127.0.0.1:5173

# بعد migration جديد
php artisan migrate
php artisan test --no-coverage
```

---

## 15. ملاحظات ثابتة للـ Codex / Intergravity

1. **لا تعدّل `openapi.yaml`** إلا بعد موافقة أشرف — هو المرجع الملزم
2. **`store_id` و `commission_amount`** محظوران نهائياً في أي Response — HTTP وWebSocket وأخطاء وفواتير
3. **`sub_orders`** هو اسم التخزين الحالي — لا تستبدله نصياً بـ `vendor_orders`
4. **Heartbeat** READ-ONLY — أي محاولة للتمديد فيه كسر قاعدة الأمان
5. **OTP test_code** في `.env` يُستخدم في التطوير فقط — ممنوع تماماً في production
6. **`is_extended`** ليس حقلاً في DB — يُشتق دائماً من `extended_at !== null`
7. دائماً `127.0.0.1` وليس `localhost`
8. **Bearer Token فقط** للـ APIs — لا SPA cookies، لا CSRF middleware على API routes
9. **Order ID في الـ URL** هو `order_number` (مثل `GAZ-2026-0001`) وليس الـ numeric id
10. **نطاق المدن** محصور في `config('gazabella.active_cities')` — لا قيم مضمّنة في الكود
11. **`expires_at`** هو الاسم الموحَّد — `reserved_until` موجود حالياً في بعض responses كموروث ويُزال تدريجياً
12. **`php artisan migrate`** مطلوب على الخادم قبل أي تشغيل بعد migration الـ ENUM
13. **الـ Sandbox الحالي** ليس تكاملاً مثبتاً مع Jawwal Pay — يُوسم محاكاة حتى يوجد دليل قبول فعلي
14. **لا تعلن اختباراً ناجحاً** لم تُشغّله — الأرقام السابقة كانت خاطئة
