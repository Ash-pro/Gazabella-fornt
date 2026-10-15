# ملاحظات أمنية — الواجهة (Gazabella-Front)

آخر تحديث: 15-10-2026

## قرارات معتمدة

### S-01 — توكن الدخول في localStorage (مخاطرة مقبولة مؤقتاً)
- التوكن (Sanctum Bearer) محفوظ في `localStorage` عبر `authStore`. أي XSS يستطيع قراءته.
- **التخفيف الحالي:** CSP مشددة (لا سكربتات خارجية إلا Plausible/GTM، و`connect-src` محصور بنطاقاتنا) + لا `dangerouslySetInnerHTML` في الكود.
- **مطلوب من الباك اند:** `SANCTUM_EXPIRATION` ≤ 30 يوماً (43200 دقيقة) وإلغاء التوكن عند `/auth/logout`.
- **بعد الإطلاق:** الانتقال إلى Sanctum SPA (HttpOnly cookie) عند توحيد النطاق (`gazabella.ps` + `api.gazabella.ps`).

### S-02 — صيانة CSP عند تغيير النطاقات
`vercel.json` ← `connect-src` يسمح فقط بـ:
- `gazabella-development-kvxf3t.laravel.cloud` (الـ API الحالي)
- `*.gazabella.ps` (https + wss — الـ API والـ Staging وReverb مستقبلاً)
- Sentry ingest · Plausible · Google Analytics

**عند نقل الـ API أو Reverb لنطاق خارج `*.gazabella.ps` يجب تحديث `connect-src`، وإلا ستفشل كل الطلبات.**
استضافة Plausible ذاتياً (`VITE_PLAUSIBLE_SRC`) تتطلب إضافة نطاقها إلى `script-src` و`connect-src`.

### S-03 — تسجيل الخروج
مصدر واحد: `src/lib/session.ts → clearLocalSession()`. يُستدعى دائماً حتى لو فشل `POST /auth/logout`،
ويمسح: الجلسة · كاش الاستعلامات · cart token · guest UUID · مفتاح الطلب · بيانات الطلب الأخير والتتبع.

### S-04 — منع تكرار الطلب (BE-04)
`src/lib/checkoutAttempt.ts`: مفتاح `Idempotency-Key` لكل نية شراء، مربوط ببصمة (الحمولة + محتوى السلة).
إعادة المحاولة بعد انقطاع/مهلة/5xx تستخدم نفس المفتاح فلا يتكرر الطلب. يُمسح عند النجاح أو الرفض النهائي.
