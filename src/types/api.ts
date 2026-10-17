export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  /** P3-2: عدد المنتجات لكل قيمة فلتر ضمن نتائج البحث الحالية (اختياري) */
  facets?: CatalogFacets | null
}

export interface CatalogFacets {
  categories?: Array<{ slug: string; count: number }>
  brands?: Array<{ slug: string; count: number }>
}

export interface Category {
  id: number
  name: string
  slug: string
  image_url: string | null
  parent_id: number | null
  children: Category[]
}

export interface Brand {
  id: number
  name: string
  slug: string
  logo_url: string | null
  /** P3-1: صفحة الماركة — اختياري */
  description?: string | null
  cover_url?: string | null
  products_count?: number | null
}

export interface ProductImage {
  url: string
  /** مقترح على الباك اند: نسخ مصغّرة WebP — ‎400px‎ للبطاقات و‎800px‎ للتفاصيل (تُستخدم في srcset إن وُجدت) */
  thumb_url?: string | null
  medium_url?: string | null
  alt_text: string | null
  is_primary: boolean
  sort_order: number
}

export interface ProductBrief {
  variants?: ProductVariant[]
  id: number
  name: string
  slug: string
  price: number
  discount_price: number | null
  in_stock: boolean
  stock: number
  is_wishlisted?: boolean
  images: ProductImage[]
  category: { id: number; name: string }
  /** P3-1: الماركة المصنّعة (لا علاقة لها بالمتجر — D-STORE) */
  brand?: { id: number; name: string; slug: string } | null
  /** P1-1: متوسط التقييم وعدده (من المراجعات المعتمدة فقط) */
  rating_avg?: number | null
  rating_count?: number | null
}

export interface ProductDetail {
  variants?: ProductVariant[]
  id: number
  name: string
  slug: string
  description: string | null
  price: number
  discount_price: number | null
  in_stock: boolean
  stock: number
  is_wishlisted?: boolean
  category: { id: number; name: string; slug: string }
  images: ProductImage[]
  brand?: { id: number; name: string; slug: string } | null
  rating_avg?: number | null
  rating_count?: number | null
  /** P1-5: تبويبات المعلومات — كلها اختيارية */
  ingredients?: string | null
  how_to_use?: string | null
  specs?: ProductSpec[] | null
}
export interface CartItem {
  product_variant_id?: number
  id: number
  product_id: number
  product_name: string
  variant_name?: string | null
  unit_price: string
  compare_at_price?: string | null
  quantity: number
  subtotal: string
  image_url: string | null
  product_slug: string | null
  stock: number
}

export interface Cart {
  has_active_reservation?: boolean
  items: CartItem[]
  total_items: number
  subtotal: string
  /** P2-2: الكوبون المطبّق على السلة (من الخادم) */
  coupon?: CartCoupon | null
  /** P2-2: قيمة الخصم الإجمالية، و total = subtotal − discount (قبل التوصيل) */
  discount?: string | null
  total?: string | null
}

/** P4-2 أدلة الجمال — المحتوى كتل منظمة (لا HTML) */
export type GuideBlock =
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'tip'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'products'; title?: string; category_slug?: string; product_slugs?: string[] }

export interface GuideSummary { slug: string; title: string; excerpt: string; cover_url: string | null; reading_minutes: number; tag: string; published_at: string }
export interface Guide extends GuideSummary { blocks: GuideBlock[] }

/** P4-3 قائمة مفضلة مشتركة (قراءة فقط) */
export interface SharedWishlist { token: string; owner_name: string; items: ProductBrief[]; created_at: string }

export interface CartCoupon { code: string; discount: string; description?: string | null; /** واجهة فقط: مصدره وضع العرض */ demo?: boolean }

/** P2-4 عنوان في دفتر العناوين — city من أسماء مناطق التوصيل */
export interface CustomerAddress {
  id: number
  label: string
  recipient_name: string
  phone: string
  city: string
  neighborhood: string
  street: string
  is_default: boolean
}
export type CustomerAddressInput = Omit<CustomerAddress, 'id'>

export interface ProductVariant {
  id: number
  name: string
  price: number
  compare_at_price?: number | null
  available_quantity: number
  /** P1-2: لون الدرجة (#RRGGBB) لعرضها كدائرة — اختياري */
  swatch_hex?: string | null
  /** P1-2: صورة المتغير — تُعرض في المعرض عند اختياره — اختياري */
  image_url?: string | null
}

/** P1-1: مراجعة منتج — تظهر بعد موافقة الإدارة فقط */
export interface ProductReview {
  id: number
  rating: number
  title?: string | null
  body: string
  author_name: string
  created_at: string
  verified_purchase: boolean
  photos: string[]
  variant_name?: string | null
}

export interface ReviewSummary {
  average: number
  count: number
  /** عدد المراجعات لكل نجمة: { "5": 12, "4": 3, ... } */
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>
}

export interface ReviewsPage {
  data: ProductReview[]
  meta: { current_page: number; last_page: number; total: number }
  summary: ReviewSummary
}

/** P1-5: سطر في جدول تفاصيل المنتج (الحجم · بلد المنشأ · نوع البشرة …) */
export interface ProductSpec { label: string; value: string }

export interface Mvp0Address {
  full_name: string
  phone: string
  city: string
  area: string
  details: string
  landmark?: string
  lat?: number
  lng?: number
}

export type PaymentMethodCode = 'cod' | 'jawwal_pay'
export interface PaymentMethodOption {
  code: PaymentMethodCode
  label: string
  is_sandbox?: boolean
}

export interface CheckoutBegin {
  /** C-P1-01 — اختياري للتوافق مع باك اند أقدم؛ غيابه ⇒ COD فقط (D-01) */
  payment_methods?: PaymentMethodOption[]
  expires_at: string
  seconds_remaining: number
  reservation_extended: boolean
  active_cities: string[]
  delivery_options: Array<{ id: number; name: string; fee: string; estimated_days: string }>
}

/** إعفاء/خصم رسوم التوصيل (D-22). غيابه = رسوم توصيل عادية. */
export type DeliveryWaiverReason = 'compensation' | 'free_threshold' | 'promotion'
export interface DeliveryWaiver {
  reason: DeliveryWaiverReason
  /** نص جاهز للعرض من الخادم، مثل: «عرض تعويضي — توصيل مجاني» */
  label: string
}
/** حقول التوصيل المشتركة بين العرض (quote) والطلب */
export interface DeliveryFeeFields {
  /** الرسوم المستحقة فعلاً — إلزامية دائماً، و"0.00" مسموحة فقط مع delivery_waiver */
  delivery_fee: string
  /** الرسوم قبل الإعفاء — تظهر مشطوبة */
  delivery_fee_original?: string | null
  delivery_waiver?: DeliveryWaiver | null
}

export interface CheckoutQuote extends DeliveryFeeFields {
  quote_token: string
  expires_at: string
  subtotal: string
  discount_amount: string
  total: string
  currency: string
}

export interface Mvp0CheckoutPayload {
  delivery_option_id: number
  address: Mvp0Address
  payment_method: 'cod' | 'jawwal_pay'
  coupon_code?: string
  notes?: string
  quote_token: string
}

export type UserRole = 'customer' | 'merchant' | 'delivery' | 'admin'

export interface User {
  gender?: 'male' | 'female' | null
  birth_date?: string | null
  city?: string | null
  address?: string | null
  id: number
  name: string
  phone: string
  email?: string
  role: UserRole
  created_at: string
}

export interface ProfileUpdate {
  name?: string
  email?: string | null
  gender?: 'male' | 'female' | null
  birth_date?: string | null
  city?: string | null
  address?: string | null
  /** اختيارية منذ B-03 — تُرسل معاً أو لا تُرسل */
  latitude?: number
  longitude?: number
}

export interface AuthResponse {
  token: string
  token_type: 'Bearer'
  user: User
  /** الحساب كان معطّلاً وأُعيد تفعيله بهذا الدخول */
  reactivated?: boolean
}

export interface CheckoutPayload {
  name: string
  phone: string
  address: string
  payment_method: 'cod' | 'jawwal_pay'
  email?: string
  notes?: string
  coupon_code?: string
  /** B-02 — منطقة التوصيل المختارة من /delivery-zones */
  delivery_zone_id?: number
  /** إرسال كهدية — بيانات المستلم */
  is_gift?: boolean
  recipient_name?: string
  recipient_phone?: string
  gift_message?: string
}

export interface JawwalConfirmPayload {
  order_number: string
  reference: string
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export interface Order {
  discount_amount?: string
  id: number
  order_number: string
  status: OrderStatus
  items: Array<{
    id: number
    product_id?: number
    product_name: string
    variant_name?: string | null
    unit_price: string
    quantity: number
    subtotal: string
    image_url: string | null
    /** P4-1: لتقييم المنتج من صفحة الطلب */
    product_slug?: string | null
    /** P4-1: قيّمته المستخدمة من قبل */
    reviewed?: boolean
  }>
  subtotal: string
  delivery_fee: string
  total: string
  name: string
  email: string
  phone: string
  address: string
  notes: string | null
  payment_method?: 'cash_on_delivery' | 'jawwal_pay' | string
  escrow_expires_at?: string
  delivery_pin?: string
  delivery_fee_original?: string | null
  delivery_waiver?: DeliveryWaiver | null
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_reference?: string | null
  items_count?: number
  tracking?: Array<{ status: string; note: string | null; created_at: string }>
  /** يحدده الخادم؛ إن غاب نعتمد الحالة */
  can_cancel?: boolean
  /** المبلغ المخصوم من المحفظة — null إن لم تُستخدم */
  wallet_applied?: string | null
  /** المتبقي للدفع عند الاستلام — null إن لم تُستخدم المحفظة */
  amount_due?: string | null
  /** INV-3: وقت تأكيد الدفع (null قبل الدفع) */
  paid_at?: string | null
  /**
   * INV: مرجع فاتورة الطلب.
   * undefined = الخادم لا يدعم الفواتير بعد (لا نعرض شيئاً) · null = لم تصدر بعد (قبل الدفع) · كائن = صدرت
   */
  invoice?: InvoiceRef | null
  created_at: string
}

export interface WalletTransaction { id: number | string; type: string; label?: string | null; amount: string; order_number?: string | null; created_at: string }
export interface Wallet { balance: string; currency: string; transactions: WalletTransaction[]; /** false = المسار غير مفعّل في الخادم بعد */ available: boolean }

export interface ApiErrorBody {
  message: string
  errors?: Record<string, string[]>
}

export interface ApiList<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiData<T> {
  data: T
}


// =======================================================================
// Banners
// =======================================================================
export type BannerType = 'hero' | 'promo' | 'announcement'

export interface Banner {
  id: number
  type: BannerType
  title: string | null
  subtitle: string | null
  image_url: string | null
  link_url: string | null
  link_label: string | null
  starts_at: string | null
  ends_at: string | null
}

// =======================================================================
// Collections
// =======================================================================
export interface Collection {
  id: number
  name: string
  slug: string
  description: string | null
  image_url: string | null
  products_count?: number
}

// =======================================================================
// Site Settings
// =======================================================================
/** GET /settings → support (B-01) */
export interface StoreSupport {
  email: string | null
  phone: string | null
  whatsapp: string | null
  hours: string | null
  response_time: string | null
}

/** GET /settings → policies (B-01) — كل الحقول اختيارية؛ الواجهة عندها قيم احتياطية */
export interface StorePolicies {
  updated_at?: string | null
  return_window_days?: number | null
  acceptance_window_minutes?: number | null
  damage_report_hours?: number | null
  data_retention_months?: number | null
  /** null أو 0 = لا يوجد حد للتوصيل المجاني */
  free_delivery_threshold?: number | null
  cod_available?: boolean | null
  payment_methods?: string[] | null
}

/** GET /delivery-zones (B-02) بعد التطبيع */
export interface DeliveryZoneInfo {
  id: number
  name: string
  fee: number
  eta_minutes: number | null
  currency: string
}

/** مفاتيح أقسام الرئيسية القابلة للترتيب والإخفاء من لوحة الإدارة (settings.home.sections) */
export type HomeSectionKey = 'deals' | 'brands' | 'best_sellers' | 'picks' | 'promo' | 'new' | 'budget' | 'reorder' | 'recent' | 'services'

/** بند في شريط الثقة تحت الـ Hero */
export interface TrustItem { icon: 'truck' | 'shield' | 'refresh' | 'dollar' | 'clock' | 'whatsapp' | 'sparkle'; title: string; text?: string | null }

/** GET /settings → home (اختياري): ترتيب الأقسام وإظهارها + نصوص شريط الثقة */
export interface HomeSettings {
  sections: Array<{ key: HomeSectionKey; enabled: boolean }> | null
  trust: TrustItem[] | null
}

export interface SiteSettings {
  home?: HomeSettings | null
  support?: StoreSupport | null
  policies?: StorePolicies | null
  store_name: string
  tagline: string | null
  logo_url: string | null
  favicon_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  social_links?: Record<string, string>
}

// =======================================================================
// أنواع لوحة التاجر (Merchant Dashboard Types)
// =======================================================================
export interface MerchantStore {
  id: number
  name: string
  slug: string
  logo_url: string | null
  phone: string
  city: string
  area: string
  is_active: boolean
  commission_rate?: string
}

export interface MerchantProductItem {
  id: number
  name: string
  slug: string
  category_name: string
  image_url: string | null
  total_stock: number
  is_active: boolean
  price: number
}

export type MerchantPrepStatus = 'pending' | 'preparing' | 'ready_for_pickup' | 'picked_up'

export interface MerchantOrderItem {
  id: number
  order_number: string
  product_name: string
  variant_name: string
  unit_price: string
  quantity: number
  subtotal: string
  customer_name: string
  customer_area: string
  prep_status: MerchantPrepStatus
  created_at: string
  ready_at?: string | null
}

export interface MerchantStats {
  today_sales: string
  today_orders_count: number
  pending_prep_count: number
  ready_for_pickup_count: number
  low_stock_items_count: number
}

// =======================================================================
// أنواع لوحة التوصيل (Delivery Dashboard Types)
// =======================================================================
export type DeliveryStatus =
  | 'pending_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'returned'

export interface DeliveryMission {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  city: string
  area: string
  address_details: string
  items_count: number
  total_amount: string
  delivery_fee: string
  payment_status: 'unpaid' | 'paid' | 'pending'
  payment_method: 'jawwal_pay' | 'cash_on_delivery'
  delivery_status: DeliveryStatus
  pickup_stores: string[]
  driver_name: string | null
  driver_phone: string | null
  delivery_notes: string | null
  created_at: string
  estimated_delivery_time?: string
}

export interface DeliveryStats {
  total_active_deliveries: number
  pending_pickup_count: number
  in_transit_count: number
  delivered_today_count: number
  cash_to_collect_total: string
}

// ─────────────────────────────────────────────────────────────────────────────
// الفواتير (INV) — فاتورة مبيعات تصدر لحظة تأكيد الدفع، صورة ثابتة من الطلب لا تتغير بعدها.
// بدون ضريبة (INV-1). ممنوع أي حقل متجر/مورّد/عمولة (D-12) — البائع دائماً Gazabella.
// ─────────────────────────────────────────────────────────────────────────────

/** نص محفوظ باللغتين وقت الإصدار — يُعرض حسب لغة الواجهة (INV-5) */
export interface Bilingual { ar: string; en: string }

export type InvoiceStatus = 'issued' | 'partially_credited' | 'credited'

/** جوال باي أو المحفظة فقط (INV-2) — لا دفع عند الاستلام على الفواتير */
export type InvoicePaymentMethod = 'jawwal_pay' | 'wallet'

export interface InvoiceRef {
  invoice_number: string
  status: InvoiceStatus
  issued_at: string
}

export interface InvoicePayment {
  method: InvoicePaymentMethod
  amount: string
  /** مرجع عملية جوال باي — null للمحفظة */
  reference: string | null
  paid_at: string
}

export interface InvoiceLine {
  id: number
  name: Bilingual
  variant: Bilingual | null
  quantity: number
  unit_price: string
  line_total: string
  /** الكمية المستردة بإشعارات دائنة (0 إن لم يُسترد شيء) */
  credited_quantity: number
}

export interface CreditNoteLine { name: Bilingual; quantity: number; amount: string }

export interface CreditNote {
  credit_note_number: string
  issued_at: string
  amount: string
  reason: Bilingual
  /** الاسترداد دائماً إلى محفظة Gazabella */
  refunded_to: 'wallet'
  lines: CreditNoteLine[]
}

/** البائع: Gazabella فقط — المفتاح seller وليس store عمداً */
export interface InvoiceSeller {
  name: string
  address: Bilingual | null
  phone: string | null
  email: string | null
  website: string | null
}

export interface InvoiceCustomer {
  name: string
  /** جزء من الرقم مخفي من الخادم: 059•••4521 */
  phone_masked: string | null
  address: string | null
}

export interface InvoiceSummary {
  invoice_number: string
  order_number: string
  status: InvoiceStatus
  issued_at: string
  currency: 'ILS'
  total: string
  /** مجموع ما استُرد بإشعارات دائنة */
  credited_total: string
  payment_methods: InvoicePaymentMethod[]
  /** عدد المنتجات (البنود) في الفاتورة — وليس مجموع الكميات */
  items_count: number
  /** أول منتج — للعرض المختصر في القائمة والبحث */
  first_item: Bilingual | null
}

export interface Invoice extends InvoiceSummary {
  paid_at: string
  /** رمز عشوائي لصفحة التحقق العامة (ليس رقم الفاتورة) */
  verify_token: string
  seller: InvoiceSeller
  customer: InvoiceCustomer
  items: InvoiceLine[]
  subtotal: string
  discount_amount: string | null
  coupon_code: string | null
  delivery_fee: string
  /** رسوم التوصيل قبل الإعفاء — null إن لم يوجد إعفاء */
  delivery_fee_original: string | null
  payments: InvoicePayment[]
  credit_notes: CreditNote[]
}

export interface InvoiceListMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  /** السنوات التي فيها فواتير (تنازلياً) */
  years: number[]
}

export interface InvoiceList { data: InvoiceSummary[]; meta: InvoiceListMeta }

/** رد صفحة التحقق العامة — 5 حقول عامة فقط، بلا أي بيانات شخصية */
export interface InvoiceVerification {
  invoice_number: string
  issued_at: string
  currency: 'ILS'
  total: string
  status: InvoiceStatus
}
