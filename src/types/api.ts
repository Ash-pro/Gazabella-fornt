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
  store?: { name: string }
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
  store?: { name: string }
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
  payment_method: 'jawwal_pay' | 'cash_on_delivery'
  payment_reference?: string
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
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'unknown'
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
export interface SiteSettings {
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
