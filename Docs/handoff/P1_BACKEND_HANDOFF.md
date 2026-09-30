# تسليم المرحلة P1 — الباك اند (عاصم)

> **المرجع الوحيد:** `Docs/GAZABELLA_PLAYBOOK.html` ← تبويب **P1** (الفجوات G-01…G-04 فيها الكود الكامل).
> **العقد الملزم:** `Docs/openapi.yaml` **v1.1.0** — Redocly: valid.
> هذا الملف ملخّص تنفيذي فقط؛ عند أي تعارض يُعتمد الـ Playbook.
> التاريخ: 27/09/2026 · فرع الواجهة: `chore/mvp0-closure`

---

## 1. وضع الواجهة الآن (منتهية وتنتظر الباك اند)

| ما بنته الواجهة | ما تنتظره منك | العقد |
|--|--|--|
| اختيار طريقة الدفع يُبنى من `checkout/begin.payment_methods` — عند غيابه تعرض **COD فقط** | إرجاع `payment_methods` + رفض `jawwal_pay` في الإنتاج | C-P1-01 |
| رسالة «تم تأكيد طلبكِ» لطلب COD | طلب COD يعود **`confirmed`** فور إنشائه، و`payment_status=unpaid` | C-P1-02 · G-01 |
| الاشتراك بـ `private-App.Models.User.{id}` مع Bearer على `{API_ORIGIN}/broadcasting/auth` | الحدث `order.status.updated` على هذه القناة + مصادقة `auth:sanctum` | C-P1-03 · G-03 |
| عرض «~~15 ₪~~ مجاني + شارة عرض تعويضي» | `delivery_fee` إلزامي دائماً + `delivery_fee_original` + `delivery_waiver` | C-P1-05 · D-22 |
| فاحص تسريب يفشل عند أي `store*` `vendor*` `merchant*` `sub_order*` `commission*` | ردود العميل بلا أي حقل متجر | D-12 · P1-QA-02 |

**تسمية كود التسليم المعتمدة:** `delivery_pin` (الواجهة تستخدمها أصلاً — مذكورة في `Order` بالعقد).

---

## 2. ترتيب التنفيذ (لا تغيّره — كل خطوة تعتمد على التي قبلها)

| # | البطاقة | المطلوب | تعريف الإنجاز |
|--|--|--|--|
| 1 | **P1-BE-01** | فرع `mvp0-closure` · فك `Docs/backend-mvp0-changes-2026-09-27.zip` · مطابقة SHA256 مع `backend-mvp0-manifest-2026-09-27.json` (سكربت PowerShell في G-04) | `manifest OK` · `php artisan test` ≥ 61 ✓ · PR مدموج |
| 2 | **P1-BE-03** | `OrderConfirmationService` + حدث `OrderConfirmed` + ربطه في `createOrder` (COD) و`PaymentService` + أمر `gazabella:confirm-pending-cod` | طلب COD ← `confirmed` · `confirm()` مرتين = سجل واحد |
| 3 | **P1-BE-04** | `config('gazabella.payments.enabled_methods')` · `Rule::in` · `payment_methods` في `checkout/begin` · حارس `payments/init` | production: `jawwal_pay` ← 422 `PAYMENT_METHOD_DISABLED` |
| 4 | **P1-BE-02** | Staging على MySQL · نسخة احتياطية قبل `migrate` · Cron `schedule:run` + `queue:work` | `schedule:list` غير فارغ · حجز متروك 16 د يتحرر |
| 5 | **P1-BE-05** | `OrderStatusChanged`: `PrivateChannel('App.Models.User.'.$order->user_id)` + `broadcastAs('order.status.updated')` + `broadcastWith` بأربعة حقول · `withBroadcasting([... 'auth:sanctum'])` · `channels.php` · CORS `broadcasting/auth` | مالك القناة 200 · غيره 403 · لا `store_id` في الحمولة |
| 6 | **P1-BE-06** | `stores.commission_rate` إلزامي بلا default · لا تفعيل متجر بدونه · snapshot في `sub_orders` | تفعيل متجر بلا نسبة يفشل |
| 7 | **P1-BE-08** | `delivery_fee_original` + `delivery_waiver` في quote والطلب · كوبون `free_delivery` تعويضي (مستخدم واحد · مرة واحدة · سبب إلزامي) | quote بكوبون تعويضي ← `0.00` + waiver · مستحق المتجر لا يتأثر |
| 8 | **P1-BE-07** | GitHub Actions على MySQL 8 + حماية `main` | PR باختبار مكسور ممنوع من الدمج |

> ⚠️ **ترتيب النشر:** الواجهة (`P1-FE-02`) يجب أن تكون على Staging **قبل** تفعيل خطوة 3، وإلا يفشل أي طلب قديم يرسل `jawwal_pay`. الواجهة جاهزة ومدموجة في فرعها.

---

## 3. ما يُرسل لأشرف عند الانتهاء (للإغلاق)

1. رابط Staging API (`https://…/api/v1`) + رابط `/admin`.
2. رقم عميل تجريبي + توكن Sanctum له (لفحص التسريب الليلي).
3. أسماء المتاجر الشريكة كما في قاعدة البيانات (لفاحص التسريب).
4. مخرجات: `php artisan test` · `php artisan schedule:list` · لقطة طلب COD بحالة `confirmed` في `/admin`.

أشرف بعدها يشغّل: السيناريوهات P1-S1…S4 على Staging + `npm run scan:leaks -- --base <STAGING>/api/v1 --token <…>` ← إغلاق بوابة P1.

---

## 4. قرارات تحتاج ردّك

| # | السؤال | الخيارات |
|--|--|--|
| Q1 | **`sku` في `ProductVariantBrief`:** هل هو SKU المتجر؟ | إن كان كذلك ← يُحذف من ردود العميل أو يُستبدل بـ SKU من Gazabella (D-12) |
| Q2 | **قيم `payment_status`:** الحالية `unpaid/completed` والعقد يقبلها | نثبّتها كما هي (مقترح) أو نوحّدها إلى `pending/paid` بقرار مشترك |
| Q3 | **الاستضافة:** مشتركة (cPanel) مؤقتاً أم VPS مباشرة؟ | المشترك يكفي P1–P2؛ Reverb يحتاج VPS في P3 |

---

## 5. ممنوع

- بناء أي API لبوابة المتجر أو السائق (`/portal/*` · `/api/v1/store/*`) — اللوحات Filament.
- تغيير `openapi.yaml` بدون عقد C-xx معتمد من أشرف.
- إعلان endpoint جاهز قبل Feature Test ناجح.
