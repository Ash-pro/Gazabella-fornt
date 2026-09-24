import { useAuthStore } from '../stores/authStore'
import { apiClient, getCartToken, setCartToken } from '../lib/apiClient'
import { mockServices } from '../mock/mockServices'
import type {
  ApiData,
  ApiList,
  AuthResponse,
  Banner,
  BannerType,
  Brand,
  Cart,
  Category,
  CheckoutPayload,
  Collection,
  DeliveryMission,
  DeliveryStats,
  DeliveryStatus,
  MerchantOrderItem,
  MerchantPrepStatus,
  MerchantProductItem,
  MerchantStats,
  MerchantStore,
  Order,
  ProductBrief,
  ProductDetail,
  SiteSettings,
  User,
} from '../types/api'

// ─────────────────────────────────────────────────────────────────────────────
// فلاتر المنتجات
//   category_slug / brand_slug  → للـ mock فقط (بيبني الفلتر من الـ slug)
//   category_id   / brand_id   → للـ API الحقيقي (integer IDs)
// ─────────────────────────────────────────────────────────────────────────────
export interface ProductFilters {
  // Mock mode
  category_slug?: string
  brand_slug?: string
  // Real API
  category_id?: number
  brand_id?: number
  collection_id?: number
  featured?: boolean
  in_stock?: boolean
  // مشتركة
  search?: string
  min_price?: number
  max_price?: number
  sort?: 'price' | '-price' | 'created_at' | '-created_at' | 'sort_order' | '-sort_order'
  page?: number
  per_page?: number
}

// Mock يعمل فقط عند VITE_DATA_SOURCE=mock صراحةً
export const isMockMode = (): boolean =>
  import.meta.env.VITE_DATA_SOURCE === 'mock'

// بيحول فلاتر الـ UI (slug-based) إلى params API-compatible
function toApiProductParams(filters: ProductFilters): Record<string, unknown> {
  const { category_slug: _cs, brand_slug: _bs, ...rest } = filters
  return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, typeof value === 'boolean' ? Number(value) : value]))
}


// ─────────────────────────────────────────────────────────────────────────────
// Cart API Response Normalizer
// API returns nested { product: {...}, line_total, ... }
// Our CartItem type expects flat fields (product_name, image_url, subtotal, ...)
// ─────────────────────────────────────────────────────────────────────────────
interface RawCartItem {
  id: number
  product: {
    id: number
    name: string
    slug: string
    price: number
    discount_price: number | null
    stock: number
    images?: Array<{ url: string; is_primary: boolean }>
  }
  quantity: number
  unit_price: number
  line_total: number
}

interface RawCart {
  id: number
  token?: string
  items: RawCartItem[]
  items_count: number
  subtotal: number
}

export function normalizeCart(raw: RawCart): Cart {
  // حفظ الـ token من الـ response body (في حال الـ CORS ما بيكشف الـ header)
  if (raw.token) setCartToken(raw.token)
  return {
    items: raw.items.map((item) => {
      const imgs = item.product.images ?? []
      const img = imgs.find((i) => i.is_primary) ?? imgs[0]
      return {
        id: item.id,
        product_id: item.product.id,
        product_name: item.product.name,
        variant_name: null,
        unit_price: String(item.unit_price),
        compare_at_price: item.product.discount_price != null ? String(item.product.price) : null,
        quantity: item.quantity,
        subtotal: String(item.line_total),
        image_url: img?.url ?? null,
        product_slug: item.product.slug,
        stock: item.product.stock,
      }
    }),
    total_items: raw.items_count,
    subtotal: String(raw.subtotal),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order API Response Normalizer
// API likely returns nested { product: {...}, line_total, ... } in order items
// Our Order type expects flat fields (product_name, image_url, subtotal, ...)
// Also guards against field-name variations (delivery_fee / shipping_fee, etc.)
// ─────────────────────────────────────────────────────────────────────────────
interface RawOrderItem {
  id: number
  product?: {
    id: number
    name: string
    slug?: string
    images?: Array<{ url: string; is_primary: boolean }>
  }
  product_name?: string
  image_url?: string | null
  quantity: number
  unit_price: number | string
  line_total?: number | string
  subtotal?: number | string
}

interface RawOrder {
  id: number
  order_number?: string
  status: string
  items: RawOrderItem[]
  subtotal: number | string
  delivery_fee?: number | string
  shipping_fee?: number | string
  total: number | string
  name?: string
  customer?: { name?: string; email?: string; phone?: string }
  email?: string
  phone?: string
  address?: string | Record<string, unknown>
  notes?: string | null
  payment_method?: string
  payment_status?: string
  escrow_expires_at?: string
  delivery_pin?: string
  tracking?: Array<{ status: string; note: string | null; created_at: string }>
  created_at: string
}

export function normalizeOrder(raw: RawOrder): Order {
  if (!raw || !Array.isArray(raw.items)) throw new Error('تفاصيل الطلب الواردة من الخادم غير مكتملة.')
  const amount = (value: unknown): string => {
    if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) {
      throw new Error('مبالغ الطلب الواردة من الخادم غير مكتملة.')
    }
    return String(value)
  }
  return {
    id: raw.id,
    order_number: raw.order_number ?? String(raw.id),
    status: raw.status as Order['status'],
    items: raw.items.map((item) => {
      const imgs = item.product?.images ?? []
      const img = imgs.find((i) => i.is_primary) ?? imgs[0]
      return {
        id: item.id,
        product_name: item.product?.name ?? item.product_name ?? '',
        variant_name: null,
        unit_price: amount(item.unit_price),
        quantity: item.quantity,
        subtotal: amount(item.line_total ?? item.subtotal),
        image_url: item.image_url ?? img?.url ?? null,
      }
    }),
    subtotal: amount(raw.subtotal),
    delivery_fee: amount(raw.delivery_fee ?? raw.shipping_fee),
    total: amount(raw.total),
    name: raw.name ?? raw.customer?.name ?? '',
    email: raw.email ?? raw.customer?.email ?? '',
    phone: raw.phone ?? raw.customer?.phone ?? '',
    address: typeof raw.address === 'string' ? raw.address : '',
    notes: raw.notes ?? null,
    payment_method: raw.payment_method as Order['payment_method'],
    payment_status: (raw.payment_status ?? 'unknown') as Order['payment_status'],
    escrow_expires_at: raw.escrow_expires_at,
    delivery_pin: raw.delivery_pin,
    tracking: raw.tracking ?? [],
    created_at: raw.created_at,
  }
}


function unavailable(): Promise<never> {
  return Promise.reject(new Error('هذه الخدمة غير متاحة حاليًا.'))
}

async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = []
  let page = 1
  let lastPage = 1
  do {
    const { data } = await apiClient.get<ApiList<T>>(path, { params: { page, per_page: 100 } })
    if (!Array.isArray(data.data)) throw new Error('استجابة غير صالحة من الخادم.')
    items.push(...data.data)
    lastPage = data.meta?.last_page ?? 1
    page++
  } while (page <= lastPage)
  return items
}
export function normalizeCategory(category: Category): Category {
  return { ...category, children: (category.children ?? []).map(normalizeCategory) }
}
interface RawSettings extends Partial<SiteSettings> {
  site_name?: string; support_phone?: string; support_email?: string; social?: Record<string, string>
}
export function normalizeSettings(raw: RawSettings): SiteSettings {
  return { store_name: raw.site_name ?? raw.store_name ?? 'Gazabella', tagline: raw.tagline ?? null,
    logo_url: raw.logo_url ?? null, favicon_url: raw.favicon_url ?? null, address: raw.address ?? null,
    phone: raw.support_phone ?? raw.phone ?? null, email: raw.support_email ?? raw.email ?? null,
    social_links: raw.social ?? raw.social_links }
}
interface RawBanner extends Banner { cta_text?: string | null; cta_url?: string | null }
export function normalizeBanner(raw: RawBanner): Banner {
  return { ...raw, link_label: raw.cta_text ?? raw.link_label ?? null, link_url: raw.cta_url ?? raw.link_url ?? null }
}

function normalizeAuth(response: AuthResponse | ApiData<AuthResponse>): AuthResponse {
  const data = 'data' in response ? response.data : response
  if (!data || typeof data.token !== 'string' || !data.token || !data.user || !Number.isInteger(data.user.id)) {
    throw new Error('استجابة تسجيل الدخول غير مكتملة. يرجى التواصل مع الدعم.')
  }
  return data
}

let guestCartRequest: Promise<Cart> | null = null
function fetchCart(): Promise<Cart> {
  if (useAuthStore.getState().token || getCartToken()) {
    return apiClient.get<ApiData<RawCart>>('/cart').then((r) => normalizeCart(r.data.data))
  }
  guestCartRequest ??= apiClient.get<ApiData<RawCart>>('/cart').then((r) => normalizeCart(r.data.data)).finally(() => { guestCartRequest = null })
  return guestCartRequest
}
async function ensureCartIdentity() {
  if (!useAuthStore.getState().token && !getCartToken()) await fetchCart()
  if (!useAuthStore.getState().token && !getCartToken()) throw new Error('تعذر حفظ هوية السلة. يرجى السماح بالتخزين في المتصفح.')
}

export const gazabellaApi = {
  // ── المصادقة ─────────────────────────────────────────────────────────
  register: (payload: { name: string; email: string; password: string; password_confirmation: string }): Promise<AuthResponse> =>
    isMockMode()
      ? mockServices.register(payload)
      : apiClient.post<AuthResponse | ApiData<AuthResponse>>('/auth/register', payload).then((r) => normalizeAuth(r.data)),

  login: (email: string, password: string): Promise<AuthResponse> =>
    isMockMode()
      ? mockServices.login(email, password)
      : apiClient.post<AuthResponse | ApiData<AuthResponse>>('/auth/login', { email, password }).then((r) => normalizeAuth(r.data)),

  getMe: (): Promise<User> =>
    isMockMode()
      ? mockServices.getMe()
      : apiClient.get<ApiData<User>>('/auth/me').then((r) => r.data.data),

  logout: () =>
    isMockMode()
      ? mockServices.logout()
      : apiClient.post('/auth/logout').then((r) => r.data),

  // ── الصفحة الرئيسية ──────────────────────────────────────────────────
  getHome: () =>
    isMockMode()
      ? mockServices.getHome()
      : apiClient.get('/home').then((r) => r.data),

  // ── الإعدادات والبانرات والكولكشنات ──────────────────────────────────
  getSettings: (): Promise<SiteSettings> =>
    isMockMode()
      ? mockServices.getSettings()
      : apiClient.get<ApiData<RawSettings>>('/settings').then((r) => normalizeSettings(r.data.data)),

  getBanners: (type?: BannerType): Promise<Banner[]> =>
    isMockMode()
      ? mockServices.getBanners(type)
      : apiClient.get<ApiList<RawBanner>>('/banners', { params: type ? { type } : undefined }).then((r) => r.data.data.map(normalizeBanner)),

  getCollections: (): Promise<Collection[]> =>
    isMockMode()
      ? mockServices.getCollections()
      : apiClient.get<ApiList<Collection>>('/collections').then((r) => r.data.data),

  // ── التصنيفات والبراندات ─────────────────────────────────────────────
  getCategories: (): Promise<Category[]> =>
    isMockMode()
      ? mockServices.getCategories()
      : allPages<Category>('/categories').then((items) => items.map(normalizeCategory)),

  getBrands: (): Promise<Brand[]> =>
    isMockMode()
      ? mockServices.getBrands()
      : allPages<Brand>('/brands'),

  // ── المنتجات ─────────────────────────────────────────────────────────
  // في API mode: يُحذف category_slug/brand_slug ويُستخدم category_id/brand_id
  getProducts: (filters: ProductFilters) =>
    isMockMode()
      ? mockServices.getProducts(filters)
      : apiClient.get<ApiList<ProductBrief>>('/products', { params: toApiProductParams(filters) }).then((r) => r.data),

  getProduct: (slug: string): Promise<ProductDetail> =>
    isMockMode()
      ? mockServices.getProduct(slug)
      : apiClient.get<ApiData<ProductDetail>>(`/products/${encodeURIComponent(slug)}`).then((r) => r.data.data),

  // ── القائمة المفضلة ──────────────────────────────────────────────────
  getWishlist: (): Promise<ProductBrief[]> =>
    isMockMode()
      ? mockServices.getWishlist()
      : allPages<ProductBrief>('/wishlist'),

  toggleWishlist: (productSlug: string): Promise<{ wishlisted: boolean }> =>
    isMockMode()
      ? mockServices.toggleWishlist(productSlug)
      : apiClient.post<{ wishlisted: boolean }>(`/wishlist/${encodeURIComponent(productSlug)}`).then((r) => r.data),

  // ── السلة ────────────────────────────────────────────────────────────
  getCart: (): Promise<Cart> =>
    isMockMode()
      ? mockServices.getCart()
      : fetchCart(),

  addToCart: (product_id: number, quantity: number): Promise<Cart> =>
    isMockMode()
      ? mockServices.addToCart(product_id, quantity)
      : ensureCartIdentity().then(() => apiClient.post<ApiData<RawCart>>('/cart/items', { product_id, quantity })).then((r) => normalizeCart(r.data.data)),

  updateCartItem: (itemId: number, quantity: number): Promise<Cart> =>
    isMockMode()
      ? mockServices.updateCartItem(itemId, quantity)
      : apiClient.patch<ApiData<RawCart>>(`/cart/items/${itemId}`, { quantity }).then((r) => normalizeCart(r.data.data)),

  removeCartItem: (itemId: number): Promise<Cart> =>
    isMockMode()
      ? mockServices.removeCartItem(itemId)
      : apiClient.delete<ApiData<RawCart>>(`/cart/items/${itemId}`).then((r) => normalizeCart(r.data.data)),

  clearCart: (): Promise<Cart> =>
    isMockMode()
      ? mockServices.clearCart()
      : apiClient.delete<ApiData<RawCart>>('/cart').then((r) => normalizeCart(r.data.data)),

  // ── الطلبات ──────────────────────────────────────────────────────────
  checkout: (payload: CheckoutPayload): Promise<Order> =>
    isMockMode()
      ? mockServices.checkout(payload)
      : Promise.reject(new Error('إتمام الطلب ينتظر خدمة احتساب الإجمالي ورسوم التوصيل.')),

  // API ما بدعم فلتر status — بنجيب كل الطلبات
  getOrders: (page = 1): Promise<ApiList<Order>> =>
    isMockMode()
      ? mockServices.getOrders()
      : apiClient.get<{ data: RawOrder[]; meta: import('../types/api').PaginationMeta }>('/orders', { params: { page, per_page: 15 } }).then((r) => ({ data: r.data.data.map(normalizeOrder), meta: r.data.meta })),

  // Mock: يقبل order_number (string) — API: يقبل integer ID
  getOrder: (orderId: number | string): Promise<Order> =>
    isMockMode()
      ? mockServices.getOrder(String(orderId))
      : apiClient.get<ApiData<RawOrder>>(`/orders/${encodeURIComponent(orderId)}`).then((r) => normalizeOrder(r.data.data)),

  // =======================================================================
  // لوحة التاجر — غير موجود في API الحالي؛ متاح في وضع العرض فقط
  // =======================================================================
  getMerchantStores: (): Promise<MerchantStore[]> =>
    isMockMode() ? mockServices.getMerchantStores() : unavailable(),

  getMerchantStats: (storeId = 1): Promise<MerchantStats> =>
    isMockMode() ? mockServices.getMerchantStats(storeId) : unavailable(),

  getMerchantProducts: (storeId = 1): Promise<MerchantProductItem[]> =>
    isMockMode() ? mockServices.getMerchantProducts(storeId) : unavailable(),

  getMerchantOrders: (storeId = 1): Promise<MerchantOrderItem[]> =>
    isMockMode() ? mockServices.getMerchantOrders(storeId) : unavailable(),

  updateOrderPrepStatus: (orderItemId: number, status: MerchantPrepStatus) =>
    isMockMode() ? mockServices.updateOrderPrepStatus(orderItemId, status) : unavailable(),

  // =======================================================================
  // لوحة التوصيل — غير موجود في API الحالي، يعمل بالـ mock دائماً
  // =======================================================================
  getDeliveryStats: (): Promise<DeliveryStats> =>
    isMockMode() ? mockServices.getDeliveryStats() : unavailable(),

  getDeliveryMissions: (filterStatus?: DeliveryStatus): Promise<DeliveryMission[]> =>
    isMockMode() ? mockServices.getDeliveryMissions(filterStatus) : unavailable(),

  updateDeliveryStatus: (missionId: number, status: DeliveryStatus, notes?: string): Promise<DeliveryMission[]> =>
    isMockMode() ? mockServices.updateDeliveryStatus(missionId, status, notes) : unavailable(),

  // =======================================================================
  // الدفع — غير موجود في API الحالي، يعمل بالـ mock دائماً
  // =======================================================================
  initPayment: (orderNumber: string): Promise<{ payment_url: string }> =>
    isMockMode() ? mockServices.initPayment(orderNumber) : unavailable(),
}
