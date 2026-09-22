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
  is_wishlisted?: boolean
  category: { id: number; name: string }
}

export interface ProductVariant {
  id: number
  name: string
  price: string
  compare_at_price: string | null
  stock: number
  sku: string
}

export interface ProductDetail {
  store?: { name: string }
  id: number
  name: string
  slug: string
  description: string | null
  is_wishlisted?: boolean
  category: { id: number; name: string; slug: string }
  images: Array<{
    url: string | null
    alt_text: string | null
    is_primary: boolean
    sort_order: number
  }>
  variants: ProductVariant[]
}

export interface CartItem {
  id: number
  product_id: number
  product_name: string
  variant_name: string
  unit_price: string
  compare_at_price?: string | null
  quantity: number
  subtotal: string
  thumbnail_url: string | null
  product_slug: string | null
  stock: number
}

export interface Cart {
  items: CartItem[]
  total_items: number
  subtotal: string
}

export type UserRole = 'customer' | 'merchant' | 'delivery' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  created_at: string
}

export interface AuthResponse {
  token: string
  token_type: 'Bearer'
  user: User
}

export interface CheckoutPayload {
  name: string
  email: string
  phone: string
  address: string
  notes?: string
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
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
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
