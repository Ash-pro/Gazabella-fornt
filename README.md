# Gazabella Frontend

واجهة React/TypeScript/Vite. مصدر البيانات الافتراضي API؛ المحاكاة تعمل فقط عند `VITE_DATA_SOURCE=mock`.

## التشغيل

```sh
npm install
npm run dev
```

يفتح التشغيل المحلي على `http://127.0.0.1:5173` ويشغّل API على `http://127.0.0.1:8000` وتنظيف الحجوزات معًا. يستخدم OTP ثابتًا `123456`، وقاعدة تطوير مستقلة محفوظة في `.gazabella-local/database.sqlite`. يُنشئ البيانات التجريبية مرة واحدة فقط؛ إعادة التشغيل تحفظ بياناتك. يتطلب Backend مع dependencies في `../GazabellaOnlineStore/backend` وPHP في `C:/xampp/php/php.exe`، أو تخصيص `MVP0_BACKEND_PATH` و`PHP_BINARY`.

`npm run dev:remote` هو الأمر الصريح للاتصال بإعدادات الخادم السابق في `.env`. لا تشغّل الأمرين على المنفذ نفسه.

حدد `VITE_API_BASE_URL` (يشمل `/api/v1`) و`VITE_STORAGE_URL` في `.env`. القيم العامة التي تبدأ VITE ليست مكانًا للأسرار. نموذج الإعدادات في `.env.example`.

## حالة التكامل

المنتجات والتصنيفات والبانرات والإعدادات والمجموعات والسلة والمفضلة متصلة بطبقة API. المفضلة والطلبات تتطلبان تسجيل الدخول. بيانات الجلسة معزولة حسب مصدر البيانات والخادم.

**العقد الافتراضي السابق عبر dev:remote:** تأكيد الطلب موقوف حتى يوفر الخادم عرض الإجمالي وعدم التكرار. **عقد MVP0 المحلي عبر dev أو dev:mvp0:** يدعم الحجز والكوبونات ومراجعة الإجمالي وإنشاء طلب COD مع منع التكرار. استخدم `npm run build:mvp0` لبناء الواجهة لهذا العقد. لا توجد عودة تلقائية إلى mock.

راجع [تقرير التنفيذ واختبار UX](Docs/MVP0_IMPLEMENTATION_2026-09-26_AR.md) لتشغيل الخلفية والمهاجرات وحدود الدفع التجريبي، و[ملحق العقد](Docs/MVP0_CONTRACT_DELTA.md). الشراء السريع متاح من بطاقات المنتجات دون فتح التفاصيل.

اكتمل [اختبار الإغلاق المحلي](Docs/MVP0_LOCAL_CLOSURE_2026-09-26_AR.md) على SQLite وMariaDB مع اختبارات تزامن فعلية. OTP المحلي يستخدم `123456` دون SMS أو Redis. لا توجد بيئة Staging ضمن النطاق المعتمد حاليًا.

راجع [تقرير المراجعة ومتطلبات الباك إند](Docs/API_REVIEW_AR.md) و[جرد العمليات الـ25](Docs/API_ENDPOINT_INVENTORY.json). مستندات MVP السابقة في Docs تاريخية وليست وصفًا للعقد الحالي.

## التحقق

```sh
npm run build
npm run lint
npm test
npm run test:mvp0
```

الاختبارات محلية: `api-contract.test.mjs` يستخدم Axios adapter دون اتصال بالخادم؛ `mock-flows.test.mjs` يستخدم تخزينًا منفصلًا. اختبار `test:mvp0` يشغّل Backend PHP وSQLite داخل مجلد مؤقت، ثم يختبر HTTP فعليًا حتى الطلب وإشعار الدفع المحاكى. افتراضيًا يستخدم `../GazabellaOnlineStore/backend` و`C:/xampp/php/php.exe`؛ يمكن تحديد `MVP0_BACKEND_PATH` و`PHP_BINARY`. لا تنشئ الاختبارات طلبات أو مدفوعات تجارية.

## البنية

- `src/api/gazabella.ts`: خدمات REST وتحويل الاستجابات وفصل المحاكاة.
- `src/lib/apiClient.ts`: هوية السلة وBearer والأخطاء وروابط الصور.
- `src/hooks/useWishlist.ts`: المفضلة وحالتها من الخادم.
- `src/components/home/ApiHome.tsx`: محتوى البانرات والمجموعات.
- `src/pages/CheckoutPage.tsx`: مراجعة السلة وإيقاف التأكيد غير المدعوم.
- `src/mock`: محاكاة محلية واضحة؛ ليست نظام صلاحيات أو دفع حقيقيًا.

لا تخزن service worker استجابات API أو بيانات الطلبات.
