# المرحلة 1 — صفحة المنتج: عقد الـ API + برومت عاصم

الواجهة جاهزة وتعمل في وضع العرض (`VITE_DEMO_FIXTURES=true`). عند تنفيذ هذا العقد تُستبدل البيانات التجريبية تلقائياً.
الأنواع المرجعية في الواجهة: `src/types/api.ts` (ProductReview · ReviewSummary · ReviewsPage · ProductSpec · ProductVariant).

## برومت عاصم (جاهز للنسخ)

```
أنت تعمل على Backend مشروع Gazabella (Laravel 12 · Filament v3 · Sanctum). المرجع: Docs/openapi.yaml و GAZABELLA_PLAYBOOK.
الواجهة نُفّذت للمرحلة 1 من صفحة المنتج وتنتظر هذا العقد حرفياً. لكل بند: Migration + Model + Policy + Controller/Resource
+ Filament Resource + Feature Test، وحدّث openapi.yaml. لا تعلن بنداً جاهزاً بدون مخرجات `php artisan test --compact`.
قاعدة D-STORE سارية: لا store/vendor/sub_order في أي رد عام.

══════════════════════════════════════
P1-1 التقييمات والمراجعات
══════════════════════════════════════
جدول product_reviews: id · product_id · user_id · order_item_id (nullable, unique مع user_id+product_id) · variant_id (nullable)
· rating (1–5) · title (≤80, nullable) · body (10–1000) · status enum(pending, published, rejected) default pending
· rejection_reason (nullable) · published_at · timestamps. وجدول review_photos: id · review_id · path · sort_order.
على products: rating_avg decimal(2,1) nullable · rating_count unsigned int default 0 — يُعاد حسابهما عند نشر/رفض/حذف مراجعة
(Observer) من المراجعات المنشورة فقط.

GET /products/{slug}/reviews?page=1&per_page=6&rating=5   (عام، بدون مصادقة)
→ 200
{
  "data": [ { "id": 1, "rating": 5, "title": "أفضل من توقعاتي", "body": "…", "author_name": "سارة م.",
              "created_at": "2026-10-01T10:00:00Z", "verified_purchase": true,
              "photos": ["https://…/reviews/abc.jpg"], "variant_name": null } ],
  "meta": { "current_page": 1, "last_page": 3, "total": 14 },
  "summary": { "average": 4.6, "count": 14, "distribution": { "1": 0, "2": 0, "3": 1, "4": 4, "5": 9 } }
}
- المنشورة فقط. author_name = الاسم الأول + أول حرف من اسم العائلة + نقطة (لا رقم جوال ولا اسم كامل).
- verified_purchase = true إذا مربوطة بـ order_item لطلب delivered.
- summary يُحسب على كل المنشورة (لا يتأثر بفلتر rating)، و meta.total يتأثر بالفلتر.
- الصور بأسماء UUID على التخزين العام، بعد إزالة بيانات EXIF (الموقع) — Intervention Image.

POST /products/{slug}/reviews   (Bearer مطلوب · multipart/form-data)
حقول: rating (required 1–5) · title (nullable ≤80) · body (required 10–1000) · variant_id (nullable) · photos[] (≤3، صور ≤5MB، jpg/png/webp)
→ 201 { "data": { "status": "pending" } }
أخطاء بشكل موحد { "error": { "code", "message" } }:
- 401 بدون توكن
- 403 NOT_PURCHASED: لا يوجد طلب delivered يحتوي المنتج لهذا المستخدم
- 409 ALREADY_REVIEWED: مراجعة سابقة لنفس المنتج
- 422 للتحقق
- Rate limit: 5 مراجعات/ساعة للمستخدم.

على رد المنتج (/products و /products/{slug} و /related): rating_avg و rating_count.

Filament: ReviewResource في /admin — قائمة بفلتر الحالة، معاينة الصور، أزرار «نشر» و«رفض» (مع سبب)، Bulk publish،
وعدّاد «مراجعات بانتظار الموافقة» في القائمة الجانبية (badge).
اختبارات: النشر يحدّث rating_avg/rating_count · غير المشترية ← 403 · مراجعة ثانية ← 409 · pending لا تظهر في GET ·
لا رقم جوال في JSON · EXIF يُزال.

══════════════════════════════════════
P1-2 المتغيرات كأزرار (اختياري الآن — مع عقد mvp0)
══════════════════════════════════════
على product_variants: swatch_hex (nullable, regex ^#[0-9A-Fa-f]{6}$) · image_url (nullable).
تُرجع داخل variants[] في رد المنتج. Filament: ColorPicker + رفع صورة داخل Repeater المتغيرات.

══════════════════════════════════════
P1-4 «نبّهيني لما يتوفر»
══════════════════════════════════════
جدول stock_alerts: id · product_id · variant_id (nullable) · phone (E.164 +9705XXXXXXXX) · user_id (nullable)
· notified_at (nullable) · timestamps · unique(product_id, variant_id, phone).
POST /products/{slug}/stock-alerts   (عام · Bearer اختياري)
body: { "phone": "+970599123456", "variant_id": 12 }
→ 201 { "data": { "subscribed": true } }   (وتكرار نفس الرقم ← 200 بنفس الرد، بدون خطأ)
- 422 لرقم غير فلسطيني (059/056) أو منتج متوفر أصلاً (STOCK_AVAILABLE).
- Rate limit: 5/ساعة لكل IP و3/يوم لكل رقم.
- عند عودة stock من 0 إلى > 0 (Observer على المخزون): Job يرسل رسالة واتساب/SMS واحدة لكل مشترك ثم notified_at
  — وإلى أن يجهز مزود الرسائل: قائمة «بانتظار الإشعار» في Filament مع زر «تم الإشعار» وتصدير CSV.
- Filament: StockAlertResource (فلترة بالمنتج، عدد المنتظرين لكل منتج — مؤشر طلب حقيقي للتوريد).
بعد التنفيذ: أشرف يضبط VITE_STOCK_ALERTS=true في Vercel.

══════════════════════════════════════
P1-5 تبويبات المعلومات
══════════════════════════════════════
على products: ingredients (text, nullable, مترجم ar/en) · how_to_use (text, nullable, مترجم) ·
specs (json nullable: [{ "label": "الحجم", "value": "30 مل" }], مترجم label/value).
تُرجع في GET /products/{slug} فقط (ليس في القوائم).
Filament: تبويب «معلومات إضافية» في نموذج المنتج: Textarea للمكونات وطريقة الاستخدام + Repeater (label/value) للتفاصيل.

══════════════════════════════════════
صيغة الرد المطلوبة
══════════════════════════════════════
جدول: [البند | ما تم | الدليل: ملف:سطر أو اسم الاختبار | الحالة ✅/🔧/❓]
+ مخرجات php artisan test --compact + مثال JSON فعلي لكل GET جديد.
الأولوية: P1-1 ← P1-5 ← P1-4 ← P1-2
```

## ما لا يحتاج باك اند
- **P1-3 «باقي X قطع»:** يعمل الآن من `stock` الحقيقي (≤ 5).
- **P1-6 المشاركة:** يعمل الآن.
