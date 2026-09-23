import { apiClient } from '../lib/apiClient'
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
  return rest as Record<string, unknown>
}

export const gazabellaApi = {
  // ── المصادقة ─────────────────────────────────────────────────────────
  register: (payload: { name: string; email: string; password: string; password_confirmation: string }): Promise<AuthResponse> =>
    isMockMode()
      ? mockServices.register(payload)
      : apiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data),

  login: (email: string, password: string): Promise<AuthResponse> =>
    isMockMode()
      ? mockServices.login(email, password)
      : apiClient.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),

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
      : apiClient.get<ApiData<SiteSettings>>('/settings').then((r) => r.data.data),

  getBanners: (type?: BannerType): Promise<Banner[]> =>
    isMockMode()
      ? mockServices.getBanners(type)
      : apiClient.get<ApiList<Banner>>('/banners', { params: type ? { type } : undefined }).then((r) => r.data.data),

  getCollections: (): Promise<Collection[]> =>
    isMockMode()
      ? mockServices.getCollections()
      : apiClient.get<ApiList<Collection>>('/collections').then((r) => r.data.data),

  // ── التصنيفات والبراندات ─────────────────────────────────────────────
  getCategories: (): Promise<Category[]> =>
    isMockMode()
      ? mockServices.getCategories()
      : apiClient.get<ApiList<Category>>('/categories', { params: { per_page: 100 } }).then((r) => r.data.data),

  getBrands: (): Promise<Brand[]> =>
    isMockMode()
      ? mockServices.getBrands()
      : apiClient.get<ApiList<Brand>>('/brands', { params: { per_page: 100 } }).then((r) => r.data.data),

  // ── المنتجات ─────────────────────────────────────────────────────────
  // في API mode: يُحذف category_slug/brand_slug ويُستخدم category_id/brand_id
  getProducts: (filters: ProductFilters) =>
    isMockMode()
      ? mockServices.getProducts(filters)
      : apiClient.get<ApiList<ProductBrief>>('/products', { params: toApiProductParams(filters) }).then((r) => r.data),

  getProduct: (slug: string): Promise<ProductDetail> =>
    isMockMode()
      ? mockServices.getProduct(slug)
      : apiClient.get<ApiData<ProductDetail>>(`/products/${slug}`).then((r) => r.data.data),

  // ── القائمة المفضلة ──────────────────────────────────────────────────
  getWishlist: (): Promise<ProductBrief[]> =>
    isMockMode()
      ? mockServices.getWishlist()
      : apiClient.get<ApiList<ProductBrief>>('/wishlist').then((r) => r.data.data),

  toggleWishlist: (productSlug: string): Promise<{ wishlisted: boolean }> =>
    isMockMode()
      ? mockServices.toggleWishlist(productSlug)
      : apiClient.post<{ wishlisted: boolean }>(`/wishlist/${productSlug}`).then((r) => r.data),

  // ── السلة ────────────────────────────────────────────────────────────
  getCart: (): Promise<Cart> =>
    isMockMode()
      ? mockServices.getCart()
      : apiClient.get<ApiData<Cart>>('/cart').then((r) => r.data.data),

  addToCart: (product_id: number, quantity: number): Promise<Cart> =>
    isMockMode()
      ? mockServices.addToCart(product_id, quantity)
      : apiClient.post<ApiData<Cart>>('/cart/items', { product_id, quantity }).then((r) => r.data.data),

  updateCartItem: (itemId: number, quantity: number): Promise<Cart> =>
    isMockMode()
      ? mockServices.updateCartItem(itemId, quantity)
      : apiClient.patch<ApiData<Cart>>(`/cart/items/${itemId}`, { quantity }).then((r) => r.data.data),

  removeCartItem: (itemId: number): Promise<Cart> =>
    isMockMode()
      ? mockServices.removeCartItem(itemId)
      : apiClient.delete<ApiData<Cart>>(`/cart/items/${itemId}`).then((r) => r.data.data),

  clearCart: (): Promise<Cart> =>
    isMockMode()
      ? mockServices.clearCart()
      : apiClient.delete<ApiData<Cart>>('/cart').then((r) => r.data.data),

  // ── الطلبات ──────────────────────────────────────────────────────────
  checkout: (payload: CheckoutPayload): Promise<Order> =>
    isMockMode()
      ? mockServices.checkout(payload)
      : apiClient.post<ApiData<Order>>('/checkout', payload).then((r) => r.data.data),

  // API ما بدعم فلتر status — بنجيب كل الطلبات
  getOrders: (): Promise<ApiList<Order>> =>
    isMockMode()
      ? mockServices.getOrders()
      : apiClient.get<ApiList<Order>>('/orders').then((r) => r.data),

  // Mock: يقبل order_number (string) — API: يقبل integer ID
  getOrder: (orderId: number | string): Promise<Order> =>
    isMockMode()
      ? mockServices.getOrder(String(orderId))
      : apiClient.get<ApiData<Order>>(`/orders/${orderId}`).then((r) => r.data.data),

  // =======================================================================
  // لوحة التاجر — غير موجود في API الحالي، يعمل بالـ mock دائماً
  // =======================================================================
  getMerchantStores: (): Promise<MerchantStore[]> =>
    mockServices.getMerchantStores(),

  getMerchantStats: (storeId = 1): Promise<MerchantStats> =>
    mockServices.getMerchantStats(storeId),

  getMerchantProducts: (storeId = 1): Promise<MerchantProductItem[]> =>
    mockServices.getMerchantProducts(storeId),

  getMerchantOrders: (storeId = 1): Promise<MerchantOrderItem[]> =>
    mockServices.getMerchantOrders(storeId),

  updateOrderPrepStatus: (orderItemId: number, status: MerchantPrepStatus) =>
    mockServices.updateOrderPrepStatus(orderItemId, status),

  // =======================================================================
  // لوحة التوصيل — غير موجود في API الحالي، يعمل بالـ mock دائماً
  // =======================================================================
  getDeliveryStats: (): Promise<DeliveryStats> =>
    mockServices.getDeliveryStats(),

  getDeliveryMissions: (filterStatus?: DeliveryStatus): Promise<DeliveryMission[]> =>
    mockServices.getDeliveryMissions(filterStatus),

  updateDeliveryStatus: (missionId: number, status: DeliveryStatus, notes?: string): Promise<DeliveryMission[]> =>
    mockServices.updateDeliveryStatus(missionId, status, notes),

  // =======================================================================
  // الدفع — غير موجود في API الحالي، يعمل بالـ mock دائماً
  // =======================================================================
  initPayment: (orderNumber: string): Promise<{ payment_url: string }> =>
    mockServices.initPayment(orderNumber),
}
