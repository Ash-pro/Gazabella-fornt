export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
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
}

export interface ProductImage {
  url: string
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
}

export interface ProductVariant {
  id: number
  name: string
  price: number
  compare_at_price?: number | null
  available_quantity: number
}

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

/** GET /auth/me/export (B-10) */
export interface PersonalDataExport {
  exported_at: string
  profile: Record<string, unknown>
  orders: unknown[]
  [key: string]: unknown
}

export interface AuthResponse {
  token: string
  token_type: 'Bearer'
  user: User
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
    product_name: string
    variant_name?: string | null
    unit_price: string
    quantity: number
    subtotal: string
    image_url: string | null
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
  created_at: string
}

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

export interface SiteSettings {
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
