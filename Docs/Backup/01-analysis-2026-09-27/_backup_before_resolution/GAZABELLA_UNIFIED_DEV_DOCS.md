# Gazabella — وثيقة التطوير الموحدة

**تاريخ آخر تحديث:** 27 سبتمبر 2026 — لوحتا المتجر والسائق داخل الباك اند (Filament) + بوابة موافقة المنتجات (بعد تصحيح مراجعة التكامل GAZABELLA_INTEGRATION_REVIEW_AR)  
**المرجع الملزم لعقد API:** `Docs/openapi.yaml`  
**الوثيقة المرافقة:** `gazabella_mvp 0 + 1 + 2+ 3.html` (التحليل الكامل للمراحل MVP0–MVP3)  
**تشمل:** هذه الوثيقة دمجت قرار المعمارية (Frontend/Backend Split)، وما عادت وثيقة منفصلة  
**صاحب المشروع:** أشرف الصليبي

> ⚠️ **تحذير:** القسم 10 (حالة الاختبارات) مُصحَّح. الأرقام السابقة «49 ناجح / 4 skipped / 0 فشل» كانت خاطئة — الواقع الموثق أدناه.

---

## الفريق

| العضو | الدور |
|--|--|
| **أشرف** | Product Lead · تحليل · توثيق · Frontend العميل (Codex Desktop / Intergravity) · مواصفات UX للوحات Filament |
| **عاصم** | Backend Engineer · Laravel + Infrastructure · Filament Panels (Admin / Store / Delivery) |

> الفرونت اند (واجهة العميل فقط) يُبنى بمساعدة الذكاء الاصطناعي (Codex Desktop / Intergravity). عاصم يتولى الـ Backend بالكامل، بما فيه لوحات الإدارة والمتجر والسائق.

---

## 1. ما هي Gazabella؟

Gazabella ليست متجراً يملك مخزوناً، بل **وسيط ذكي (Aggregator Marketplace)** تعمل كحلقة وصل بين 3 متاجر أو أكثر شريكة وعملاء غزة. العميل يتسوق من متجر واحد موحد، لكن المنتجات تأتي من متاجر متعددة ويصلها توصيل واحد منسق.

---

## 2. قرار المعمارية المعتمد

### تقسيم الواجهات

| الطبقة | التقنية | المسار | الملاحظة |
|--|--|--|--|
| Super Admin Panel | Filament v3 | `/admin` | داخلي — يشمل طابور موافقة المنتجات |
| Customer App | React 19 | `frontend/` | الواجهة الوحيدة المبنية بـ React |
| Store Panel | Filament v3 (داخل الباك اند) | `/store` | لوحة صاحب المتجر — Guard `store` |
| Delivery Panel | Filament v3 (داخل الباك اند) | `/delivery` | لوحة السائق — Guard `delivery` |
| API Layer | Laravel REST | `/api/v1/*` | لواجهة العميل فقط |

**القرار الثابت (27 سبتمبر 2026):** React لواجهة العميل فقط. لوحات الإدارة والمتجر والسائق كلها **Filament v3 Panels داخل الباك اند** (نفس Laravel)، كل لوحة بـ PanelProvider وGuard وجدول مستخدمين مستقل. لا REST API للوحات.

> ~~React لبوابة المتجر والسائق~~ — مُلغى. ~~`/api/v1/store/*` و`/api/v1/delivery/*`~~ — مُلغاة من خطة MVP1. اللوحة الأساسية للمتجر والسائق في MVP1، وتقارير المتجر وصلاحياته المتقدمة في MVP2. إن احتجنا تطبيق سائق أصلي لاحقاً تُضاف API مخصّصة في MVP3.

### سجل قرار المعمارية (ADR)

| التاريخ | القرار | الحالة |
|--|--|--|
| 20 سبتمبر 2026 | Filament للأدمن فقط، وReact للعميل والمتجر والسائق، مع APIs للمتجر والسائق | ❌ مُلغى |
| 27 سبتمبر 2026 | React للعميل فقط. لوحات الإدارة والمتجر والسائق Filament داخل الباك اند، مع بوابة موافقة المنتجات | ✅ معتمد — صاحب القرار: أشرف الصليبي |

**أسباب القرار المعتمد:**
- الفريق شخصين، وFilament بيوفّر أسابيع مقارنةً ببناء لوحتين React مع APIs إلهم.
- الصلاحيات والعزل (`store_id` / `driver_id`) بتكون مركزية في Policies داخل Laravel.
- لوحتا المتجر والسائق أدوات تشغيل، أما واجهة العميل فهي المنتج الأساسي وبتضل React.
- Filament متجاوب مع الجوال وبيكفي السائق في MVP1. إذا احتجنا تطبيق سائق أصلي، بنضيفله API مخصّصة في MVP3.

### مبدأ الكتالوج

المنتجات تُعرض للعميل **كمنتجات Gazabella** — لا اسم متجر ولا شعار ولا SKU متجر في أي واجهة (البطاقة، التفاصيل، السلة، الفاتورة، التتبع). المتجر مصدر توريد داخلي. أي منتج يضيفه المتجر **لا يظهر إلا بعد موافقة الإدارة** (التفاصيل في القسم 6).

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
React 19 + TypeScript 6          ← واجهة العميل فقط
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
Filament Panels      →  http://127.0.0.1:8000/admin · /store · /delivery
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
| صاحب متجر | Email + Password | `store` *(قيد الإنشاء — P1)* · Model `StoreUser` | Filament Session — `/store` |
| سائق توصيل | Phone + Password | `delivery` *(قيد الإنشاء — P1)* · Model `Driver` | Filament Session — `/delivery` |
| Super Admin | Email + Password | `admin` · Model `Admin` | Filament Session — `/admin` |

> ⚠️ **P1:** `GET /auth/me` موثق كمبني لكنه **غير مسجل في routes** — اختباراته skipped بسببه. لا تُعلن endpoint مبنياً قبل تسجيله وتشغيل اختباره.
> لوحات Filament تستخدم Session + CSRF (web middleware). Bearer Token لـ Customer API فقط.

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
| كود التسليم | لا يظهر في لوحة السائق ولا في أي response له — للعميل فقط عبر إشعار |
| ظهور المنتج للعميل | ✅ فقط `approval_status = approved` + `is_active` + `stores.is_active` + متغير نشط — في الكتالوج والسلة والـ Checkout |
| هوية المتجر | ❌ لا اسم ولا شعار ولا SKU ولا رقم تواصل للمتجر في أي واجهة للعميل — ولا endpoint عام للمتاجر |
| `approval_status` | الإدارة فقط تغيّره — المتجر لا يملك الصلاحية، والرفض بدون سبب مرفوض |
| عزل لوحة المتجر | `store_id` من `auth('store')->user()->store_id` فقط — لا يُقبل من الفورم · Policies + `getEloquentQuery()` في كل Resource |
| عزل لوحة السائق | السائق يرى الطلبات المكلّف بها فقط (`orders.driver_id`) وبيانات التوصيل لها فقط |

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

### كتالوج Gazabella — موافقة المنتجات (Product Moderation)

**مصدرا إضافة البضاعة:**

| المصدر | الحالة الابتدائية | الشروط |
|--|--|--|
| المتجر من `/store` | `draft` ← `pending_review` | المتجر `is_active` وKYC معتمد · `store_id` من المستخدم المسجّل |
| الإدارة من `/admin` نيابةً عن متجر | `approved` مباشرة | اختيار المتجر المورِّد إلزامي · `source = admin` · يظهر في لوحة المتجر للقراءة وتحديث المخزون |
| Partner API (MVP3) | `pending_review` | نفس بوابة الموافقة — لا نشر مباشر |

**دورة الحياة — `products.approval_status`:**

```
draft ──submit──▶ pending_review
pending_review ──approve──▶ approved            (الإدارة فقط)
pending_review ──reject(reason)──▶ rejected     (السبب إلزامي)
rejected ──edit + resubmit──▶ pending_review
approved ──change request──▶ يبقى approved؛ التعديل يُطبَّق فقط عند اعتماده
```

| الحالة | يظهر للعميل؟ | ملاحظة |
|--|--|--|
| `draft` | ❌ | يحفظ بدون إرسال |
| `pending_review` | ❌ | التعديل مقفل على المتجر حتى القرار · يظهر في طابور `/admin` |
| `approved` | ✅ بشرط `is_active` + متجر نشط + متغير نشط | الإدارة تعتمد الاسم والوصف والصور والتصنيف وسعر البيع النهائي |
| `rejected` | ❌ | `rejection_reason_code` + `rejection_reason` (≥ 10 أحرف) يظهران للمتجر في لوحته |

**التعديل على منتج معتمد:**

| التغيير | المعالجة |
|--|--|
| `stock_quantity` | فوري بدون موافقة (لا يمس `reserved_quantity`) |
| `is_active` (إيقاف/تفعيل العرض) | فوري — الإيقاف لا يُسقط الموافقة |
| الاسم · الوصف · الصور · التصنيف · السعر · متغير جديد | `product_change_requests` — النسخة المعتمدة تبقى معروضة حتى الاعتماد · الرفض بسبب إلزامي |
| الحذف | ممنوع على المتجر — أرشفة (SoftDeletes) فقط |

**الحقول الجديدة على `products`** (migration إضافية — المنتجات الحالية تُرحَّل إلى `approved` + `source = admin`):

```
approval_status           enum(draft, pending_review, approved, rejected)  index(approval_status, is_active)
source                    enum(store, admin)
created_by_store_user_id  FK nullable → store_users
created_by_admin_id       FK nullable → admins
submitted_at              timestamp nullable
reviewed_at / reviewed_by timestamp / FK nullable → admins
rejection_reason_code     varchar(40) nullable
rejection_reason          text nullable
deleted_at                SoftDeletes
```

**جداول جديدة:**

```
product_moderation_logs   — product_id, change_request_id?, action, actor_type, actor_id,
                            reason_code?, reason?, snapshot(json), created_at   [AUDIT — لا تعديل ولا حذف]
product_change_requests   — product_id, store_user_id, type(update_product|update_variant|add_variant|update_images),
                            payload(json diff), status(pending|approved|rejected), rejection_reason_code?,
                            rejection_reason?, reviewed_by?, reviewed_at?   [طلب pending واحد لكل منتج]
store_users               — store_id, name, email UNIQUE, password, role(owner|staff), is_active   [guard: store]
drivers                   — name, phone UNIQUE, password, is_active   [guard: delivery] + orders.driver_id nullable
```

**Scope إلزامي في Customer API:**

```php
public function scopeVisibleToCustomers(Builder $q): Builder
{
    return $q->where('approval_status', 'approved')
             ->where('is_active', true)
             ->whereHas('store', fn ($s) => $s->where('is_active', true))
             ->whereHas('variants', fn ($v) => $v->where('is_active', true));
}
```

يُطبَّق في `/products` و`/products/{slug}` والسلة، ويُعاد التحقق عند `checkout` — منتج أُوقف أو سُحبت موافقته أثناء وجوده في السلة يُعامل كـ `OUT_OF_STOCK` (409).

**أسباب الرفض الجاهزة:** صور تحمل شعار/علامة مائية للمتجر · صور غير واضحة · وصف ناقص أو مضلل · سعر غير منطقي · منتج مكرر في الكتالوج · تصنيف خاطئ · منتج غير مسموح أو مجهول المصدر أو قريب الانتهاء · أخرى (نص حر إلزامي).

**الإشعارات:** المتجر يُشعَر بالاعتماد/الرفض (Filament Database Notification + SMS اختياري). الإدارة ترى عدّاد «بانتظار المراجعة» (Navigation Badge). **هدف SLA المراجعة:** 24 ساعة عمل.

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
| لوحة الأدمن (Filament) | ✅ مبني — بدون طابور موافقة بعد |
| محاكاة دفع (Sandbox) | ✅ Sandbox — **ليس تكاملاً مثبتاً** |
| فلترة الكتالوج على المنتجات المعتمدة | ❌ غير موجودة — `approval_status` غير موجود في الـ schema بعد (P1) |
| GET /auth/me | ❌ غير مسجل في routes |
| Scheduler (Cleanup) | ❌ `schedule:list` يُرجع: No scheduled tasks — P0 |

> MVP0 **غير مغلق** ما دامت عوائق P0 قائمة.

### 7.2 MVP1 — إطلاق قابل للتشغيل

| الميزة | الأولوية |
|--|--|
| ربط واجهة العميل React بـ API الحالية | عالية |
| Store Panel — Filament `/store` (منتجات للمراجعة + مخزون + sub_orders + KYC) | عالية |
| Delivery Panel — Filament `/delivery` (مهام + استلام + تأكيد التسليم) | عالية |
| موافقة المنتجات — طابور `/admin` + رفض بسبب + سجل تدقيق + إشعارات | **عالية — شرط إطلاق** |
| طلبات تعديل المنتجات المعتمدة (`product_change_requests`) | متوسطة |
| Guards + Models للمتجر والسائق (`StoreUser` · `Driver`) | عالية |
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
| تقارير المتجر المتقدمة وصلاحياتها (owner/staff) | Filament Widgets داخل `/store` — توسيع لا إعادة بناء |
| استيراد CSV للمنتجات من `/store` | كل صف يدخل `pending_review` — لا نشر مباشر |
| الشحن الجزئي | إضافة صريحة بنموذج shipments مستقل إن اعتُمدت |

### 7.4 MVP3 — توسع مضبوط

| الميزة | ملاحظة |
|--|--|
| دعم تذاكر مرتبط بالنزاعات | |
| AR/EN عند الحاجة الفعلية | `name` حقل العربية الحالي، `name_en` إضافي |
| برنامج ولاء (دفتر حركات كامل) | يتحقق من ملكية الدفعات وعكس الاسترداد |
| مدينة ثانية | بعد إثبات القدرة التشغيلية في خانيونس |
| Partner API | مفاتيح محدودة، توقيع أحداث، منع replay · المنتجات عبر طابور الموافقة نفسه |

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
| `/products`, `/products/{slug}` | ✅ مبني — ⚠️ P1 | يجب إضافة `visibleToCustomers()` — المعتمد فقط، بدون أي حقل للمتجر |
| `/stores` أو أي endpoint للمتاجر | ⛔ ممنوع | المتاجر لا تُكشف للعميل |
| `/api/v1/store/*` · `/api/v1/delivery/*` | ⛔ ملغى | اللوحتان Filament داخل الباك اند |

### لوحات الشركاء — Web Routes (ليست API)

| المسار | اللوحة | Guard | المحتوى |
|--|--|--|--|
| `/admin` | الإدارة | `admin` | كل شيء + طابور «بانتظار المراجعة» + طلبات التعديل + إضافة منتج نيابةً عن متجر |
| `/store` | المتجر | `store` | لوحة معلومات · منتجاتي (draft/إرسال/سبب الرفض) · طلبات التعديل · المخزون · حصص الطلبات (قبول/جاهز — بدون بيانات العميل) · KYC |
| `/delivery` | السائق | `delivery` | المهام المكلّف بها · استلام · تأكيد التسليم بكود العميل · محاولة فاشلة |

إشعارات اللوحات: Filament Database Notifications مع polling كل 30 ثانية (`NewSubOrderReceived` · `ProductApproved` · `ProductRejected` · `ProductSubmitted` للإدارة · `OrderAssigned`). Reverb لتطبيق العميل فقط في MVP1.

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

## 11. Filament Panels — Admin · Store · Delivery

| اللوحة | المسار | Guard / Model | PanelProvider | الحالة |
|--|--|--|--|--|
| الإدارة | `/admin` | `admin` · `Admin` | `AdminPanelProvider` | ✅ مبنية |
| المتجر | `/store` | `store` · `StoreUser` | `StorePanelProvider` | 🚧 MVP1 |
| السائق | `/delivery` | `delivery` · `Driver` | `DeliveryPanelProvider` | 🚧 MVP1 |

**Admin Navigation (الحالي + الإضافة):**
- المنتجات: Category, Product (مع Variants RelationManager + 🆕 ModerationLogs RelationManager)
- 🆕 بانتظار المراجعة: طابور `pending_review` + طلبات التعديل — Actions: اعتماد · رفض (Modal: تصنيف + نص إلزامي) — مع Navigation Badge
- الطلبات: Order
- الإعدادات: Store, DeliveryOption · 🆕 StoreUser, Driver

**هيكل الكود:**

```
app/Filament/Admin/      # Resources الإدارة
app/Filament/Store/      # ProductResource · ChangeRequestResource · SubOrderResource · Stock · KYC
app/Filament/Delivery/   # AssignedOrders + Actions
app/Services/ProductModerationService.php   # submit · approve · reject · applyChangeRequest
app/Policies/            # ملكية store_id / driver_id
```

**قاعدة:** لوحتا المتجر والسائق تقيّدان كل استعلام بـ `store_id` / `driver_id` عبر `getEloquentQuery()` + Policies — لا تعتمد على إخفاء الأزرار. فورم منتج المتجر لا يحتوي `store_id` ولا `approval_status`.

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
| Guards + Models للمتجر والسائق (`StoreUser` · `Driver`) | عاصم |
| Migration: `approval_status` + حقول المراجعة على `products` + ترحيل الحالية إلى `approved` | عاصم |
| `visibleToCustomers()` في `/products` و`/products/{slug}` والسلة وإعادة التحقق عند checkout | عاصم |
| Store Panel `/store` + Delivery Panel `/delivery` (Filament) | عاصم |
| ProductModerationService + طابور المراجعة في `/admin` + سجل التدقيق + الإشعارات | عاصم |
| مواصفات UX للوحات Filament + قائمة أسباب الرفض + UAT مع المتاجر | أشرف |
| otpVerify — دمج آمن للسلة (كمية + حجز، لا مضاعفة) | عاصم |
| ربط واجهة العميل React بـ API الحالية | أشرف |
| واجهة العميل: إزالة أي أثر لهوية المتجر من البطاقة والتفاصيل والفاتورة والتتبع | أشرف |

**اختبارات مطلوبة للتغيير:** منتج من المتجر لا يظهر في `/products` قبل الاعتماد · الاعتماد يُظهره والرفض لا · الرفض بدون سبب يفشل · المتجر لا يغيّر `approval_status` ولا `store_id` · طلب التعديل لا يغيّر النسخة الحية قبل الاعتماد · منتج الإدارة `approved` + `source=admin` + سجل · Customer API لا يُرجع أي حقل للمتجر · عزل `store_id` في `/store` و`driver_id` في `/delivery`.

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
| ملكية سعر البيع للعميل | المتجر يقترح والإدارة تعتمد السعر النهائي عند الموافقة (الحقول تدعمها) — ويبقى نموذج الربح: هامش أم عمولة؟ |
| المنتج نفسه من أكثر من متجر | MVP1: منتج لكل متجر والمكرر يُرفض بسبب «مكرر» — أم دمج بعروض متعددة لاحقاً؟ |
| صور المنتجات | المتجر يرفع صوره بدون شعار — أم Gazabella تصوّر المنتجات المعتمدة؟ |

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
15. **لا تبنِ أي شاشة React للمتجر أو السائق** — اللوحتان Filament داخل الباك اند (`/store` · `/delivery`)
16. **واجهة العميل تعرض ما يُرجعه الـ API فقط** — المنتجات غير المعتمدة لا تصل أصلاً، ولا منطق إخفاء في الفرونت
17. **لا إشارة لمصدر المنتج** (اسم / شعار / SKU متجر) في البطاقة أو التفاصيل أو السلة أو الفاتورة أو التتبع
18. **التقييم** للطلب والتوصيل (`order_rating` · `driver_rating`) — لا تقييم متجر ظاهر للعميل
