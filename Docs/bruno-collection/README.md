# Gazabella API — Bruno Collection

## كيفية الاستخدام

1. ثبّت [Bruno](https://usebruno.com) إذا لم يكن مثبتاً
2. افتح Bruno → Open Collection → اختر مجلد `gazabella-api`
3. تأكد من أن السيرفر يعمل: `cd backend && php artisan serve`
4. شغّل الـ requests بالترتيب المذكور أدناه

## ترتيب الـ Happy Path الكامل

```
00-system/      health                     ← ابدأ هنا
01-auth/        01-guest-init              ← يحفظ guest_uuid تلقائياً
                02-otp-send                ← OTP=123456 في test mode
                03-otp-verify              ← يحفظ bearer_token تلقائياً
02-products/    01-categories
                02-products-list           ← يحفظ product_slug + variant_id
                03-product-detail
03-cart/        01-cart-add                ← يحفظ cart_item_id
                02-cart-view
                03-cart-update
                04-cart-reserve            ← يحجز المنتجات (15 دقيقة)
                05-cart-heartbeat          ← READ-ONLY (لا يمدد)
04-checkout/    01-checkout-begin          ← يمدد الحجز مرة واحدة (30 دقيقة total)
05-orders/      01-create-order            ← يحفظ order_number
                02-order-history
                03-order-detail
06-payments/    01-payment-init            ← يعيد payment_url من Jawwal Pay sandbox
                02-webhook-simulate        ← يحاكي SUCCESS من Jawwal Pay
07-security/    01..04                     ← اختبارات تسريب البيانات
```

## المتغيرات التلقائية (تُحفظ بـ script:post-response)

| المتغير | يُحفظ في |
|---|---|
| `guest_uuid` | Guest Init |
| `bearer_token` | OTP Verify |
| `product_slug` | Products List |
| `variant_id` | Products List |
| `cart_item_id` | Cart Add |
| `order_number` | Create Order |

## بيانات الاختبار

- **OTP:** `123456` (test mode مفعّل في .env)
- **Phone:** أي رقم صالح، مثلاً `0599000001`
- **Coupon:** غير مطلوب (اختياري)
- **Jawwal Pay:** sandbox mode — لا يوجد API call حقيقي

## Security Checks (07-security-checks)

هذه الاختبارات تتحقق أن هذه الحقول **لا تظهر أبداً** في أي response:
- `store_id`
- `commission_amount`  
- `sub_orders`
