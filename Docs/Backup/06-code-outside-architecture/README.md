# كود خارج المعمارية المعتمدة — مؤرشف 27/09/2026

| الملف | مكانه الأصلي | سبب الأرشفة |
|--|--|--|
| `MerchantAuthPage.tsx` | `src/pages/merchant/` | بوابة دخول متجر بـ React تطلب `POST /portal/merchant/login` |
| `portalAuthStore.ts` | `src/stores/` | يحفظ `store_id` وتوكن المتجر في الواجهة |

القرار المعتمد (Playbook · القواعد الثابتة): لوحة المتجر والسائق **Filament داخل الباك اند** (`/store` · `/delivery`)، ولا REST API للوحات.
لا يُعاد هذا الكود إلى `src` إلا بقرار معمارية جديد موثق في سجل القرارات.
