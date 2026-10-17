# برومت عاصم — فواتير المبيعات (INV) في الباك اند

> الواجهة جاهزة: تبويب «فواتيري» وصفحة الفاتورة وتحميل PDF وصفحة التحقق العامة. تعمل الآن ببيانات تجريبية، وتتحول للبيانات الحقيقية تلقائياً عند توفر المسارات أدناه.
> مراجع الواجهة: `src/types/api.ts` (أنواع Invoice) · `src/api/invoices.ts` (التطبيع والطلبات) · `src/components/invoice/InvoiceDocument.tsx` (التصميم المرجعي لقالب الـ PDF) · `tests/invoices.test.mjs`.

انسخ كل ما داخل الصندوق لعاصم كما هو:

```
أنت تعمل على Backend مشروع Gazabella (Laravel 12 · Filament v3 · Sanctum · PHP 8.3).
المرجع: Docs/openapi.yaml و GAZABELLA_PLAYBOOK. المطلوب: نظام «فواتير المبيعات» كاملاً — قاعدة البيانات، الإصدار التلقائي،
الإشعارات الدائنة، الـ API، توليد PDF بالعربية والإنجليزية، صفحة التحقق، ولوحة Filament.
نفّذ بنداً بنداً مع Feature Test لكل بند، وحدّث openapi.yaml. لا تعلن بنداً جاهزاً بدون مخرجات `php artisan test --compact`.
الواجهة جاهزة وتنتظر هذا العقد بالحرف — أي اختلاف في أسماء الحقول أو أشكالها يكسرها.

══════════════════════════════════════
0) قرارات ثابتة (لا تُناقش في التنفيذ)
══════════════════════════════════════
INV-1  «فاتورة مبيعات» بلا ضريبة: لا حقل tax/vat ولا رقم ضريبي ولا سطر ضريبة نهائياً (Gazabella غير مسجلة ضريبياً حالياً).
INV-2  طرق الدفع في المتجر الحي: جوال باي فقط (+ خصم رصيد من المحفظة إن وُجد). الدفع عند الاستلام (cod) لا يُستخدم أبداً
       في الإنتاج — يبقى فقط في البيئات التجريبية. لا فواتير لطلبات cod إطلاقاً.
INV-3  الفاتورة تصدر لحظة تأكيد الدفع (payment_status → paid)، وليس عند إنشاء الطلب ولا عند التسليم.
       أي تغيير مالي بعد الإصدار (بند غير متوفر D-05، إلغاء بعد الدفع، إرجاع) = «إشعار دائن» مرتبط + استرداد إلى المحفظة.
       الفاتورة الأصلية لا تُعدَّل أبداً (immutable).
INV-4  الضيوف (بلا حساب) خارج هذه المرحلة — الفواتير لصاحبة الحساب فقط.
INV-5  لغة الـ PDF حسب ?locale=ar|en وقت التحميل. أسماء المنتجات والمتغيرات تُحفظ باللغتين وقت الإصدار.
D-STORE Gazabella هي البائع الوحيد. ممنوع في أي فاتورة/رد/PDF: store, store_id, store_name, vendor, merchant, supplier,
       sub_order(s), commission*, payout, pickup_stores, fulfillment_route، أو اسم أي متجر/مورد في أي نص.
       مفتاح البائع في الرد اسمه seller (وليس store).

══════════════════════════════════════
1) قاعدة البيانات (Migrations)
══════════════════════════════════════
invoices
  id · invoice_number string(32) unique · order_id FK unique (فاتورة واحدة لكل طلب) · user_id FK index
  status enum(issued, partially_credited, credited) default issued
  currency char(3) default 'ILS' · issued_at timestamp · paid_at timestamp
  subtotal decimal(12,2) · discount_amount decimal(12,2) null · coupon_code string null
  delivery_fee decimal(12,2) · delivery_fee_original decimal(12,2) null · total decimal(12,2)
  credited_total decimal(12,2) default 0
  seller_snapshot json      ← {name, address:{ar,en}|null, phone, email, website} من الإعدادات وقت الإصدار
  customer_snapshot json    ← {name, phone (كامل — لا يُعرض), address}
  payments json             ← [{method: jawwal_pay|wallet, amount, reference|null, paid_at}]
  verify_token string(64) unique  ← Str::random(40) — ليس رقم الفاتورة ولا قابل للتخمين
  pdf_path_ar string null · pdf_path_en string null   ← كاش الملفات على قرص private
  locale string(2) default 'ar' · timestamps
  index(user_id, issued_at)

invoice_items
  id · invoice_id FK cascade · order_item_id FK null
  name_ar · name_en · variant_ar null · variant_en null · sku null (SKU Gazabella فقط — ليس SKU المتجر)
  quantity unsigned int · unit_price decimal(12,2) · line_total decimal(12,2) · credited_quantity unsigned int default 0

credit_notes
  id · credit_note_number string(32) unique · invoice_id FK · order_id FK
  amount decimal(12,2) · reason_code string · reason_ar · reason_en
  refunded_to enum(wallet) default wallet · wallet_transaction_id FK null · issued_by (admin user id) null
  issued_at timestamp · timestamps

credit_note_items
  id · credit_note_id FK cascade · invoice_item_id FK · quantity · amount decimal(12,2)

document_sequences
  id · type enum(INV, CN) · year smallint · last_number unsigned int · unique(type, year)

orders: أضف paid_at timestamp null إن لم يكن موجوداً.

══════════════════════════════════════
2) الترقيم (متسلسل بلا فراغات لكل سنة)
══════════════════════════════════════
app/Services/DocumentNumberService.php
  next(string $type, CarbonInterface $at): string
  - داخل نفس الـ transaction الذي ينشئ الوثيقة: DocumentSequence::where(type, year)->lockForUpdate()->first()
    (أنشئه إن لم يوجد بـ firstOrCreate ثم أعد قفله) → last_number++ → save.
  - الصيغة: GZB-INV-2026-000123 · GZB-CN-2026-000009 (6 أرقام مبطّنة بأصفار). الواجهة ترفض أي صيغة أخرى بالـ regex:
    ^GZB-(INV|CN)-\d{4}-\d{6}$
  - لا تستخدم id ولا max()+1 (تتكرر مع التزامن).
  - السنة = سنة issued_at بتوقيت Asia/Hebron.

══════════════════════════════════════
3) الإصدار التلقائي (INV-3)
══════════════════════════════════════
app/Events/OrderPaid.php (بلا بث) — يُطلق مرة واحدة عند تحول payment_status إلى paid:
  - في PaymentService بعد تأكيد جوال باي (Webhook/confirm المرجع) — بجانب OrderConfirmationService::confirm.
  - وفي مسار الدفع الكامل من المحفظة (إن غطّى الرصيد كامل المبلغ).
  - اضبط orders.paid_at = now() في نفس الـ transaction، وأطلق الحدث بـ DB::afterCommit.

app/Listeners/IssueInvoice.php → app(InvoiceService::class)->issueForOrder($order)

app/Services/InvoiceService.php
  issueForOrder(Order $order): ?Invoice   — آمنة للتكرار (idempotent):
  1) DB::transaction + Order::lockForUpdate.
  2) إن وُجدت فاتورة لهذا الطلب → أعدها كما هي (unique(order_id) حماية إضافية؛ التقط UniqueConstraintViolation وأعد الموجودة).
  3) شروط الإصدار وإلا return null: payment_status = paid · status != cancelled · payment_method ∈ [jawwal_pay, wallet]
     (cod → null دائماً).
  4) لقطة ثابتة (snapshot) من الطلب وقت الإصدار:
     - البنود: الاسم والمتغير باللغتين (getTranslation('name','ar'/'en') إن كان الحقل مترجماً؛ وإلا نفس القيمة للغتين)،
       الكمية، سعر الوحدة الفعلي المدفوع، line_total.
     - subtotal · discount_amount + coupon_code · delivery_fee · delivery_fee_original (عند الإعفاء فقط) · total
       بالضبط كما في الطلب. تحقّق: subtotal − discount + delivery_fee = total، وΣ payments = total، وإلا ارمِ استثناء
       وسجّله في Sentry (لا تصدر فاتورة بأرقام غير متطابقة).
     - payments: [{method:'wallet', amount: wallet_applied, reference:null}] إن استُخدمت المحفظة +
       [{method:'jawwal_pay', amount: الباقي, reference: payment_reference}].
     - seller_snapshot من الإعدادات (store_name = Gazabella، العنوان العام، هاتف/بريد الدعم) — ليس من جدول المتاجر.
     - customer_snapshot: اسم ورقم الطلب وعنوانه (وليس بيانات الحساب الحالية).
  5) رقم من DocumentNumberService + verify_token.
  6) بعد الـ commit: Job GenerateInvoicePdf للغتين (اختياري مسبقاً — وإلا يُولَّد عند أول تحميل).

Immutability: في Invoice::booted() امنع updating لأي حقل غير (status, credited_total, pdf_path_ar, pdf_path_en, updated_at)
  وامنع deleting تماماً (throw LogicException). نفس الشيء لـ invoice_items عدا credited_quantity.

Backfill: أمر php artisan gazabella:invoices:backfill {--dry-run}
  يصدر فواتير لكل طلب مدفوع (jawwal_pay/wallet) بلا فاتورة، بترتيب paid_at ثم id، ويطبع العدد.

══════════════════════════════════════
4) الإشعارات الدائنة (استرداد بعد الإصدار)
══════════════════════════════════════
app/Services/CreditNoteService.php
  issue(Invoice $invoice, array $lines /* [invoice_item_id => qty] */, string $reasonCode, array $reason /* ar,en */, ?User $admin): CreditNote
  - transaction + lockForUpdate على الفاتورة.
  - كمية كل بند ≤ quantity − credited_quantity، والمبلغ = unit_price × qty (+ رسوم التوصيل فقط عند إلغاء كامل الطلب).
  - مجموع الإشعارات لا يتجاوز total أبداً.
  - رقم GZB-CN-YYYY-NNNNNN · يزيد credited_quantity للبنود و credited_total للفاتورة.
  - status = credited إن credited_total = total، وإلا partially_credited.
  - يُنشئ حركة محفظة (credit) بنفس المبلغ ويربط wallet_transaction_id — بنفس الخدمة المستخدمة لاسترداد الإلغاء
    (الواجهة تعرض refunded_to_wallet في الإلغاء الحالي).
  - يمسح كاش الـ PDF للغتين (pdf_path_* = null) لأن المستند يعرض الإشعارات المرتبطة.
  - idempotency: مفتاح فريد اختياري (مثلاً cancel:{order_id}) حتى لا يتكرر الاسترداد عند إعادة المحاولة.
  اربطها بـ:
  - إلغاء طلب مدفوع (OrderController@cancel الحالي) → إشعار بكامل المبلغ بدل الاسترداد المباشر.
  - إزالة بند بعد الدفع (D-05 / adjustments) → إشعار جزئي.
  - إجراء يدوي من Filament (بند 8).

══════════════════════════════════════
5) الـ API (Sanctum — العميلة صاحبة الفاتورة فقط)
══════════════════════════════════════
routes/api.php (داخل v1):
  Route::middleware('auth:sanctum')->group(function () {
    Route::get('invoices', [InvoiceController::class, 'index']);
    Route::get('invoices/{invoice_number}', [InvoiceController::class, 'show'])
         ->where('invoice_number', 'GZB-(INV|CN)-\d{4}-\d{6}');
    Route::get('invoices/{invoice_number}/pdf', [InvoiceController::class, 'pdf'])
         ->where('invoice_number', 'GZB-INV-\d{4}-\d{6}')->middleware('throttle:10,1');
  });
  Route::get('invoices/verify/{token}', [InvoiceController::class, 'verify'])
       ->where('token', '[A-Za-z0-9]{16,80}')->middleware('throttle:30,1');   // عام بلا تسجيل
  ⚠️ سجّل verify قبل {invoice_number} أو قيّد النمط كما أعلاه حتى لا يتعارضا.

الملكية: InvoicePolicy::view → $invoice->user_id === $user->id. لغير المالكة أعد 404 (وليس 403) حتى لا نكشف وجود الرقم.
ابحث دائماً بـ Invoice::where('user_id', auth()->id())->where('invoice_number', …)->firstOrFail().

5.1  GET /invoices?year=2026&page=1&per_page=50   (per_page حد أقصى 50، year اختياري، الأحدث أولاً)
{
  "data": [
    {
      "invoice_number": "GZB-INV-2026-000131",
      "order_number": "GAZ-2026-0013",
      "status": "partially_credited",
      "issued_at": "2026-10-09T16:13:00+03:00",
      "currency": "ILS",
      "total": "133.00",
      "credited_total": "27.00",
      "payment_methods": ["jawwal_pay"],
      "items_count": 3,                       ← عدد البنود (المنتجات) وليس مجموع الكميات
      "first_item": { "ar": "عطر صلب بالعنبر والمسك", "en": "Amber Musk Solid Perfume" }
    }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 50, "total": 6, "years": [2026, 2025] }
}
- meta.years = كل السنوات التي فيها فواتير للعميلة (تنازلياً) بغض النظر عن فلتر year.
- كل المبالغ نصوص بخانتين عشريتين.

5.2  GET /invoices/{invoice_number}
{
  "data": {
    ...كل حقول الملخص أعلاه...,
    "paid_at": "2026-10-09T16:13:00+03:00",
    "verify_token": "H3wQ9bL5xT2mV8cR1kP6Zs7…",
    "seller":   { "name": "Gazabella", "address": { "ar": "خان يونس، فلسطين", "en": "Khan Younis, Palestine" },
                  "phone": "+970 59 …", "email": "support@gazabella.ps", "website": "gazabella.ps" },
    "customer": { "name": "أمل النجار", "phone_masked": "059•••4567", "address": "خان يونس، حي الأمل، …" },
    "items": [
      { "id": 1, "name": {"ar":"…","en":"…"}, "variant": {"ar":"بني فاتح","en":"Light brown"} | null,
        "quantity": 2, "unit_price": "27.00", "line_total": "54.00", "credited_quantity": 1 }
    ],
    "subtotal": "128.00",
    "discount_amount": null | "18.00",
    "coupon_code": null | "GAZA10",
    "delivery_fee": "5.00",
    "delivery_fee_original": null | "10.00",
    "payments": [
      { "method": "wallet",     "amount": "40.00", "reference": null,              "paid_at": "…" },
      { "method": "jawwal_pay", "amount": "74.00", "reference": "JP-26092709W5HC", "paid_at": "…" }
    ],
    "credit_notes": [
      { "credit_note_number": "GZB-CN-2026-000009", "issued_at": "…", "amount": "27.00",
        "reason": {"ar":"نفدت الكمية قبل التجهيز — أُعيد المبلغ إلى محفظتكِ","en":"Ran out of stock before packing — refunded to your wallet"},
        "refunded_to": "wallet",
        "lines": [ { "name": {"ar":"…","en":"…"}, "quantity": 1, "amount": "27.00" } ] }
    ]
  }
}
- phone_masked يُحسب في الخادم: أول 3 أرقام + ••• + آخر 4. الرقم الكامل لا يخرج أبداً في أي رد فاتورة.
- لا email للعميلة في الرد ولا في الـ PDF.
- القيم من الـ snapshot فقط — لا تقرأ من الطلب أو المنتج الحاليين.

5.3  GET /invoices/{invoice_number}/pdf?locale=ar|en
- يعيد الملف نفسه: Content-Type: application/pdf
  Content-Disposition: attachment; filename="Gazabella-GZB-INV-2026-000131.pdf"
  Cache-Control: private, no-store · X-Content-Type-Options: nosniff
- locale غير صالح → ar. أي خطأ يعيد JSON بحالة مناسبة (لا HTML بحالة 200 — الواجهة ترفض أي رد ليس PDF).
- 429 بعد 10 طلبات/دقيقة (الواجهة تعرض رسالة مخصصة لـ 429).

5.4  GET /invoices/verify/{token}   (عام)
{ "data": { "invoice_number": "GZB-INV-2026-000131", "issued_at": "…", "currency": "ILS", "total": "133.00", "status": "partially_credited" } }
- هذه الحقول الخمسة فقط — لا اسم ولا هاتف ولا عنوان ولا منتجات. token غير موجود → 404.

5.5  تعديل OrderResource (GET /orders و GET /orders/{order_number}) — للعميلة فقط:
  "paid_at": "…" | null,
  "invoice": { "invoice_number": "GZB-INV-2026-000131", "status": "issued", "issued_at": "…" } | null
- null = لم تصدر بعد (قبل الدفع). أرسل المفتاح دائماً (حتى null) — غيابه يعني للواجهة أن الخادم لا يدعم الفواتير.
- استخدم eager loading (with('invoice:id,order_id,invoice_number,status,issued_at')) — لا N+1 في القائمة.

══════════════════════════════════════
6) توليد الـ PDF (عربي RTL + إنجليزي LTR)
══════════════════════════════════════
- الحزمة: mpdf/mpdf (تشكيل عربي سليم + RTL + باركود وQR مدمجان). لا dompdf (يكسر الحروف العربية).
  ولا Browsershot (يحتاج Chromium غير المتاح على Laravel Cloud).
- الخط: Readex Pro (OFL) بصيغة TTF في resources/fonts (حمّل الملفات المتغيرة أو الثابتة 400/600/700 من Google Fonts)،
  وسجّله في fontdata مع useOTL=0xFF و useKashida=75 للعربية. autoScriptToLang=true · autoLangToFont=true.
- القالب: resources/views/pdf/invoice.blade.php — طابق تصميم الواجهة src/components/invoice/InvoiceDocument.tsx
  (افتح صفحة أي فاتورة تجريبية واطبعها كمرجع بصري) وبنفس ترتيب الأقسام:
  1. شريط علوي كريمي #FDF6EC وخط سفلي #A0144F: الشعار public/brand/full-compact/logo-480.png يمين (RTL)،
     وعلى الطرف الآخر «فاتورة مبيعات / Sales invoice» + الرقم + شارة الحالة (مدفوعة/مسترد جزئياً/مستردة بالكامل).
  2. شبكة من 4 خانات: تاريخ الإصدار · رقم الطلب · تاريخ الدفع (مع الوقت) · العملة «شيكل (₪)».
  3. عمودان: البائع (من seller_snapshot) | فاتورة إلى (الاسم + phone_masked + العنوان).
  4. جدول: # · المنتج (الاسم + المتغير تحته + «استُرد منها N إلى المحفظة» إن وُجد) · الكمية · سعر الوحدة · المجموع.
  5. الدفع (بطاقة لكل دفعة: الطريقة · المرجع · الوقت · المبلغ) | المجاميع: المجموع الفرعي · الخصم (الكود) ·
     التوصيل (مشطوب الأصلي + «مجاني» عند الإعفاء) · «الإجمالي المدفوع» بارز · وعند الاسترداد: «مسترد إلى المحفظة» و«صافي الفاتورة».
  6. «إشعارات دائنة مرتبطة» إن وُجدت.
  7. التذييل: باركود Code128 لرقم الفاتورة → <barcode code="GZB-INV-…" type="C128B" height="1.1" />
     و QR لرابط التحقق → <barcode code="{FRONTEND_URL}/invoices/verify/{token}" type="QR" size="0.9" error="M" disableborder="1" />
     + «شكراً لتسوّقكِ من Gazabella» + «فاتورة إلكترونية صادرة عند تأكيد الدفع ولا تحتاج إلى توقيع.» + رابط /returns.
  - نصوص القالب من lang/ar/invoice.php و lang/en/invoice.php (نفس النصوص الإنجليزية في src/i18n/en.ts قسم الفواتير).
  - dir="rtl" و lang="ar" للعربية، و ltr للإنجليزية. الأرقام والمبالغ بأرقام لاتينية في اللغتين. التواريخ بتوقيت Asia/Hebron.
  - A4 بهوامش 10mm، والجدول لا يقطع سطراً بين صفحتين (page-break-inside: avoid).
- FRONTEND_URL من config (env FRONTEND_URL) — لا تبنِ رابط التحقق من رابط الـ API.
- الكاش: احفظ على قرص private (storage/app/private/invoices/{year}/{number}-{locale}.pdf) وخزّن المسار في pdf_path_{locale}.
  أعد التوليد إن كان المسار null (بعد إشعار دائن). لا تجعل الملفات public ولا تولّد روابط مباشرة لها.
- InvoicePdfService::render(Invoice $invoice, string $locale): string (مسار) — تُستخدم في الـ API و Filament والـ Job.

══════════════════════════════════════
7) طرق الدفع (INV-2) — تعديل config/gazabella.php
══════════════════════════════════════
'payments' => [
    // INV-2: الإنتاج جوال باي فقط. cod للبيئات التجريبية فقط.
    'enabled_methods' => in_array(env('APP_ENV', 'production'), ['local', 'testing', 'staging'], true)
        ? ['cod', 'jawwal_pay']
        : ['jawwal_pay'],
],
- قاعدة التحقق في checkout تبقى Rule::in(enabled_methods) → إرسال cod في الإنتاج = 422 PAYMENT_METHOD_DISABLED.
- GET /settings → policies.payment_methods و checkout/begin → payment_methods يعيدان القائمة نفسها.
- الواجهة نفسها تتجاهل cod خارج الوضع التجريبي حتى لو أرسله الخادم (طبقة حماية ثانية).

══════════════════════════════════════
8) لوحة الإدارة (Filament /admin)
══════════════════════════════════════
InvoiceResource (قراءة فقط — لا Create/Edit/Delete):
- الجدول: الرقم · رقم الطلب · العميلة · التاريخ · الإجمالي · المسترد · الحالة (Badge) · طرق الدفع.
  فلاتر: الحالة · السنة · نطاق تاريخ · طريقة الدفع. بحث بالرقم ورقم الطلب واسم/هاتف العميلة.
- صفحة العرض: كل الحقول + البنود + الدفعات + الإشعارات الدائنة.
- Actions:
  · «تحميل PDF» (ar/en) عبر InvoicePdfService.
  · «إصدار إشعار دائن»: اختيار البنود والكميات (≤ المتبقي) + reason_code (out_of_stock, damaged, cancelled_after_payment,
    customer_return, other) + سبب بالعربي والإنجليزي (≥ 10 أحرف) + تأكيد صريح «سيُضاف المبلغ إلى محفظة العميلة».
    صلاحية مخصصة (permission: invoices.credit) — لا تظهر لغير المخولين.
  · «إعادة توليد PDF» (يمسح الكاش فقط — لا يغيّر البيانات).
- CreditNoteResource: قراءة فقط مع رابط للفاتورة.
- عدّاد في الـ Dashboard: فواتير اليوم/الشهر ومجموعها، والمسترد.
- يمكن للإدارة رؤية المتجر المورد في صفحة الطلب الإدارية كما هو حالياً — لكن لا شيء منه يدخل الفاتورة أو الـ PDF.

══════════════════════════════════════
9) الأمان
══════════════════════════════════════
- ملكية صارمة + 404 لغير المالكة (اختبار IDOR: عميلة B تطلب فاتورة A → 404 في show و pdf).
- verify_token عشوائي 40 حرفاً، unique، لا يُشتق من الرقم أو id. صفحة التحقق 5 حقول فقط.
- throttle: pdf 10/دقيقة · verify 30/دقيقة لكل IP.
- لا مبالغ من المدخلات — كل شيء من الـ snapshot. لا Mass Assignment على invoices ($fillable محدد، والـ API قراءة فقط).
- الـ PDF على قرص private، ويُبث عبر Controller بعد التحقق من الملكية — لا روابط storage عامة.
- هروب كل النصوص في Blade ({{ }} فقط — لا {!! !!} لبيانات العميلة أو المنتجات).
- سجّل كل إصدار إشعار دائن في activity log (من، متى، كم، لماذا).
- أضف لـ scripts/leak-scan الحالي في الواجهة: يفحص /invoices و /invoices/{n} و /invoices/verify/{token} تلقائياً (جاهز في الواجهة).

══════════════════════════════════════
10) الاختبارات المطلوبة (Feature) — كلها خضراء قبل التسليم
══════════════════════════════════════
1.  دفع جوال باي ناجح → فاتورة واحدة · رقم بالصيغة · status=issued · Σ payments = total · paid_at مضبوط.
2.  تكرار Webhook/confirm مرتين → فاتورة واحدة فقط (idempotency).
3.  طلب cod مدفوع (بيئة testing) → لا فاتورة. طلب pending أو ملغى قبل الدفع → لا فاتورة.
4.  دفع مختلط محفظة + جوال باي → دفعتان بالمبالغ الصحيحة. دفع كامل من المحفظة → دفعة wallet واحدة.
5.  تزامن: إصدار 20 فاتورة بالتوازي (أو حلقة مع transactions) → أرقام متتالية بلا تكرار ولا فراغ.
6.  تغيير السنة → يبدأ الترقيم من 000001 للسنة الجديدة.
7.  Immutability: تعديل total أو حذف فاتورة → استثناء.
8.  إشعار دائن جزئي → credited_quantity و credited_total و status=partially_credited + حركة محفظة بنفس المبلغ + مسح كاش PDF.
    إشعار يتجاوز المتبقي → رفض. إلغاء كامل بعد الدفع → status=credited.
9.  GET /invoices: فواتير المستخدم فقط · فلتر year · meta.years · per_page لا يتجاوز 50 · الأحدث أولاً.
10. GET /invoices/{n} و /pdf لفاتورة مستخدم آخر → 404. بدون توكن → 401.
11. /pdf: Content-Type application/pdf · Content-Disposition attachment · locale=en يولّد ملفاً مختلفاً عن ar · throttle 429.
12. /invoices/verify/{token}: 5 مفاتيح فقط بالضبط · token خاطئ → 404 · يعمل بلا توكن.
13. OrderResource: invoice=null قبل الدفع، وكائن بعده، و paid_at. لا N+1 (assertQueryCount أو Debugbar).
14. D-STORE: assertJsonMissingPath لكل المفاتيح الممنوعة في /invoices و /invoices/{n} و /orders/{n}.
    واختبار أن نص الـ PDF المستخرج (smalot/pdfparser في dev) لا يحتوي أسماء المتاجر المورّدة.
15. production config: payment_method=cod → 422 PAYMENT_METHOD_DISABLED.

══════════════════════════════════════
11) التسليم
══════════════════════════════════════
- مخرجات php artisan test --compact (كل الاختبارات أعلاه + القديمة).
- openapi.yaml محدّث بالمسارات الأربعة + تعديل Order (invoice, paid_at) + schemas: InvoiceSummary, Invoice, CreditNote, InvoiceVerification.
- ملفا PDF نموذجيان (ar و en) لفاتورة فيها خصم + دفع مختلط + إشعار دائن — للمراجعة البصرية مقابل صفحة الواجهة.
- تشغيل php artisan gazabella:invoices:backfill --dry-run على Staging وإرسال العدد.
- تشغيل: node scripts/leak-scan.mjs --base <API> --token <توكن عميلة لديها فاتورة> --stores "<أسماء المتاجر>" → 0 مخالفات.
- إبلاغ أشرف بعد النشر لتفعيل VITE_INVOICES=true في الواجهة (في الإنتاج بعد إيقاف وضع العرض).
```

## ملاحظات لأشرف (لا تُرسل لعاصم)

- **تفعيل الواجهة:** التبويب يظهر الآن لأن وضع العرض مفعّل (`VITE_DEMO_FIXTURES=true`). عند الإطلاق، بعد إيقاف وضع العرض، أضف `VITE_INVOICES=true` في Vercel بعد ما ينشر عاصم المسارات.
- **الانتقال للبيانات الحقيقية تلقائي:** طالما المسار يرد 404 تظهر البيانات التجريبية مع شارة «عرض تجريبي». أول ما يرد الخادم، تظهر الفواتير الحقيقية بدون أي تعديل في الواجهة.
- **ضبط `FRONTEND_URL` في الباك اند ضروري:** الـ QR في الـ PDF يفتح صفحة التحقق على الواجهة، فإذا كان الرابط خطأ بيطلع الـ QR معطوب.
