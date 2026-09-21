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

export interface ProductBrief {
  store?: { name: string }
  id: number
  name: string
  slug: string
  thumbnail_url: string | null
  min_price: string
  max_price: string
  compare_at_price?: string | null
  is_available: boolean
  category: { id: number; name: string }
}

export interface ProductVariant {
  id: number
  name: string
  price: string
  compare_at_price: string | null
  available_quantity: number
  sku: string
}

export interface ProductDetail {
  store?: { name: string }
  id: number
  name: string
  slug: string
  description: string | null
  category: { id: number; name: string; slug: string }
  images: Array<{
    url: string | null
    alt_text: string | null
    is_primary: boolean
    sort_order: number
  }>
  variants: ProductVariant[]
}

export interface Reservation {
  expires_at: string
  seconds_remaining: number
  is_extended: boolean
}

export interface CartItem {
  id: number
  product_variant_id: number
  product_name: string
  variant_name: string
  unit_price: string
  quantity: number
  subtotal: string
  thumbnail_url: string | null
  reservation: Reservation | null
}

export interface Cart {
  items: CartItem[]
  total_items: number
  subtotal: string
  has_active_reservation: boolean
}

export interface CartReservationResponse {
  data: Cart
  expires_at: string
  reserved_until?: string
  seconds_remaining: number
}

export interface HeartbeatResponse {
  has_reservation: boolean
  seconds_remaining: number | null
  is_extended: boolean
  expires_at: string | null
}

export interface User {
  id: number
  name: string | null
  phone: string
  created_at: string
}

export interface AuthResponse {
  token: string
  token_type: 'Bearer'
  user: User
  cart_merged: boolean
}

export interface DeliveryOption {
  id: number
  name: string
  description: string | null
  fee: string
  estimated_days: number
  is_available: boolean
}

export interface Coupon {
  code: string
  discount_type: 'fixed' | 'percentage'
  discount_value: string
  discount_amount: string
}

export interface CheckoutSession {
  reservation_extended: boolean
  expires_at: string
  reserved_until?: string
  seconds_remaining: number
  cart: Cart
  delivery_options: DeliveryOption[]
  coupon: Coupon | null
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
  id: number
  order_number: string
  status: OrderStatus
  items: Array<{
    id: number
    product_name: string
    variant_name: string
    unit_price: string
    quantity: number
    subtotal: string
    thumbnail_url: string | null
    product_variant_id: number
  }>
  subtotal: string
  delivery_fee: string
  discount_amount: string
  total: string
  delivery_option: { name: string; estimated_days: number }
  address: Address | null
  payment_method?: 'cash_on_delivery' | 'jawwal_pay'
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
  tracking: Array<{ status: string; note: string | null; created_at: string }>
  coupon_code: string | null
  notes: string | null
  delivery_pin?: string
  escrow_expires_at?: string
  created_at: string
}

export interface Address {
  full_name: string
  phone: string
  city: string
  area: string
  details: string
  landmark?: string | null
  lat?: number | null
  lng?: number | null
  save_address?: boolean
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
  commission_rate?: string // للتاجر فقط
}

export interface MerchantProductItem {
  id: number
  name: string
  slug: string
  category_name: string
  thumbnail_url: string | null
  variants_count: number
  total_stock: number
  is_active: boolean
  min_price: string
  max_price: string
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
  pickup_stores: string[] // أسماء المتاجر المستلم منها
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

