# Gazabella Frontend Integration QA

آخر إعادة اختبار: 2026-09-20

المرجع الملزم: `Docs/openapi.yaml`. لم يُعدّل عقد API أو كود Laravel أثناء هذا الفحص.

## النتائج الناجحة

- المنتجات والفئات والبحث والترتيب والتصفية وتفاصيل المنتج.
- غياب `store_id` من الاستجابات العامة.
- جلسة الضيف عبر طلب مباشر بلا `Origin`.
- السلة: GET وPOST وPATCH وDELETE.
- `POST /cart/reserve` مطابق للعقد ويعيد `reserved_until` و`seconds_remaining`.
- `POST /cart/heartbeat` مطابق للعقد وREAD-ONLY.
- OTP verify في test mode ودمج سلة الضيف مع المستخدم.
- `checkout/begin` استُدعي مرة واحدة فقط وكانت استجابته مطابقة للعقد.
- migrations الخاصة بـSanctum و`delivery_options.description` مطبقة في testing وdevelopment.
- الفرونت: `npm run build` و`npm run lint` ناجحان.
- قائمة المنتجات وتفاصيل المنتج تعملان في المتصفح دون أخطاء.

## العوائق المتبقية

### 1. طلبات POST من المتصفح تعيد 419

إعادة إنتاج مؤكدة:

- `POST /auth/guest/init` بدون `Origin` → يعمل.
- نفس الطلب مع `Origin: http://127.0.0.1:5173` → `419 CSRF token mismatch`.
- إضافة منتج من React → `419 CSRF token mismatch`.

السبب: `EnsureFrontendRequestsAreStateful` مضاف إلى API stack في `bootstrap/app.php`، وVite موجود ضمن `SANCTUM_STATEFUL_DOMAINS`، بينما المشروع حسب الإعدادات والعقد يستخدم Bearer Token وليس cookie SPA auth.

المطلوب: عدم تطبيق stateful-cookie/CSRF stack على REST API المعتمد على Bearer Token، مع إبقاء CORS.

### 2. Redis غير متاح

`POST /auth/otp/send` يعيد 500:

```text
No connection could be made because the target machine actively refused it [tcp://127.0.0.1:6379]
```

`otp/verify` يعمل بالرمز `123456` لأن test mode يتجاوز Redis، لكن التدفق الحقيقي لا يكتمل ما دام OTP send يفشل.

### 3. عمود حالة الطلب لا يقبل `pending`

إنشاء الطلب وصل إلى قاعدة البيانات ثم فشل:

```text
Data truncated for column 'status'
```

السبب: `OrderService` صار يكتب `pending`، لكن enum في قاعدة البيانات ما زال يحتوي `pending_payment` ولا يحتوي `pending`.

المطلوب: migration صريحة لتحديث enum بما يطابق حالات OpenAPI:

`pending, confirmed, processing, shipped, delivered, cancelled, refunded`.

### 4. استجابة إنشاء الطلب ما زالت لا تطابق Order schema

`OrderController::formatOrder()` لا يعيد حاليًا عدة حقول يحتاجها العقد والفرونت، وأهمها `id`. بعد إنشاء الطلب يستدعي الفرونت `/payments/init` باستخدام `response.data.id`.

الحقول المفقودة أو المختلفة:

- `id`
- `items` في استجابة الإنشاء
- `delivery_option`
- `address` بدل `recipient_name/recipient_phone/delivery_address`
- `payment_status`
- `tracking`
- `coupon_code`
- `notes`
- قيم الأموال يجب أن تبقى decimal strings حسب OpenAPI
- عناصر الطلب تستخدم `subtotal` في العقد، بينما formatter يستخدم `total`
- tracking يستخدم `note` و`created_at` في العقد، بينما formatter يستخدم `description` و`at`

كما أن `GET /orders` يعيد summary مختلفًا عن `Order` الموثق في OpenAPI.

### 5. Reverb غير شغّال

فحص TCP الحالي:

- Redis `127.0.0.1:6379` → CLOSED
- Reverb `127.0.0.1:8080` → CLOSED

لذلك لا يمكن تنفيذ اختبار أحداث Echo قبل تشغيل Reverb.

## اختبارات Laravel

النتيجة الحالية:

- 41 ناجح
- 7 فاشل
- 5 متجاهل

أغلب الفشل بسبب توقعات قديمة في الاختبارات بعد تصحيح العقد:

- الاختبارات ما زالت تتوقع 201 لإضافة السلة بدل 200.
- اختبار heartbeat ما زال يتوقع `{ data: [] }`.
- اختبارات checkout ما زالت تعتبر 422 صحيحًا بدل 409.

المطلوب تحديث الاختبارات لتثبت `openapi.yaml` الحالي، ثم إعادة تشغيل المجموعة كاملة.

## نقطة الاستئناف

بعد معالجة البنود وتشغيل Redis وReverb وتحديث الاختبارات، تُعاد الجولة من المتصفح:

`Add to cart → Reserve → OTP send/verify → checkout/begin once → Create order → Payment init → Orders → Echo`.
