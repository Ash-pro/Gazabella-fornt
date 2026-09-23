import { apiClient } from '../lib/apiClient'
import { mockServices } from '../mock/mockServices'
import type {
  ApiData,
  ApiList,
  AuthResponse,
  Brand,
  Cart,
  Category,
  CheckoutPayload,
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
  User,
} from '../types/api'

export interface ProductFilters {
  category_slug?: string
  brand_slug?: string
  search?: string
  min_price?: number
  max_price?: number
  sort?: 'price' | '-price' | 'created_at' | '-created_at'
  page?: number
  per_page?: number
}

// Mock يعمل فقط عند VITE_DATA_SOURCE=mock صراحةً
export const isMockMode = (): boolean =>
  import.meta.env.VITE_DATA_SOURCE === 'mock'

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

  // ── التصنيفات والبراندات ─────────────────────────────────────────────
  getCategories: (): Promise<Category[]> =>
    isMockMode()
      ? mockServices.getCategories()
      : apiClient.get<ApiList<Category>>('/categories', { params: { per_page: 50 } }).then((r) => r.data.data),

  getBrands: (): Promise<Brand[]> =>
    isMockMode()
      ? mockServices.getBrands()
      : apiClient.get<ApiList<Brand>>('/brands', { params: { per_page: 50 } }).then((r) => r.data.data),

  // ── المنتجات ─────────────────────────────────────────────────────────
  getProducts: (filters: ProductFilters) =>
    isMockMode()
      ? mockServices.getProducts(filters)
      : apiClient.get<ApiList<ProductBrief>>('/products', { params: filters }).then((r) => r.data),

  getProduct: (slug: string) =>
    isMockMode()
      ? mockServices.getProduct(slug)
      : apiClient.get<ApiData<ProductDetail>>(`/products/${slug}`).then((r) => r.data.data),

  // ── القائمة المفضلة ──────────────────────────────────────────────────
  getWishlist: (): Promise<ProductBrief[]> =>
    isMockMode()
      ? mockServices.getWishlist()
      : apiClient.get<ApiList<ProductBrief>>('/wishlist').then((r) => r.data.data),

  // API يقبل product slug كـ path param
  toggleWishlist: (productSlug: string) =>
    isMockMode()
      ? mockServices.toggleWishlist(productSlug)
      : apiClient.post<{ wishlisted: boolean }>(`/wishlist/${productSlug}`).then((r) => r.data),

  // ── السلة ────────────────────────────────────────────────────────────
  getCart: () =>
    isMockMode()
      ? mockServices.getCart()
      : apiClient.get<ApiData<Cart>>('/cart').then((r) => r.data.data),

  addToCart: (product_id: number, quantity: number) =>
    isMockMode()
      ? mockServices.addToCart(product_id, quantity)
      : apiClient.post<ApiData<Cart>>('/cart/items', { product_id, quantity }).then((r) => r.data.data),

  updateCartItem: (itemId: number, quantity: number) =>
    isMockMode()
      ? mockServices.updateCartItem(itemId, quantity)
      : apiClient.patch<ApiData<Cart>>(`/cart/items/${itemId}`, { quantity }).then((r) => r.data.data),

  removeCartItem: (itemId: number) =>
    isMockMode()
      ? mockServices.removeCartItem(itemId)
      : apiClient.delete<ApiData<Cart>>(`/cart/items/${itemId}`).then((r) => r.data.data),

  // ── الطلبات ──────────────────────────────────────────────────────────
  checkout: (payload: CheckoutPayload) =>
    isMockMode()
      ? mockServices.checkout(payload)
      : apiClient.post<ApiData<Order>>('/checkout', payload).then((r) => r.data.data),

  getOrders: (status?: string) =>
    isMockMode()
      ? mockServices.getOrders(status)
      : apiClient.get<ApiList<Order>>('/orders', { params: status ? { status } : undefined }).then((r) => r.data),

  // ملاحظة: API يقبل integer ID — تأكد من route model binding في Laravel
  getOrder: (orderNumber: string) =>
    isMockMode()
      ? mockServices.getOrder(orderNumber)
      : apiClient.get<ApiData<Order>>(`/orders/${orderNumber}`).then((r) => r.data.data),

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
