# Gazabella — وثيقة التطوير الموحدة

> 🗄️ **نسخة أرشيفية (v7 · 27/09/2026).** المرجع التنفيذي الوحيد: `Docs/GAZABELLA_PLAYBOOK.html`. عند أي تعارض يُعتمد الـ Playbook.

**الإصدار:** v7 — **تاريخ آخر تحديث:** 27 سبتمبر 2026 — دمج المراجعة التحليلية الشاملة + سجل القرارات D-01…D-18 + مطابقة عوائق P0 بتقارير الإغلاق المحلي  
**المرجع الملزم لعقد API:** `Docs/openapi.yaml`  
**الوثيقة المرافقة:** `gazabella_mvp_0-1-2-3.html` (التحليل الكامل للمراحل MVP0–MVP3 + تبويب «الحلول المعتمدة»)  
**أدلة الحالة:** `Docs/MVP0_IMPLEMENTATION_2026-09-26_AR.md` · `Docs/MVP0_LOCAL_CLOSURE_2026-09-26_AR.md` · `Docs/PRODUCT_DISCOUNTS_2026-09-27_AR.md` · `Docs/MVP0_CONTRACT_DELTA.md`  
**تشمل:** هذه الوثيقة دمجت قرار المعمارية (Frontend/Backend Split)، وما عادت وثيقة منفصلة  
**صاحب المشروع:** أشرف الصليبي

> ✅ **القاعدة:** أي نص في هذه الوثيقة أو في ملف HTML يخالف سجل القرارات (القسم 16) أو حالة القسم 12 يُعتبر ملغى.

---

## 0. ملخص تحديث 27 سبتمبر 2026 — الحكم التنفيذي

| المحور | الحالة |
|--|--|
| MVP0 | ✅ **مُغلق محلياً** (SQLite + MariaDB 10.4) — ⏳ بانتظار Staging على MySQL |
| الاختبارات | Backend **61 ✓ / 443 تحقق** · Frontend **33 ✓** · تزامن **6 سيناريوهات** · **0 فشل · 0 skipped** |
| عوائق P0 الواردة في المراجعة التحليلية | **14 من 17** مُغلقة محلياً بدليل — القائمة كانت مأخوذة من خط أساس 25 سبتمبر |
| فجوات حقيقية متبقية | **G-01** تأكيد طلب COD · **G-02** تعطيل Jawwal Pay إنتاجياً · **G-03** توحيد قناة Reverb · **G-04** Staging + Cron (القسم 12) |
| نموذج التشغيل | ✅ محسوم: COD فقط للإطلاق · Micro-Hub هجين · عهدة نقدية للسائق · عمولة لكل متجر (القسم 16) |
| مؤجل لاعتماد خارجي | ⏸️ Jawwal Pay · ⏸️ مزود SMS للـ OTP · ⏸️ FCM (القسم 17) |
| معيار الخروج من MVP1 | 3 متاجر نشطة · 50–100 منتج معتمد · 30 طلب COD ناجح في خانيونس · صفر كشف هوية متجر · صفر فروقات نقدية |

> المراجعة التحليلية الخارجية صحيحة في تشخيص المخاطر التشغيلية والمالية، لكن قائمة عوائق الكود فيها قديمة. **لا تُعاد إصلاحات مُغلقة** — راجع القسم 12 قبل فتح أي مهمة.

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

> ✅ `GET /auth/me` مسجل ومختبر (AuthTest: 11 ناجح — 200 للمصادق و401 لغيره). القاعدة باقية: لا تُعلن endpoint مبنياً قبل تسجيله وتشغيل اختباره.
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
| عزل لوحة السائق | السائق يرى الطلبات المكلّف بها فقط (`orders.driver_id`) وبيانات المستلم بعد `shipped` فقط |
| كود التسليم (تخزين) | يُخزَّن `delivery_code_hash` فقط · 5 محاولات خاطئة = قفل وتصعيد · التأكيد اليدوي من `/admin` بسبب إلزامي (D-13) |
| العهدة النقدية | السائق يرى المبلغ المطلوب تحصيله فقط — لا عمولة ولا مستحق متجر · لا يُحرَّر ضمان قبل توريد النقد ومطابقته (D-02) |
| صور المنتجات | أسماء ملفات `{uuid}.webp` · حذف EXIF · لا اسم متجر في المسار أو `alt` (D-12) |
| طرق الدفع | `config('gazabella.payments.enabled_methods')` — في الإنتاج `['cod']` فقط حتى اعتماد Jawwal Pay (G-02) |

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

> ✅ **مُغلق محلياً (26/09):** منع تمديد المنتهي، تمديد واحد ضمن 30 دقيقة إجمالاً، ومنع العد المكرر. المدة من `RESERVATION_TTL_MINUTES` (15).

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
- إنشاء الطلب (COD): ينقص `stock_quantity` و`reserved_quantity` مرة واحدة ذرياً ويُرفض الطلب دون حجز صالح (مبني)
- لا خصم مزدوج (مختبر تزامنياً) — لطلبات `jawwal_pay` انظر G-02: لا تُفعَّل إنتاجياً قبل `payment_expires_at` وإعادة المخزون عند الفشل

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

> ✅ **مُغلق محلياً:** `handleWebhook` يكتب `confirmed` وmigration `align_order_statuses` حوّلت البيانات القديمة (`pending_payment/paid → pending/confirmed`).
> 🔴 **G-01:** طلب COD يبقى `pending` بعد إنشائه — يجب تحويله إلى `confirmed` بعد commit (الهاتف موثّق بـ OTP). `payment_status` يبقى `pending` حتى يسجّل السائق التحصيل.

### توقيت إنشاء حصص الموردين (تصحيح التعارض #20)

```
عند إنشاء الطلب (pending):
  → إنشاء sub_orders وsnapshot الأسعار والعمولة والخصم
  → الحصص غير قابلة للتنفيذ بعد (لا تُرسل مهام للمتاجر)

بعد confirmed (COD فور الإنشاء — G-01):
  → إتاحة الحصص للمتاجر وإرسال مهام التنفيذ + توليد كود التسليم
  → مهلة القبول 30 دقيقة: تذكير عند 15 · تصعيد للإدارة عند 30 (D-04)
```

---

## 7. ميزات MVP المعتمدة — نسخة موحدة مصححة

> **قاعدة الحالة:** المبني ≠ المختبر تكاملياً ≠ المفعّل إنتاجياً. كل ميزة تحمل حالتها الفعلية المبنية على دليل.

### 7.1 MVP0 — تثبيت الأساس

| الميزة | الحالة الفعلية |
|--|--|
| تسجيل/دخول العميل عبر OTP | ✅ مبني — test_mode (`123456` محلياً فقط) · SMS ⏸️ D-17 |
| تصفح المنتجات والكتالوج | ✅ مبني |
| سلة تسوق موحدة + CartReservation | ✅ مُغلق محلياً — دمج ضيف ذري · سقف 30 د · تنظيف كل دقيقة |
| Checkout + إنشاء الطلب | ✅ مُغلق محلياً — `checkout/quote` موقّع · Idempotency · COD · 🔴 G-01 |
| كوبونات الخصم (أساسية) | ✅ مبني |
| خصومات المنتجات `compare_at_price` | ✅ مبني (27/09) |
| لوحة الأدمن (Filament) | ✅ مبني — بدون طابور موافقة بعد |
| محاكاة دفع (Sandbox) | ✅ Sandbox محلي — **ليس تكاملاً مثبتاً** · ⏸️ D-17 |
| فلترة الكتالوج على المنتجات المعتمدة | ❌ غير موجودة — `approval_status` غير موجود في الـ schema بعد (P1) |
| GET /auth/me | ✅ مسجل ومختبر |
| Scheduler (Cleanup) | ✅ في `routes/console.php` (everyMinute) · ⏳ Cron على الاستضافة (G-04) |

> MVP0 **مُغلق محلياً** — الإغلاق التشغيلي يتطلب G-04 (Staging على MySQL + Cron + دمج الحزمة في المستودع المرجعي).

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
| وسيلة التحصيل | ✅ **COD فقط للإطلاق (D-01)** · Jawwal Pay ⏸️ D-17 |
| نقطة التجميع Micro-Hub + موجات التجميع | عالية — D-03 |
| عهدة السائق النقدية + التوريد اليومي | **عالية — شرط إطلاق (D-02)** |
| مهلة قبول المتجر 30 د + تصعيد + استبدال مورد/إزالة بند | عالية — D-04 · D-05 |
| Escrow logic + نافذة 48 ساعة + شرط توريد النقد | عالية |
| نظام النزاعات (Dispute) — متاح قبل التسليم أيضاً | عالية |
| كود تأكيد التسليم | عالية |
| تسوية أسبوعية (كل أحد بعد delivered_at+48h) | عالية |
| KYC المتاجر | متوسطة |
| Idempotency Key | ✅ مبني على `POST /orders` · يُضاف لـ `payments/init` عند تفعيل Jawwal Pay |
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
| `POST /auth/otp/verify` | ✅ مبني | الحقلان `phone` (+970…) و`otp` · يدمج سلة `X-Guest-UUID` ذرياً |
| `POST /auth/guest/init` | ✅ مبني | هوية ضيف تُرسل في `X-Guest-UUID` |
| `GET /auth/me` | ✅ مبني | |
| `POST /auth/logout` | ✅ مبني | |
| `GET /cart` | ✅ مبني | |
| `POST /cart` | ✅ مبني | |
| `PATCH /cart/{itemId}` | ✅ مبني | |
| `DELETE /cart/{itemId}` | ✅ مبني | |
| `POST /cart/reserve` | ✅ مبني | |
| `GET /cart/heartbeat` | ✅ مبني — READ-ONLY | |
| `POST /orders/checkout/begin` | ✅ مبني | تمديد واحد · يعيد `expires_at` و`delivery_options` و`active_cities` (+ `payment_methods` — G-02) |
| `POST /orders/checkout/quote` | ✅ مبني | `quote_token` موقّع ≤ 5 د أو نهاية الحجز |
| `POST /orders` | ✅ مبني | `Idempotency-Key` UUID إلزامي · `payment_method=cod` |
| `POST /checkout` | ⚠️ موروث | يُعلَّم deprecated في `openapi.yaml` (G-05) |
| `GET /orders` | ✅ مبني | يعيد نفس شكل تفاصيل الطلب العامة |
| `GET /orders/{orderNumber}` | ✅ مبني | order_number وليس id رقمي |
| `POST /payments/init` | ⏸️ Sandbox محلي | معطّل إنتاجياً (G-02) · يستخدم order_id الرقمي حالياً — لا تغيّر بصمت |
| `POST /payments/jawwal/confirm` | 🚧 مخطط | |
| `GET /orders/lookup-by-reference` | 🚧 مخطط | |
| `/search` | ❌ غير موجود | لا تقدّمه كمبني |
| `/account/*` | ❌ غير موجود | |
| `/coupons/validate` | ❌ غير موجود | |
| `/delivery-options` | ↪️ غير لازم | الخيارات تعود ضمن `checkout/begin` |
| `/products`, `/products/{slug}` | ✅ مبني — ⚠️ P1 (G-06) | فلاتر الفئة/السعر/الترتيب + `compare_at_price` · يجب إضافة `visibleToCustomers()` |
| `POST /orders/{order_number}/dispute` | 🚧 MVP1 | من `shipped` حتى 48 ساعة بعد `delivered_at` |
| `POST /orders/{order_number}/rate` | 🚧 MVP1 | `order_rating` · `driver_rating` |
| `/stores` أو أي endpoint للمتاجر | ⛔ ممنوع | المتاجر لا تُكشف للعميل |
| `/api/v1/store/*` · `/api/v1/delivery/*` | ⛔ ملغى | اللوحتان Filament داخل الباك اند |

### لوحات الشركاء — Web Routes (ليست API)

| المسار | اللوحة | Guard | المحتوى |
|--|--|--|--|
| `/admin` | الإدارة | `admin` | كل شيء + طابور «بانتظار المراجعة» + طلبات التعديل + إضافة منتج نيابةً عن متجر |
| `/store` | المتجر | `store` | لوحة معلومات · منتجاتي (draft/إرسال/سبب الرفض) · طلبات التعديل · المخزون · حصص الطلبات (قبول/جاهز — بدون بيانات العميل) · KYC |
| `/delivery` | السائق | `delivery` | المهام المكلّف بها · استلام · تأكيد التسليم بكود العميل · محاولة فاشلة |

إشعارات اللوحات: Filament Database Notifications مع polling كل 30 ثانية (`NewSubOrderReceived` · `ProductApproved` · `ProductRejected` · `ProductSubmitted` للإدارة · `OrderAssigned`). Reverb لتطبيق العميل فقط في MVP1.

> ✅ **GET /orders:** مُغلق — القائمة تعيد نفس شكل تفاصيل الطلب العامة.

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
| `reserve()` response | `expires_at` ✅ | `expires_at` |
| `heartbeat()` response | `expires_at` | `expires_at` ✅ |
| `checkout/begin` | `expires_at` ✅ + `seconds_remaining` | `expires_at` |

> الانتقال إلى `expires_at` موحداً يتم مع إضافة `server_now` وحجوزات العناصر، مع مهلة توافق وإزالة `reserved_until` بعد تحديث جميع المستهلكين.

### عقد أحداث WebSocket — القرار المعتمد (G-03)

| البند | الواجهة الحالية (تبقى) | الباك اند الحالي | المطلوب من الباك اند |
|--|--|--|--|
| القناة | `private-App.Models.User.{id}` | `orders.{userId}` | `new PrivateChannel("App.Models.User.{$order->user_id}")` |
| حدث الطلب | `.order.status.updated` | `OrderStatusChanged` | `broadcastAs(): 'order.status.updated'` |
| حدث الحجز | `.cart.reservation.updated` | `ReservationExpired` على `private-cart` | `broadcastAs(): 'cart.reservation.updated'` على قناة المستخدم |
| الحمولة | — | — | `order_number · status · status_label · updated_at` فقط — لا `store_id` ولا `sub_orders` |

> أقل تغيير: الباك اند يتبع الواجهة لأن قناة `App.Models.User.{id}` مفوّضة افتراضياً في `routes/channels.php`. الضيف لا يحتاج قناة: الحجز والطلب يتطلبان دخولاً، وheartbeat للقراءة يكفيه. polling 30 ثانية يبقى احتياطاً.

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

## 10. حالة الاختبارات — الواقع الموثق (27 سبتمبر 2026)

```
Backend  php artisan test --compact (SQLite)   → 61 passed · 443 assertions · 0 failed · 0 skipped
Backend  المجموعة على MariaDB 10.4.32          → 60 passed · 427 assertions
Backend  tests/closing-concurrency.php          → 6 سيناريوهات ناجحة بعمليات PHP مستقلة
Backend  schedule:run فعلياً                    → حذف الحجوزات المنتهية وإعادة المخزون
Frontend npm test                               → 33 passed
Frontend npm run test:mvp0 (HTTP فعلي)          → ✅
Frontend npm run build:mvp0 · npm run lint      → ✅
```

| سيناريو التزامن | النتيجة |
|--|--|
| عميلان على آخر قطعة | حجز واحد ناجح والآخر 409 |
| عاملان ينظفان حجزاً منتهياً | تحرير مرة واحدة |
| الطلب نفسه بالمفتاح نفسه في عمليتين | رقم طلب واحد وخصم مرة واحدة |
| طلبان متزامنان مختلفان | رقمان مختلفان ومخزون صحيح |
| `schedule:run` فعلياً | تنظيف وإعادة `reserved_quantity` |
| ترحيل حالات قديمة | `pending_payment/paid → pending/confirmed` |

**لم يُختبر بعد:** Oracle MySQL · Staging · حمل طويل المدة · OTP إنتاجي (TTL واستهلاك مرة واحدة) · مزود دفع فعلي.

> أرقام «46 ✓ / 2 ✗ / 5 skipped» تخص خط أساس 25 سبتمبر قبل الإصلاحات وأُلغيت.

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

## 12. ما تبقّى — مُرتب بالأولوية (بعد مطابقة الأدلة)

### 12.1 عوائق P0 الواردة في المراجعة — الحالة الفعلية

| البند | الحالة | الدليل |
|--|--|--|
| `verifyWebhookSignature` يقبل عند غياب secret | ✅ مُغلق محلياً | `empty($secret) → false` + `hash_equals` |
| `handleWebhook` يكتب `paid` | ✅ مُغلق محلياً | `confirmed` + migration `align_order_statuses` |
| لا مطابقة amount/reference ولا قفل | ✅ مُغلق محلياً | `lockForUpdate` + مقارنة بالقروش + منع ارتداد الإشعار المكرر (العملة عند التكامل) |
| `createOrder` يخصم قبل الدفع | ✅ لـ COD · 🔴 G-02 لـ Jawwal | رفض الطلب دون حجز صالح + خصم ذري |
| `CartController::update` دون مزامنة الحجز | ✅ مُغلق محلياً | تعديل الكمية يلغي الحجز ويلزم حجزاً جديداً |
| `canBeExtended` دون سقف 30 د | ✅ مُغلق محلياً | |
| `cleanExpired` تحرير متوازي | ✅ مُغلق محلياً | سيناريو تزامن 2 |
| Scheduler فارغ | ✅ في الكود · ⏳ Cron (G-04) | `routes/console.php` |
| `OtpService` إرسال SMS | ⏸️ مؤجل خارجي (D-17) | الرمز لا يُكتب نصاً في logs |
| Guest channel callbacks | ↪️ غير لازم في MVP1 | الطلب والحجز يتطلبان دخولاً |
| `/auth/me` · `GET /orders` · OrderFlowTest · `active_cities` · Idempotency · دمج سلة الضيف | ✅ مُغلقة محلياً | القسم 10 |

### 12.2 الفجوات الحقيقية المتبقية

| # | الفجوة | الحل | المالك | الأولوية |
|--|--|--|--|--|
| **G-01** | طلب COD يبقى `pending`؛ `confirmed` تُكتب فقط من `PaymentService` ← الحصص لن تصل للمتاجر | `DB::afterCommit` داخل `createOrder`: إذا `cod` ← `updateStatus('confirmed')` | عاصم | **P0 · MVP1** |
| **G-02** | `jawwal_pay` يخصم المخزون عند الإنشاء وهو `pending` | `payments.enabled_methods=['cod']` خارج local/testing + `Rule::in` + `checkout/begin` يعيد `payment_methods`. شرط إعادة التفعيل: `payment_expires_at` + Job إعادة المخزون | عاصم | **P0 قبل الإنتاج** |
| **G-03** | قناة/اسم حدث Reverb مختلفان | القسم 8 — الباك اند يتبع الواجهة | عاصم | P1 · MVP1 |
| **G-04** | لا Staging، والحزمة خارج Git، والنسخة المرجعية غير مؤكدة | دمج `backend-mvp0-changes-2026-09-27.zip` في فرع `mvp0-closure` + مطابقة SHA256 + Staging MySQL + Cron + Queue worker | عاصم | **P0 تشغيلي** |
| G-05 | `openapi.yaml` لا يعكس ملحق عقد MVP0 | دمج `MVP0_CONTRACT_DELTA.md` + `POST /checkout` deprecated | أشرف | P1 |
| G-06 | `approval_status` و`visibleToCustomers()` غير موجودين | القسم 6 | عاصم | P1 · شرط إطلاق |
| G-07 | `stores.commission_rate` قد يُملأ افتراضياً | إلزامي بلا default · لا تفعيل متجر دون نسبة موقّعة | عاصم | P1 |

```php
// G-01 — OrderService::createOrder
DB::afterCommit(function () use ($order) {
    if ($order->payment_method === 'cod') {
        $this->updateStatus($order, 'confirmed', 'تأكيد طلب الدفع عند الاستلام');
    }
});

// G-02 — config/gazabella.php
'payments' => [
    'enabled_methods' => in_array(env('APP_ENV'), ['local', 'testing'], true) ? ['cod', 'jawwal_pay'] : ['cod'],
],
// OrderController
'payment_method' => ['required', Rule::in(config('gazabella.payments.enabled_methods'))],
```

### 12.3 أعمال MVP1 (بعد إغلاق G-01…G-04)

| المهمة | المسؤول |
|--|--|
| Guards + Models (`StoreUser` · `Driver`) + Migration الموافقة + `visibleToCustomers()` | عاصم |
| `/admin`: طابور المراجعة · طلبات التعديل · الطلبات العالقة · استبدال مورد/إزالة بند · التأكيد اليدوي للتسليم · واتساب المتجر | عاصم |
| `/store`: منتجاتي · المخزون · الحصص (قبول/جاهز/موعد الموجة) · KYC · المستحقات | عاصم |
| `/delivery`: المهام · الاستلام · الكود · المحاولات الفاشلة · رفض بند · التحصيل والعهدة | عاصم |
| نقطة التجميع (`fulfillment_route` · موجات · `hub_received_at` · `packed_at`) | عاصم |
| العهدة والتوريد · Escrow · Disputes · Settlement Job · Rating | عاصم |
| مهلة القبول 30 د + تذكير + تصعيد | عاصم |
| مواصفات UX للوحات + أسباب الرفض + نصوص سياسة الإرجاع + UAT مع المتاجر | أشرف |
| واجهة العميل: كود التسليم · موعد متوقع · حالات التتبع الأربع · النزاع · التقييم · Reverb | أشرف |
| إزالة أي أثر لهوية المتجر من البطاقة والتفاصيل والفاتورة والتتبع + اختبار آلي على الاستجابات | أشرف + عاصم |

**اختبارات مطلوبة:** منتج من المتجر لا يظهر قبل الاعتماد · الرفض بدون سبب يفشل · المتجر لا يغيّر `approval_status` ولا `store_id` · طلب التعديل لا يغيّر النسخة الحية · Customer API وأحداث البث بلا أي حقل للمتجر · عزل `store_id`/`driver_id` · طلب COD يصبح `confirmed` · `jawwal_pay` مرفوض في production · كود التسليم لا يظهر في أي Resource للسائق · لا تحرير ضمان قبل التوريد.

---

## 13. قرارات الأعمال — الحالة بعد 27 سبتمبر

| القرار | الحالة |
|--|--|
| وسيلة الدفع المفعّلة | ✅ COD فقط للإطلاق (D-01) · Jawwal Pay بعد اعتماد المزود |
| نسبة العمولة | ✅ النموذج: عمولة لكل متجر بلا default (D-06) · ✍️ القيم في الاتفاقيات |
| من يموّل الخصومات | ✅ Gazabella في MVP1 (D-08) |
| شروط الإلغاء والمرتجع | ✅ القسم 20 (D-09) |
| نقطة التجميع ومسؤولها | ✅ النموذج Micro-Hub (D-03) · ✍️ الموقع والشخص |
| مواعيد الخدمة وقطع التسوية | ✅ `Asia/Gaza` · تنفيذ 10:00–20:00 · التسوية الأحد 12:00 (D-15) |
| قدرات مزود الدفع | ⏸️ مؤجل — وثائق رسمية فقط (D-17) |
| ملكية سعر البيع ونموذج الربح | ✅ المتجر يقترح والإدارة تعتمد · تكافؤ سعري · عمولة (D-06) |
| المنتج نفسه من أكثر من متجر | ✅ MVP1 رفض `duplicate` + مورد بديل يدوي (D-11) |
| صور المنتجات | ✅ المتجر يرفع والإدارة تعتمد أو تستبدل (D-12) |

### ✍️ قيم تنتظر توقيع صاحب المشروع (النموذج محسوم — القيم فقط)

| القيمة | الافتراضي المقترح | مفتاح الإعداد |
|--|--|--|
| موقع نقطة التجميع والمسؤول | أكثر المتاجر مركزية + موظف تجميع بدوام جزئي | `GAZABELLA_HUB_NAME` |
| نسبة عمولة كل متجر | 10–15% · المؤسسون 5% لـ 3 أشهر | `stores.commission_rate` |
| سقف عهدة السائق | 1,000 ₪ | `driver_cash_cap` |
| موجات التجميع | قطع 11:00 و16:00 | `hub.waves` |
| رسوم التوصيل | 5 ₪ داخل خانيونس · 8–10 ₪ للأطراف · مجاني فوق 200 ₪ | `delivery_options` |

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
11. **`expires_at`** هو الاسم الموحَّد — `reserve` و`checkout/begin` يعيدانه (ملحق عقد MVP0)؛ أي `reserved_until` متبقٍ موروث لا يُبنى عليه
12. **`php artisan migrate`** مطلوب على الخادم قبل أي تشغيل بعد migration الـ ENUM
13. **الـ Sandbox الحالي** ليس تكاملاً مثبتاً مع Jawwal Pay — يُوسم محاكاة حتى يوجد دليل قبول فعلي
14. **لا تعلن اختباراً ناجحاً** لم تُشغّله — الأرقام السابقة كانت خاطئة
15. **لا تبنِ أي شاشة React للمتجر أو السائق** — اللوحتان Filament داخل الباك اند (`/store` · `/delivery`)
16. **واجهة العميل تعرض ما يُرجعه الـ API فقط** — المنتجات غير المعتمدة لا تصل أصلاً، ولا منطق إخفاء في الفرونت
17. **لا إشارة لمصدر المنتج** (اسم / شعار / SKU متجر) في البطاقة أو التفاصيل أو السلة أو الفاتورة أو التتبع
18. **التقييم** للطلب والتوصيل (`order_rating` · `driver_rating`) — لا تقييم متجر ظاهر للعميل
19. **لا تُعد إصلاح بند مُغلق** في القسم 12.1 — افتح مهمة فقط للفجوات G-xx
20. **طريقة الدفع** تُقرأ من `payment_methods` في `checkout/begin` — لا تعرض Jawwal Pay في الإنتاج
21. **كود التسليم** يُعرض للعميل فقط في تفاصيل طلبه، مع النص: «أعطِ هذا الكود لمندوب التوصيل فقط عند استلام طلبك»
22. **حالات التتبع للعميل أربع فقط:** تم التأكيد · قيد التجهيز · خرج للتوصيل · تم التسليم — لا إشارة لعدد المتاجر أو نقطة التجميع

---

## 16. سجل القرارات المعتمدة (27 سبتمبر 2026)

> كل قرار يلغي ما يخالفه في هذه الوثيقة وفي ملف HTML. القيم الموسومة ⚙️ في `config/gazabella.php` وتُعدَّل دون تغيير كود.

| # | المسألة | القرار | يلغي |
|--|--|--|--|
| **D-01** | الدفع في إطلاق MVP1 | **COD فقط.** Jawwal Pay Sandbox محلي ومعطّل إنتاجياً حتى اعتماد المزود | «COD أو Jawwal — قرار مطلوب» |
| **D-02** | Escrow مع COD | دفتر عهدة للسائق: تحصيل ← توريد يومي ← مطابقة. التحرير بعد 48 ساعة بلا نزاع **و** توريد النقد | Escrow للدفع المسبق فقط |
| **D-03** | نقطة التجميع | Micro-Hub هجين: نقطة واحدة في خانيونس + موجتان ⚙️ (11:00 · 16:00). طلب متجر واحد ← مسار مباشر | «لم يُحسم» |
| **D-04** | مهلة قبول المتجر | ⚙️ 30 دقيقة: تذكير 15 · تصعيد للإدارة 30 · لا إلغاء آلي | «10 دقائق ثم إعادة تعيين» |
| **D-05** | تعذّر بند (دون شحن جزئي) | «استبدال المورد» أو «إزالة البند» بموافقة العميل هاتفياً وإعادة حساب COD — شحنة واحدة | تجمّد الطلب كاملاً |
| **D-06** | نموذج الربح | عمولة لكل متجر (`commission_rate` إلزامي بلا default) تُنسخ في `sub_orders`. تكافؤ سعري دون هامش مضاف. نطاق تفاوض 10–15% · المؤسسون 5% لـ 3 أشهر | «15% افتراضياً» · «3–5% ثابتة» · «جملة + هامش» |
| **D-07** | رسوم التوصيل | يدفعها العميل عبر `delivery_options` وتُحصَّل مع COD — إيراد Gazabella لا يدخل مستحق المتجر | — |
| **D-08** | تمويل الخصومات | كوبونات MVP1 على Gazabella؛ مستحق المتجر على سعر ما قبل الكوبون · snapshot `discount_funded_by` · خصم `compare_at_price` خصم متجر | «قرار مفتوح» |
| **D-09** | المرتجعات | سياسة مستحضرات تجميل صارمة (القسم 20) | «لم تُحسم» |
| **D-10** | صندوق التلفيات | احتياطي داخلي ⚙️ 1% من إيراد العمولة (`damage_reserve_entries`) — لا رسوم على العميل | «رسوم حماية 1% على العميل» |
| **D-11** | المنتج المكرر | منتج واحد لكل SKU · رفض `duplicate` · تسجيل المتجر مورداً بديلاً يدوياً · «منتج رئيسي + عروض» يُدرس في MVP2 | — |
| **D-12** | الصور والهوية | المتجر يرفع والإدارة تعتمد/تستبدل · `{uuid}.webp` · حذف EXIF · اختبار آلي على الاستجابات | — |
| **D-13** | كود التسليم مع الانقطاع | 4 أرقام عند `confirmed` · hash فقط · تأكيد يدوي من `/admin` بسبب · 5 محاولات = قفل | — |
| **D-14** | إشعار المتاجر | Filament Database Notifications + زر واتساب `wa.me` برسالة جاهزة من صفحة الطلب في `/admin` | «SMS Fallback — MVP1» |
| **D-15** | الوقت والتسوية | `Asia/Gaza` · استقبال 24/7 · تنفيذ ⚙️ 10:00–20:00 · التسوية الأحد 12:00 لما حُرِّر حتى السبت 23:59 · بنكي/محفظة حسب الاتفاقية | «التسوية شهرياً» |
| **D-16** | مدة الحجز | 15 د عبر `POST /cart/reserve` + تمديد واحد بسقف 30 د · الإضافة للسلة لا تحجز | «10 دقائق عند بدء الدفع» |
| **D-17** | الاعتمادات الخارجية | Jawwal Pay · SMS · FCM مؤجلة دون تعطيل البناء (القسم 17) | — |
| **D-18** | الجغرافيا والتسمية | خانيونس فقط حتى MVP3؛ المدينة الثانية (رفح أو الوسطى) بعد الإثبات · `sub_orders`/`sub_order_id` في كل التوثيق | «غزة فقط» · «+رفح/خانيونس MVP2» · `vendor_orders` |

---

## 17. المؤجل لاعتماد خارجي

| البند | يُبنى الآن | ينتظر المزود | شرط التفعيل |
|--|--|--|--|
| **Jawwal Pay** | `PaymentGateway` interface + Sandbox محلي + تعطيل إنتاجي (G-02) | وثائق API · مفاتيح إنتاج · شكل التوقيع · الاسترداد والرسوم | E2E على بيئة المزود · مطابقة amount/currency/reference · `payment_expires_at` · Idempotency على `payments/init` |
| **SMS / OTP** | `SmsChannel` interface + driver `log` محلياً (بلا نص الرمز) + rate limit | عقد مزود (NeelSMS · Eky) ومعدل التسليم على جوال/أوريدو | **شرط إطلاق عام.** Pilot مغلق بقائمة أرقام مسموحة لفريق الاختبار فقط |
| **FCM** | Reverb (G-03) + polling احتياطي | مشروع Firebase | MVP2 |

> لا يُكتب كود يفترض شكل استجابة مزود لم تُستلم وثائقه.

---

## 18. نموذج التشغيل الميداني — Micro-Hub ودورة النقد

### 18.1 نقطة التجميع

```
confirmed ─▶ المتجر يقبل (≤30 د) ─▶ «جاهز»
   ├─ fulfillment_route = direct (متجر واحد): السائق يستلم مباشرة ويغلّف بغلاف Gazabella
   └─ fulfillment_route = hub (أكثر من متجر): موجة التجميع التالية ─▶ picked_up ─▶ at_hub
        ─▶ فحص بصري + صلاحية + تغليف + فاتورة موحدة (hub_received_at · packed_at)
─▶ تكليف سائق ─▶ shipped ─▶ الكود ─▶ delivered + تحصيل
```

- الطلب المؤكد بعد قطع آخر موجة يدخل أول موجة في اليوم التالي، ويُعرض للعميل `expected_delivery_at` قبل التأكيد.
- لا يخرج طلب `hub` للتوصيل قبل وصول كل حصصه (أو تطبيق D-05).
- النقطة بوابة جودة: التلف المكتشف فيها يعود للمتجر قبل وصوله للعميل.
- اتفاقية المتجر: ضمان الأصالة · حد أدنى للصلاحية ⚙️ 6 أشهر · تحمّل التلف المصنعي.

```php
// config/gazabella.php
'hub' => ['enabled' => true, 'name' => env('GAZABELLA_HUB_NAME'), 'waves' => ['11:00', '16:00']],
'store_acceptance_minutes' => 30,
'store_acceptance_reminder_minutes' => 15,
'service_hours' => ['from' => '10:00', 'to' => '20:00'],
'driver_cash_cap' => 1000,
```

### 18.2 دورة النقد والضمان

```
delivered (كود صحيح) ─▶ driver_cash_collections: collected · payment_status = paid
─▶ توريد نهاية الوردية (≤ 24 ساعة) ─▶ cash_remittances + مطابقة ─▶ remitted   (فرق ─▶ variance يمنع إغلاق الوردية)
─▶ 48 ساعة من delivered_at بلا نزاع  AND  remitted ─▶ escrow_holds: released
─▶ الأحد 12:00 SettlementJob ─▶ settlements لكل متجر ─▶ تحويل ─▶ transfer_ref
```

**مستحق المتجر لكل `sub_order`:** `payout = gross − gross × commission_rate_snapshot − refunds_attributable_to_store` — رسوم التوصيل وكوبونات Gazabella خارج المعادلة.

**ضوابط العهدة:** السائق يرى المبلغ المطلوب فقط · تجاوز ⚙️ سقف العهدة يمنع تكليفه بطلبات جديدة · كل توريد بإيصال باسم المستلم.

---

## 19. السيناريو الكامل End-to-End — النسخة المعتمدة

1. **إدخال المتجر:** الإدارة تنشئ المتجر و`StoreUser` وتسجل العمولة الموقعة ← KYC ← اعتماد ← `stores.is_active`.
2. **المنتجات:** `draft` ← «إرسال» ← `pending_review` (SLA 24 ساعة عمل) ← `approved` بتثبيت الاسم والوصف والتصنيف والسعر، أو رفض بكود + سبب ≥ 10 أحرف، أو `duplicate`. الظهور فقط عبر `visibleToCustomers()` وبهوية Gazabella.
3. **التصفح والسلة:** ضيف بـ `X-Guest-UUID` — لا حجز.
4. **الدخول والحجز:** OTP ← دمج السلة ذرياً ← `POST /cart/reserve` (15 د) ← عداد مرئي · heartbeat للقراءة.
5. **المراجعة:** `checkout/begin` (تمديد واحد · خيارات التوصيل · المدن · طرق الدفع) ← العنوان الهجين ← `checkout/quote` ← عرض الموعد المتوقع وسياسة الإرجاع.
6. **الإنشاء:** `POST /orders` + `Idempotency-Key` + `cod` ← الطلب و`sub_orders` مع snapshots ← خصم المخزون ذرياً ← `confirmed` (G-01) ← كود التسليم.
7. **التنفيذ:** كل متجر يرى حصته فقط ← قبول (`processing`) ← «جاهز» · 15 د تذكير · 30 د تصعيد ← D-05 عند التعذر.
8. **التجميع:** `direct` أو `hub` (القسم 18) ← تغليف وفاتورة موحدة ← تكليف سائق ← `shipped` ← بث «خرج للتوصيل».
9. **التسليم:** البند التالف يُرفض عند الباب ← الكود ← `delivered` ← تسجيل التحصيل. محاولة فاشلة ← سبب وموعد ← 3 محاولات ← إرجاع للنقطة ← 48 ساعة ← إلغاء وإعادة المخزون. انقطاع شبكة السائق ← تأكيد يدوي (D-13).
10. **المال:** توريد ← مطابقة ← 48 ساعة بلا نزاع ← `released` ← تسوية الأحد. النزاع يجمّد ضمان الحصة المعنية فقط ← قرار خلال 48 ساعة عمل.
11. **ما بعد التسليم:** تقييم الطلب والتوصيل — لا تقييم متجر ظاهر.

---

## 20. سياسة المرتجعات والنزاعات — مستحضرات التجميل (D-09)

| الحالة | مقبول؟ | المهلة والإثبات | المعالجة | يتحمّل |
|--|--|--|--|--|
| تلف ظاهر عند الاستلام | نعم | عند الباب قبل إعطاء الكود | رفض البند وخصمه من COD وإرجاعه للنقطة | المتجر (تغليف/تصنيع) · الاحتياطي (نقل) |
| تلف بعد فتح الطرد الخارجي | نعم | 48 ساعة + صور | نزاع ← استرداد نقدي عبر السائق أو استبدال | حسب التحقيق |
| صنف خاطئ أو ناقص | نعم | 48 ساعة + صورة الفاتورة والصنف | استبدال في الموجة التالية | المتجر أو النقطة |
| منتهي أو صلاحيته < 3 أشهر | نعم | 48 ساعة | استرداد كامل + تنبيه جودة | المتجر |
| مختوم لم يُفتح — تغيير رأي | استبدال فقط | 48 ساعة · ختم سليم | رصيد استبدال لا نقد | العميل يدفع التوصيل |
| مفتوح/مُجرَّب — تغيير رأي أو حساسية | لا | — | تُعرض السياسة في صفحة المنتج والفاتورة | — |

> النزاع متاح من `shipped` حتى 48 ساعة بعد `delivered_at` ويجمّد ضمان الحصة المعنية فقط.

---

## 21. آلات الحالة الموحدة وإضافات نموذج البيانات

```
orders.status (ENUM الحالي — بلا قيم جديدة)
pending ─COD created / payment confirmed─▶ confirmed ─first accepted─▶ processing
processing ─all at hub (أو direct picked_up) + driver─▶ shipped ─code ok─▶ delivered
pending|confirmed|processing ─▶ cancelled        delivered ─full refund─▶ refunded

orders.payment_status:  pending ─cash collected / gateway paid─▶ paid ─▶ refunded · pending ─▶ failed

sub_orders.status (المستهدف — يطابق عاصم القيم الحالية قبل migration)
pending ─order confirmed─▶ awaiting_acceptance ─▶ accepted ─▶ ready ─▶ picked_up ─▶ at_hub ;  any ─admin─▶ cancelled

escrow_holds:  held ─48h no dispute AND remitted─▶ released ─▶ settled ;  held ─dispute─▶ frozen ─▶ held | refunded
driver_cash_collections:  collected ─▶ remitted ;  collected ─mismatch─▶ variance ─admin─▶ remitted
```

| الحالة الداخلية | ما يراه العميل |
|--|--|
| `confirmed` | تم تأكيد طلبك (+ كود التسليم والموعد المتوقع) |
| `processing` | قيد التجهيز |
| `shipped` | خرج للتوصيل |
| `delivered` | تم التسليم (+ التقييم ونافذة النزاع) |

**إضافات البيانات لـ MVP1** (إضافة إلى حقول الموافقة في القسم 6):

```
stores                   commission_rate NOT NULL (بلا default) · kyc_status · whatsapp_phone
orders                   driver_id · fulfillment_route(direct|hub) · delivery_code_hash · delivery_code_attempts
                         expected_delivery_at · hub_received_at · packed_at · shipped_at · delivered_at
sub_orders               status · accepted_at · ready_at · picked_up_at · at_hub_at · acceptance_deadline_at
                         reminded_at · commission_rate_snapshot · discount_funded_by
delivery_attempts        order_id · driver_id · reason_code · note · next_attempt_at
driver_cash_collections  order_id UNIQUE · driver_id · expected · collected · status · collected_at · remittance_id
cash_remittances         driver_id · total · received_by_admin_id · received_at · receipt_no · notes
escrow_holds             sub_order_id UNIQUE · amount · status · hold_until · released_at · settlement_id
disputes                 order_id · sub_order_id? · reason_code · description · photos(json) · status · resolution
                         refund_amount · decided_by · decided_at
settlements              store_id · period_from · period_to · gross · commission · refunds · payout · status · transfer_ref · paid_at
damage_reserve_entries   source(commission_pct|manual) · amount · dispute_id? · note
```

---

## 22. خصائص الأقسام الأربعة — الصلاحيات والرؤية

| القسم | التقنية والمصادقة | يفعل | لا يرى أبداً |
|--|--|--|--|
| **الإدارة `/admin`** | Filament v3 · Guard `admin` · `Admin` | طابور المراجعة وطلبات التعديل وسجل التدقيق · KYC والتفعيل والعمولات · الطلبات العالقة والتكليف · استبدال مورد/إزالة بند · التأكيد اليدوي للتسليم · العهدة والتوريد والفروقات · النزاعات والتسويات · واتساب المتجر | — (يرى كل شيء، وكل إجراء حساس مسجّل بسبب) |
| **المتجر `/store`** | Filament v3 · Guard `store` · `StoreUser` · عزل `store_id` عبر `getEloquentQuery()` + Policies | منتجاتي (مسودة/إرسال/سبب الرفض) · طلبات التعديل · المخزون والإيقاف الفوري · الحصص (قبول/جاهز/موعد الموجة) · KYC · المستحقات والضمان والتسويات | العميل · الهاتف · العنوان · العمولة المحسوبة على الطلب · المتاجر الأخرى |
| **السائق `/delivery`** | Filament v3 متجاوب · Guard `delivery` · `Driver` · عزل `driver_id` | المهام المكلّف بها · الاستلام من المتجر/النقطة · بيانات المستلم بعد `shipped` · الكود · محاولة فاشلة · رفض بند · التحصيل وعهدة اليوم | كود التسليم · العمولة · مستحق المتجر |
| **العميل (React)** | React 19 + TS · Sanctum Bearer فقط | كتالوج بهوية Gazabella وخصومات · سلة ضيف ← OTP ← دمج · حجز بعداد · مراجعة سعر · COD · كود التسليم · تتبع حي/دوري · تقييم · نزاع 48 ساعة · واتساب الدعم | أي أثر للمتجر أو الحصص أو نقطة التجميع |

---

## 23. خطة التنفيذ — MVP1 في 3 Sprints (أسبوعان لكل منها)

| Sprint | عاصم — Backend + Filament | أشرف — Product + Frontend | معيار الإنجاز |
|--|--|--|--|
| **S1 أساس الإطلاق** | G-04 · G-01 · G-02 · G-07 · Guards/Models · Migration الموافقة + `visibleToCustomers()` | G-05 `openapi.yaml` · مواصفات UX للوحات · أسباب الرفض · نص سياسة الإرجاع · جمع التواقيع (القسم 13) | 61+ اختبار على Staging MySQL · `schedule:list` غير فارغ · COD ← confirmed · منتج غير معتمد لا يظهر |
| **S2 اللوحات** | `/admin` المراجعة والطلبات العالقة · `/store` كاملة · `/delivery` بالكود والمحاولات والتحصيل · مهلة القبول · كود التسليم | الكود · الموعد المتوقع · سياسة الإرجاع · حالات التتبع الأربع · UAT مع متجر وسائق | السيناريو 1←9 يدوياً على Staging دون تدخل في DB · اختبارات العزل |
| **S3 المال والإطلاق المقيد** | العهدة والتوريد · Escrow · Disputes · Settlement Job · G-03 Reverb · Rating | النزاع والتقييم · Reverb · تدريب المتاجر والسائق · Pilot مغلق بقائمة أرقام | 10 طلبات Pilot + كشف تسوية مطابق للنقد بفارق 0 ₪ · صفر حقل متجر في أي استجابة |

> **Contract-First:** لا ميزة React قبل تحديث `openapi.yaml` واعتماده، ولا endpoint «جاهز» قبل Feature Test ناجح. **خارج النطاق حتى الخروج من MVP1:** المفضلة · المراجعات · الكوبونات المتقدمة · التقارير · الشحن الجزئي · تعدد اللغات · الولاء.

### سجل المخاطر المحدّث

| الخطر | الاحتمال / الأثر | التخفيف | المؤشر |
|--|--|--|--|
| تأخر مزود SMS يمنع الإطلاق العام | عالٍ / عالٍ | Pilot مغلق بقائمة أرقام · التعاقد بالتوازي مع S1 | تاريخ توقيع العقد |
| فجوة نقدية لدى السائق | متوسط / عالٍ | سقف عهدة · توريد يومي · إيصالات · لا تحرير قبل التوريد | فرق التوريد = 0 ₪ |
| تأخر متجر يجمّد طلباً متعدد المتاجر | عالٍ / متوسط | مهلة 30 د + تصعيد + D-05 | حصص مقبولة خلال 30 د ≥ 90% |
| تسريب هوية المتجر | متوسط / عالٍ | اختبار آلي على الاستجابات والأحداث + أسماء صور عشوائية | صفر حوادث |
| نزاعات مستحضرات التجميل | متوسط / متوسط | سياسة معلنة قبل الشراء + فحص في النقطة + رفض عند الباب | النزاعات ≤ 3% |
| انحراف المنشور عن المختبر | متوسط / عالٍ | Git + بصمات SHA256 + Staging مطابق | تطابق manifest 100% |
| تكلفة التوصيل تتجاوز الإيراد | متوسط / متوسط | موجات مجمعة · توصيل مجاني فوق 200 ₪ فقط | تكلفة التوصيل لكل طلب |
