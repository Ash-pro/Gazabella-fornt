# Gazabella Frontend

واجهة متجر Gazabella المبنية بـ React 19 وTypeScript وVite وTailwind CSS.

## التشغيل

يشترط أن يعمل Laravel على `http://127.0.0.1:8000`، ثم:

```bash
npm install
npm run dev
```

تعمل الواجهة دائمًا على `http://127.0.0.1:5173`، وتقرأ إعداداتها من `.env`.

## أوامر التحقق

```bash
npm run lint
npm run build
```

## البنية

- `src/api/gazabella.ts`: جميع عمليات عقد OpenAPI.
- `src/lib/apiClient.ts`: نسخة Axios المركزية وإضافة ترويسات الضيف أو المستخدم.
- `src/lib/echo.ts`: اتصال Laravel Reverb/Echo.
- `src/stores`: حالة المصادقة والسلة وجلسة الدفع عبر Zustand.
- `src/pages`: المنتجات، تفاصيل المنتج، السلة، OTP، الدفع، والطلبات.

## ثوابت التدفق

- `heartbeat` استعلام قراءة فقط كل خمس دقائق ولا يمدد الحجز.
- `checkout/begin` يُرسل مرة واحدة لكل انتقال فعلي إلى الدفع.
- روابط تفاصيل الطلب تستخدم `order_number` بصيغة `GAZ-YYYY-XXXX`.
- الواجهة لا تعتمد على `store_id` في أي استجابة.
