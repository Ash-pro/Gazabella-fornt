# المرحلة 2 — السلة والدفع: عقد الـ API + برومت عاصم

الواجهة جاهزة وتعمل في وضع العرض (`VITE_DEMO_FIXTURES=true`). الأنواع المرجعية: `src/types/api.ts` (Cart · CartCoupon · CustomerAddress).
مفاتيح التفعيل على الإنتاج بعد جاهزية كل مسار: `VITE_COUPONS=true` · `VITE_ADDRESS_BOOK=true`.

## برومت عاصم (جاهز للنسخ)

```
أنت تعمل على Backend مشروع Gazabella (Laravel 12 · Filament v3 · Sanctum). المرجع: Docs/openapi.yaml و GAZABELLA_PLAYBOOK.
الواجهة نُفّذت للمرحلة 2 (السلة والدفع) وتنتظر هذا العقد حرفياً. لكل بند: Migration + Model + Policy + Controller/Resource
+ Filament + Feature Test، وحدّث openapi.yaml. لا تعلن بنداً جاهزاً بدون مخرجات `php artisan test --compact`.
الأخطاء بشكل موحد: { "error": { "code": "...", "message": "...", "details"?: {} } }. قاعدة D-STORE سارية.

══════════════════════════════════════
P2-1 التوصيل المجاني (موجود جزئياً)
══════════════════════════════════════
- policies.free_delivery_threshold في GET /settings: رقم بالشيكل أو null لتعطيله. يُضبط من Filament (إعدادات المتجر).
- المقارنة على قيمة المنتجات قبل خصم الكوبون (subtotal) — نفس ما تعرضه الواجهة. وثّق ذلك في openapi.
- حساب رسوم التوصيل النهائي على الخادم فقط (الواجهة تعرض تقديراً).
اختبار: طلب بقيمة ≥ الحد ← delivery_fee = 0 · أقل ← رسوم المنطقة.

══════════════════════════════════════
P2-2 الكوبونات
══════════════════════════════════════
جدول coupons: id · code (unique, uppercase) · type enum(percent, fixed) · value · min_subtotal (nullable)
· max_discount (nullable, للنسبة) · starts_at · ends_at · usage_limit (nullable) · per_user_limit (default 1)
· used_count · is_active · timestamps. وجدول coupon_redemptions: coupon_id · user_id (nullable) · phone · order_id · discount.

POST /cart/coupon   (ضيف بـ X-Cart-Token أو مسجلة بـ Bearer)   body: { "code": "GAZA10" }
→ 200 { "data": <Cart> }  حيث Cart يحتوي الآن:
  "coupon": { "code": "GAZA10", "discount": 12.50, "description": "خصم 10% على المنتجات" },
  "discount": 12.50,
  "total": 112.50          ← subtotal − discount (قبل التوصيل)
DELETE /cart/coupon → 200 { "data": <Cart> } بدون كوبون.
GET /cart يعيد coupon/discount/total دائماً (null عند عدم وجود كوبون) — وكذلك ردود PATCH/DELETE على عناصر السلة.
إعادة الحساب تلقائياً عند تغيّر السلة؛ وإن لم يعد الشرط متحققاً (min_subtotal) يُزال الكوبون ويعاد coupon=null.
أخطاء 422:
- COUPON_INVALID (غير موجود/غير مفعّل/لم يبدأ)
- COUPON_EXPIRED
- COUPON_MIN_SUBTOTAL مع details.min_subtotal
- COUPON_USAGE_LIMIT (تجاوز الحد العام أو حد المستخدم/الرقم)
عند POST /checkout: يُطبَّق كوبون السلة (والواجهة ترسل coupon_code أيضاً للتوافق) ويُعاد التحقق داخل نفس الـ transaction،
ويُسجَّل redemption ويزيد used_count. الطلب يحفظ discount و coupon_code.
Rate limit على POST /cart/coupon: 10/دقيقة (منع تخمين الأكواد).
Filament: CouponResource (إنشاء · تفعيل/إيقاف · نسخ الكود · عدد مرات الاستخدام · تقرير الخصومات).
اختبارات: نسبة · مبلغ ثابت · max_discount · انتهاء · حد أدنى · حد استخدام لكل رقم · إزالة تلقائية عند نقص السلة · الطلب يحفظ الخصم.

══════════════════════════════════════
P2-3 «أضيفي معه»
══════════════════════════════════════
GET /cart/suggestions?limit=6  (ضيف أو مسجلة)
→ 200 { "data": [ <ProductBrief> ... ] }
المنطق بالترتيب: منتجات «تُشترى معاً» مع عناصر السلة (من order_items المؤكدة) ← نفس أقسام عناصر السلة ← المميّزة.
استبعد ما في السلة وغير المتوفر. حتى يجهز المسار: الواجهة تعرض المميّزة المتوفرة تلقائياً (بدون بيانات تجريبية).

══════════════════════════════════════
P2-4 دفتر العناوين (Bearer مطلوب)
══════════════════════════════════════
جدول customer_addresses: id · user_id · label (≤30) · recipient_name · phone · city (اسم منطقة توصيل فعّالة)
· neighborhood · street · is_default · timestamps. حد أقصى 10 عناوين لكل مستخدمة.
GET    /addresses            → { "data": [ { "id", "label", "recipient_name", "phone", "city", "neighborhood", "street", "is_default" } ] }
POST   /addresses            → 201 { "data": <Address> }
PATCH  /addresses/{id}       → 200 { "data": <Address> }
DELETE /addresses/{id}       → 204
- عنوان واحد افتراضي دائماً: أول عنوان يصبح افتراضياً، وتعيين افتراضي جديد يلغي السابق، وحذف الافتراضي ينقله لأقدم عنوان.
- Policy: كل مستخدمة ترى وتعدّل عناوينها فقط (اختبار IDOR: عنوان مستخدمة أخرى ← 404).
- city يجب أن تطابق منطقة توصيل فعّالة (422 وإلا). phone بنفس تحقق الدفع.
- لا يُعرض في Filament إلا للمشرف العام، ولا يُصدَّر.
بعد التنفيذ: أشرف يضبط VITE_ADDRESS_BOOK=true و VITE_COUPONS=true في Vercel.

══════════════════════════════════════
صيغة الرد المطلوبة
══════════════════════════════════════
جدول: [البند | ما تم | الدليل | الحالة ✅/🔧/❓] + مخرجات php artisan test --compact + مثال JSON فعلي لـ GET /cart بكوبون و GET /addresses.
الأولوية: P2-2 ← P2-4 ← P2-1 ← P2-3
```
