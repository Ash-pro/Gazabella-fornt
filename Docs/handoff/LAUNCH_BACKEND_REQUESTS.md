# طلبات الإطلاق للباك اند — عاصم

> **من:** أشرف (الواجهة) · **التاريخ:** 30/09/2026 · **فرع الواجهة:** `chore/mvp0-closure` (commits `74d298f` · `2926883`)
> **يكمّل:** `Docs/handoff/P1_BACKEND_HANDOFF.md` — مهام P1-BE-01…08 **ما زالت الأولوية الأولى** ولم تتغير.
> **المرجع:** `Docs/GAZABELLA_PLAYBOOK.html` · العقد `Docs/openapi.yaml`. أي endpoint جديد هنا يُضاف للعقد بعد موافقتك على الشكل.

---

## 0. الخلاصة في 30 ثانية

الواجهة صارت جاهزة للإطلاق من ناحية **الثقة والقانون والقياس**: صفحات سياسات، دعم واتساب، موافقة الموقع، SEO ومعاينات روابط، مراقبة أخطاء، وتحليلات بدون بيانات شخصية.
حالياً كثير من القيم التشغيلية (رسوم التوصيل، المناطق، رقم الواتساب، مدة الاسترجاع) **مكتوبة في الواجهة مؤقتاً** في `src/content/storeInfo.ts`.
**المطلوب منك:** نقل هذه القيم للباك اند (مصدر واحد تديره الإدارة من Filament)، وتعديلات صغيرة على 4 endpoints موجودة، و3 endpoints جديدة، وتقوية إعدادات الإنتاج.

| الأولوية | البنود | متى |
|--|--|--|
| 🔴 **P0 — قبل الإطلاق** | B-01 · B-02 · B-03 · B-06 · B-07 · B-08 | بعد P1-BE-01 مباشرة |
| 🟠 **P1 — أسبوع الإطلاق** | B-04 · B-05 · B-09 · B-11 | بالتوازي مع الـ Pilot |
| 🟢 **لاحقاً** | B-10 · B-12 | P2–P3 |

---

## 1. ما أنجزته الواجهة (للاطلاع)

| # | الميزة | ماذا يعني للباك اند |
|--|--|--|
| 1 | صفحات `/privacy` `/terms` `/delivery-info` `/returns` | النصوص **تَعِد** الزبونة بأشياء يجب أن ينفذها النظام (انظر B-03، B-06، B-10، B-11) |
| 2 | `/contact` `/faq` + زر واتساب عائم برسالة جاهزة (فيها رقم الطلب إن وُجد) | يقرأ الرقم من `GET /settings` ← `social.whatsapp` (B-01) |
| 3 | حوار شرح قبل طلب إذن الموقع في الملف الشخصي | مرتبط بشرط `latitude/longitude` الإلزامي (B-03) |
| 4 | ترويسات أمان على Vercel: CSP · HSTS · X-Frame-Options · Permissions-Policy | الـ API **يجب** أن يكون `https` (و`wss` لـ Reverb) وإلا المتصفح يحجبه (B-07) |
| 5 | إخفاء `/merchant` `/delivery` في الإنتاج · إخراج `.env` من Git | لا شيء |
| 8 | عنوان ووصف لكل صفحة + JSON-LD للمنتج + `middleware.ts` يولّد معاينات واتساب/فيسبوك للمنتج | الـ middleware يستدعي `GET /products/{slug}` من خادم Vercel (B-08) · sitemap (B-09) |
| 10 | Sentry (كسول، ينظّف الهاتف والتوكن) + تسجيل كل رد 5xx من الـ API | نحتاج `X-Request-Id` لربط خطأ الواجهة بسجل Laravel (B-07) |
| 11 | Analytics بأحداث GA4 Ecommerce (view_item · add_to_cart · begin_checkout · purchase …) بدون أي بيانات شخصية | حدث `purchase` يحتاج `product_id` في عناصر الطلب (B-04) |

---

## 2. المطلوب من الباك اند — بالتفصيل

### 🔴 B-01 · توسيع `GET /api/v1/settings` — قيم المتجر التشغيلية

**لماذا:** رقم الواتساب وساعات الدعم وقيم السياسات يجب أن تتغير من Filament بدون build جديد للواجهة.
**الحالي:** يرجع `site_name · tagline · support_phone · support_email · address · social`.
**المطلوب إضافته** (كل الحقول الجديدة nullable؛ الواجهة عندها قيم احتياطية):

```json
{
  "data": {
    "site_name": "Gazabella",
    "support_phone": "0599XXXXXX",
    "support_email": "hello@gazabella.ps",
    "address": "خان يونس",
    "social": {
      "whatsapp": "970599XXXXXX",
      "instagram": "https://instagram.com/gazabella"
    },
    "support": {
      "hours": "يومياً من 10:00 صباحاً حتى 8:00 مساءً",
      "response_time": "خلال ساعة في أوقات الدوام"
    },
    "policies": {
      "updated_at": "2026-09-30",
      "acceptance_window_minutes": 30,
      "return_window_days": 3,
      "damage_report_hours": 24,
      "data_retention_months": 24,
      "free_delivery_threshold": null
    }
  }
}
```

**قواعد:**
- `social.whatsapp`: أرقام فقط بصيغة دولية (`970…`). الواجهة تقبل أيضاً `0599…` أو رابط `wa.me/…` وتحوّله، لكن خزّنه دولياً.
- كل القيم تُدار من صفحة Settings في Filament (admin فقط).
- الاستجابة مخزّنة مؤقتاً (cache) وتُمسح عند الحفظ، كما في `/home`.

**تعريف الإنجاز:** تعديل الرقم من Filament ← يظهر في زر الواتساب والفوتر وصفحة التواصل خلال دقائق، بدون نشر الواجهة.

**من جهتي:** `social.whatsapp` مربوط الآن. `support` و `policies` أربطها فور جاهزيتها، والقيم في `storeInfo.ts` تبقى احتياطاً عند غياب أي حقل.

---

### 🔴 B-02 · مناطق التوصيل ورسومها — مصدر واحد

**لماذا:** صفحة `/delivery-info` تعرض جدول مناطق ورسوم. هذه **نفس** الرسوم التي يحسبها checkout (D-22). لو اختلفتا، الزبونة ترى رقماً في السياسة ورقماً آخر في الفاتورة.
**المطلوب:** `GET /api/v1/delivery-zones` (عام، بلا auth، مخزّن مؤقتاً):

```json
{
  "data": [
    { "id": 1, "name": "خان يونس — المدينة", "fee": "10.00", "eta": "في نفس اليوم للطلبات المؤكدة قبل 4 مساءً", "sort_order": 1, "is_active": true },
    { "id": 2, "name": "خان يونس — المناطق الشرقية والغربية", "fee": "15.00", "eta": "خلال 24 ساعة", "sort_order": 2, "is_active": true }
  ]
}
```

**قواعد:**
- `fee` بصيغة string عشرية (مثل باقي المبالغ في العقد).
- **checkout/quote يحسب الرسوم من نفس الجدول**. هذا شرط، مش اقتراح.
- إن كانت عندك `delivery_options` في `checkout/begin` (عقد mvp0)، اربطها بنفس الجدول بدل تكرار البيانات.
- Filament: Resource لإدارة المناطق (admin).

**تعريف الإنجاز:** تغيير رسوم منطقة من Filament ← يتغير في `/delivery-zones` وفي quote الطلب معاً (اختبار Feature واحد يثبت التطابق).

**من جهتي:** صفحة `/delivery-info` وسؤال الرسوم في FAQ يقرآن من هذا الـ endpoint بعد جاهزيته.

---

### 🔴 B-03 · `PATCH /api/v1/auth/me` — جعل `latitude/longitude` اختيارية

**لماذا:** الحالي يرفض أي تحديث للملف (حتى تغيير الاسم) بدون إحداثيات. سياسة الخصوصية تقول إن الزبونة تستطيع رفض الموقع وتكمل عادي. الشرط الحالي يناقض ذلك، ويرفع نسبة الفشل (أجهزة بدون GPS، رفض الإذن، انتهاء المهلة).

**المطلوب:**
```
latitude   nullable|numeric|between:-90,90   required_with:longitude
longitude  nullable|numeric|between:-180,180 required_with:latitude
```
- إن أُرسلت: تُخزن كما هي مع `location_captured_at`.
- إن لم تُرسل: لا تُمسح القيم القديمة.
- **الخصوصية:** الإحداثيات تظهر للسائق فقط بعد `shipped` (نفس قاعدة بيانات المستلم)، ولا تظهر للمتجر أبداً.

**تعريف الإنجاز:** `PATCH /auth/me {"name":"سارة"}` ← 200. و`{"latitude":31.34}` بدون longitude ← 422.

---

### 🔴 B-06 · `GET /orders/lookup-by-reference` — تقليص البيانات

**لماذا:** endpoint بدون تسجيل دخول. لو رجّع الاسم والهاتف والعنوان، أي شخص يخمّن مرجع دفع يرى بيانات زبونة.
**المطلوب (أحد الخيارين، والأول مفضّل):**
1. شرط إضافي: `?reference=…&phone_last4=3456`، ولا يطابق إلا لو تطابقت آخر 4 أرقام.
2. أو استجابة مختصرة فقط: `order_number · status · payment_status · total · delivery_fee · items[] (name, qty) · created_at` — **بدون** `name/phone/address/delivery_pin/notes`.

**وفي الحالتين:** `throttle:10,1` لكل IP.
**تعريف الإنجاز:** فحص التسريب (`npm run scan:leaks`) + اختبار Feature: 11 طلب بالدقيقة ← 429.

---

### 🔴 B-07 · تقوية إعدادات الإنتاج

| البند | المطلوب | لماذا |
|--|--|--|
| HTTPS | الـ API و Storage و Reverb على `https://` / `wss://` فقط | CSP في الواجهة تحجب أي `http` |
| CORS | `allowed_origins`: `https://gazabella.ps` · `https://www.gazabella.ps` · `https://staging.gazabella.ps` + `allowed_origins_patterns`: `#^https://gazabella-front-.*\.vercel\.app$#` (معاينات Vercel — يُعدّل حسب اسم المشروع على Vercel) | بدونها المتصفح يرفض الطلبات |
| CORS headers | `exposed_headers`: `X-Cart-Token`, `X-Request-Id` | الواجهة تقرأ `X-Cart-Token` للسلة؛ `X-Request-Id` لربط Sentry |
| `X-Request-Id` | middleware يولّد UUID لكل طلب، يضيفه للـ response ولسياق `Log` | خطأ 5xx في Sentry ← نبحث بنفس الـ ID في `laravel.log` |
| OTP | `test_mode` **مطفأ** في الإنتاج (لا `123456`) · صلاحية الكود ≤ **10 دقائق** · حد إرسال (3 بالـ 10 دقائق للرقم) | سياسة الخصوصية تقول «رموز مؤقتة تنتهي خلال دقائق» |
| `APP_URL` | يساوي الدومين الحقيقي، **ليس** `localhost` | روابط الصور في الردود تُستخدم في معاينات واتساب (B-08) |
| رسائل الخطأ | `APP_DEBUG=false` · لا stack traces في ردود JSON | تسريب معلومات |

**تعريف الإنجاز:** `curl -I` لأي endpoint يُظهر `X-Request-Id` · OTP `123456` يُرفض في Staging · طلب من دومين غير مسموح يُرفض.

---

### 🔴 B-08 · `GET /products/{slug}` — جاهز لمعاينات الروابط

**لماذا:** عندما تُشارك زبونة رابط منتج على واتساب، `middleware.ts` على Vercel يستدعي هذا الـ endpoint **من خادم Vercel** (بدون توكن ولا cart token) ليبني المعاينة (اسم · وصف · صورة · سعر).
**تأكد من:**
- يعمل بدون أي ترويسة auth أو `X-Cart-Token` ← 200.
- يرد خلال < 1 ثانية (الـ middleware ينتظر 2.5 ث كحد أقصى ثم يعرض معاينة عامة).
- `images[].url` **مطلق** و https، وليس `localhost`.
- `description` نص (HTML بسيط مقبول، الواجهة تنظفه).
- rate limit لا يحجب IPs خوادم Vercel (العدد قليل؛ الاستجابة مخزنة 10 دقائق على Vercel).
- `Accept-Language: ar` يرجع الاسم والوصف بالعربي.

**تعريف الإنجاز:** `curl -H "Accept-Language: ar" https://API/api/v1/products/{slug}` بدون ترويسات ← 200 بصورة https.

---

### 🟠 B-04 · عناصر الطلب: `product_id` و `product_slug`

**لماذا:** حدث `purchase` في Analytics يربط المبيعات بالمنتج. `items[]` في الطلب ليس فيها معرّف المنتج (السلة فيها).
**المطلوب** في كل رد يحمل Order (`/checkout` · `/orders` · `/orders/{id}` · `POST /orders`):

```json
"items": [
  { "id": 91, "product_id": 12, "product_slug": "rose-serum", "product_name": "سيروم الورد", "variant_name": "30 مل", "unit_price": "39.50", "quantity": 2, "subtotal": "79.00", "image_url": "https://…" }
]
```
⚠️ `product_id` هو معرّف منتج **Gazabella** وليس SKU المتجر (D-12).

---

### 🟠 B-05 · تسجيل الموافقة على الشروط

**لماذا:** الواجهة تعرض «بالمتابعة توافقين على الشروط والخصوصية والاسترجاع» عند الدخول وعند الطلب. قانونياً نحتاج دليلاً على **أي نسخة** وافقت عليها الزبونة ومتى.
**المطلوب:**
- حقل اختياري `terms_version` (string، مثل `"2026-09-30"`) في `POST /auth/otp/verify` و `POST /checkout` (و`POST /orders` في mvp0).
- التخزين: `users.terms_version` + `users.terms_accepted_at` (تُحدَّث عند كل قيمة أحدث)، و`orders.terms_version` snapshot.
- قيمة `policies.updated_at` من B-01 هي النسخة الحالية.

**من جهتي:** الواجهة سترسل الحقل فور موافقتك على الاسم.

---

### 🟠 B-09 · `GET /api/v1/sitemap` — لخريطة الموقع

**لماذا:** البند 9 (robots.txt + sitemap.xml). Vercel سيولّد `sitemap.xml` ديناميكياً من هذا الـ endpoint.
```json
{
  "data": {
    "products":   [{ "slug": "rose-serum", "updated_at": "2026-09-29T10:00:00Z", "image": "https://…/1.webp" }],
    "categories": [{ "slug": "skincare",   "updated_at": "2026-09-20T08:00:00Z" }]
  }
}
```
- المنتجات النشطة والمتوفرة فقط، بلا ترقيم صفحات (العدد صغير)، cache ساعة.

---

### 🟠 B-11 · Filament — عمليات تعِد بها السياسات

السياسات المنشورة تعِد الزبونة بهذه العمليات. يجب أن يقدر فريق التشغيل على تنفيذها من Filament:

| الوعد في السياسة | المطلوب في Filament | ملاحظات |
|--|--|--|
| «إلغاء مجاني قبل خروج الطلب للتوصيل» | Action **إلغاء الطلب** (admin) متاح فقط قبل `shipped` · سبب إلزامي · يعيد المخزون · يسجل في `tracking` | الحالة للزبونة: `cancelled` |
| «استبدال أو استرداد كامل مع رسوم التوصيل للتالف/الخاطئ» | Action **تسجيل استرجاع**: نوع (تالف/خاطئ/منتهي/تغيير رأي) · المبلغ · مع/بدون رسوم التوصيل · صورة | `payment_status → refunded` عند الاسترداد الكامل |
| «عرض تعويضي: توصيل مجاني» | كوبون `free_delivery` لزبونة واحدة، مرة واحدة، سبب إلزامي | هو نفسه **P1-BE-08** |
| «تكرار رفض الطلب قد يوقف COD» | حقل `users.cod_blocked` + Action من صفحة الزبونة | checkout يرجع 422 `COD_BLOCKED` إن كان مفعّلاً |
| «نرد على طلب حذف البيانات خلال 14 يوماً» | Action **إخفاء هوية الزبونة** (مؤقتاً يدوي؛ انظر B-10) | |

---

### 🟢 B-10 · حقوق البيانات (P2)

- `DELETE /api/v1/auth/me`: يلغي كل التوكنات، ويخفي الهوية (الاسم ← «زبونة محذوفة»، الهاتف ← hash، العنوان والإحداثيات ← null). **سجلات الطلبات تبقى** للمحاسبة بدون بيانات تعريفية.
- `GET /api/v1/auth/me/export`: JSON بالملف الشخصي والطلبات.
- حتى ذلك الحين: تُنفّذ يدوياً عبر Action في B-11.

### 🟢 B-12 · مدة الاحتفاظ (P3)

- Job شهري: الطلبات الأقدم من `policies.data_retention_months` ← إخفاء الاسم والهاتف والعنوان والإحداثيات، مع إبقاء المبالغ والمنتجات.

---

## 3. للتذكير — مهام P1 المعلقة (من `P1_BACKEND_HANDOFF.md`)

الـ tunnel الحالي (`intelligence-maritime-smith-sao.trycloudflare.com`) يعمل على **العقد القديم legacy**. لم يظهر فيه أي من:

| البطاقة | الحالة |
|--|--|
| **P1-BE-01** فك حزمة `backend-mvp0-changes-2026-09-27.zip` | ❌ **ابدأ بها** — كل ما بعدها يعتمد عليها |
| P1-BE-03 COD ← `confirmed` (G-01) | ❌ |
| P1-BE-04 حارس طرق الدفع (G-02) | ❌ `jawwal_pay` ما زال مقبولاً |
| P1-BE-05 Reverb + `broadcasting/auth` (G-03) | ❌ |
| P1-BE-02 Staging ثابت + Cron (G-04) | ⚠️ رابط الـ tunnel مؤقت، ولا يصلح لـ Vercel و CI |
| P1-BE-06 · 07 · 08 | ❌ |

**وأسئلة مفتوحة تحتاج جوابك:**
- Q1: `sku`: هل هو SKU المتجر؟
- Q2: قيم `payment_status`.
- Q3: الاستضافة (مشتركة أم VPS).

---

## 4. ترتيب العمل المقترح

```
P1-BE-01 → B-07 (إعدادات الإنتاج) → P1-BE-03 → P1-BE-04 → B-01 + B-02 → B-03 → B-06 → B-08 (تحقق فقط)
        → P1-BE-02 (Staging) → P1-BE-05 → P1-BE-06 → P1-BE-08 + B-11 → B-04 → B-05 → B-09 → P1-BE-07
```

## 5. ما أحتاجه منك للإغلاق (دليل لكل بند)

- رابط **Staging ثابت** (دومين، مش tunnel) + توكن زبونة تجريبية + أسماء المتاجر الشريكة (لفحص التسريب).
- لكل بند B-xx: اسم اختبار Feature ناجح، أو `curl` مع الرد.
- `php artisan route:list --path=api/v1` بعد التنفيذ.
- تحديث Swagger مع **أمثلة responses** (الحالي بدون schemas، فلا أستطيع التحقق من الحقول).

## 6. ممنوع (تذكير بالقواعد الثابتة)

- أي حقل متجر في ردود العميل: `store_*` `vendor_*` `merchant_*` `commission_*` `sub_orders` (D-12).
- `delivery_pin` في أي رد غير رد صاحبة الطلب نفسها.
- REST API للوحات. الإدارة والمتجر والسائق في Filament فقط.
- تغيير اسم حقل موجود في العقد بدون تنسيق. الإضافة مسموحة، التغيير لا.
