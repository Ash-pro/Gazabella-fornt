# المرحلة 4 — الولاء والمحتوى والمشاركة: عقد الـ API + برومت عاصم

الواجهة جاهزة وتعمل على الموقع الحي في وضع العرض. الأنواع المرجعية: `src/types/api.ts` (Order.items[].product_slug/reviewed · Guide · GuideBlock · SharedWishlist).
مفاتيح التفعيل على الإنتاج بعد جاهزية كل مسار: `VITE_GUIDES=true` · `VITE_WISHLIST_SHARE=true`.

## برومت عاصم (جاهز للنسخ)

```
أنت تعمل على Backend مشروع Gazabella (Laravel 12 · Filament v3 · Sanctum). المرجع: Docs/openapi.yaml و GAZABELLA_PLAYBOOK.
الواجهة نُفّذت للمرحلة 4 وتنتظر هذا العقد حرفياً. لكل بند: Migration + Policy + Resource + Filament + Feature Test،
وحدّث openapi.yaml. لا تعلن بنداً جاهزاً بدون مخرجات `php artisan test --compact`. قاعدة D-STORE سارية.

══════════════════════════════════════
P4-1 طلب التقييم بعد التسليم (يعتمد على P1-1)
══════════════════════════════════════
- في OrderResource (GET /orders و /orders/{order_number}) أضف لكل عنصر:
  "product_slug": "aurelia-brightening-serum"  ،  "reviewed": false
  reviewed = true إذا للمستخدمة مراجعة (أي حالة) على هذا المنتج.
- الواجهة تعرض «قيّمي مشترياتكِ» في الطلبات المُسلَّمة و«بانتظار تقييمكِ» في لوحة الحساب، وترسل إلى
  POST /products/{slug}/reviews (عقد المرحلة 1).
- Job بعد 3 أيام من delivered_at: رسالة واتساب/SMS واحدة «كيف كانت تجربتكِ؟» برابط /orders/{order_number}#reviews
  — يُرسل فقط لمن وافقت على الرسائل التسويقية، ومرة واحدة لكل طلب. حتى يجهز مزود الرسائل: قائمة في Filament.
اختبار: reviewed يتغير بعد إنشاء مراجعة · product_slug موجود · لا يظهر في طلبات غير المستخدمة.

══════════════════════════════════════
P4-2 أدلة الجمال (مقالات)
══════════════════════════════════════
جدول guides: id · slug (unique) · title · excerpt · tag · cover_path · reading_minutes · blocks (json) · status (draft/published)
· published_at · sort_order · timestamps — كل النصوص مترجمة ar/en.
blocks مصفوفة كتل منظمة (ممنوع HTML — الواجهة لا تعرض HTML من الخادم أبداً):
  { "type": "h2", "text": "..." }
  { "type": "p", "text": "..." }
  { "type": "tip", "text": "..." }
  { "type": "steps", "items": ["...", "..."] }
  { "type": "products", "title": "...", "category_slug": "skincare" }   (أو "product_slugs": ["..."])
GET /guides → { "data": [ { "slug", "title", "excerpt", "cover_url", "reading_minutes", "tag", "published_at" } ] }  (المنشورة فقط، الأحدث أولاً)
GET /guides/{slug} → { "data": { ...نفس الحقول, "blocks": [...] } }  (404 لغير المنشور)
- أضف الأدلة إلى GET /sitemap (type: "guide") ليفهرسها Google.
Filament: GuideResource بمحرر كتل (Builder) بأنواع الكتل الخمسة فقط، معاينة، جدولة النشر، وصورة غلاف 1600×1000.
بعد التنفيذ: أشرف يضبط VITE_GUIDES=true.

══════════════════════════════════════
P4-3 مشاركة المفضلة
══════════════════════════════════════
جدول wishlist_shares: id · user_id · token (32 حرفاً عشوائياً، unique) · revoked_at · views · timestamps.
POST /wishlist/share  (Bearer)  → 201 { "data": { "token": "x8f…" } }
  — يعيد نفس الرمز إن وُجد رمز فعّال للمستخدمة (رابط ثابت لقائمتها).
DELETE /wishlist/share  (Bearer) → 204 (إلغاء الرابط؛ الرابط القديم يصبح 404)
GET /wishlist/shared/{token}  (عام) →
{ "data": { "token": "x8f…", "owner_name": "سارة", "items": [ <ProductBrief> ... ], "created_at": "..." } }
- owner_name = الاسم الأول فقط. ممنوع رقم الجوال أو أي بيانات أخرى.
- items: المنتجات الحالية في مفضلتها (المنشورة فقط)، بحد أقصى 48.
- views++ عند كل GET (بدون تخزين IP).
- Rate limit على GET: 60/دقيقة لكل IP.
اختبار: رمز ملغى ← 404 · لا phone في JSON · المنتج المحذوف من المفضلة يختفي من الرابط.
بعد التنفيذ: أشرف يضبط VITE_WISHLIST_SHARE=true.
ملاحظة: معاينة الرابط في واتساب/فيسبوك تتولاها الواجهة (middleware) بعنوان «قائمة مفضلات مشتركة» — لا شيء مطلوب منك.

══════════════════════════════════════
صيغة الرد المطلوبة
══════════════════════════════════════
جدول: [البند | ما تم | الدليل | الحالة ✅/🔧/❓] + مخرجات php artisan test --compact
+ JSON فعلي لـ GET /guides/{slug} و GET /wishlist/shared/{token} و عنصر من GET /orders/{n}.
الأولوية: P4-3 ← P4-1 ← P4-2
```

## ما يعمل الآن بدون باك اند
- لوحة المشاركة الغنية على صفحات المنتج والأدلة (واتساب · تيليجرام · فيسبوك · ماسنجر · إكس · بنترست · سناب شات · البريد · SMS · ستوري · QR · نسخ الرابط · مشاركة الجهاز) مع UTM لكل قناة.
