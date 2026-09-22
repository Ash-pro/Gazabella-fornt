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
  register: (payload: { name: string; email: string; password: string; password_confirmation: string }) =>
    isMockMode()
      ? mockServices.verifyOtp('', '')
      : apiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data),

  login: (email: string, password: string) =>
    isMockMode()
      ? mockServices.verifyOtp('', '')
      : apiClient.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),

  getMe: (): Promise<User> =>
    isMockMode()
      ? Promise.resolve(null as unknown as User)
      : apiClient.get<ApiData<User>>('/auth/me').then((r) => r.data.data),

  logout: () =>
    isMockMode()
      ? mockServices.logout()
      : apiClient.post('/auth/logout').then((r) => r.data),

  // ── الصفحة الرئيسية ──────────────────────────────────────────────────
  getHome: () =>
    isMockMode()
      ? Promise.resolve({})
      : apiClient.get('/home').then((r) => r.data),

  // ── التصنيفات والبراندات ─────────────────────────────────────────────
  getCategories: () =>
    isMockMode()
      ? mockServices.getCategories()
      : apiClient.get<ApiData<Category[]>>('/categories').then((r) => r.data.data),

  getBrands: (): Promise<Brand[]> =>
    isMockMode()
      ? Promise.resolve([])
      : apiClient.get<ApiData<Brand[]>>('/brands').then((r) => r.data.data),

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
      ? Promise.resolve([])
      : apiClient.get<ApiData<ProductBrief[]>>('/wishlist').then((r) => r.data.data),

  toggleWishlist: (productId: number) =>
    isMockMode()
      ? Promise.resolve({ wishlisted: true })
      : apiClient.post<{ wishlisted: boolean }>(`/wishlist/${productId}`).then((r) => r.data),

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
      ? Promise.resolve({ order_number: 'MOCK-001', id: 1 } as Order)
      : apiClient.post<ApiData<Order>>('/checkout', payload).then((r) => r.data.data),

  getOrders: (status?: string) =>
    isMockMode()
      ? mockServices.getOrders(status)
      : apiClient.get<ApiList<Order>>('/orders', { params: status ? { status } : undefined }).then((r) => r.data),

  getOrder: (orderNumber: string) =>
    isMockMode()
      ? mockServices.getOrder(orderNumber)
      : apiClient.get<ApiData<Order>>(`/orders/${orderNumber}`).then((r) => r.data.data),

  // =======================================================================
  // لوحة التاجر
  // =======================================================================
  getMerchantStores: (): Promise<MerchantStore[]> =>
    isMockMode()
      ? mockServices.getMerchantStores()
      : apiClient.get<ApiData<MerchantStore[]>>('/merchant/stores').then((r) => r.data.data),

  getMerchantStats: (storeId = 1): Promise<MerchantStats> =>
    isMockMode()
      ? mockServices.getMerchantStats(storeId)
      : apiClient.get<ApiData<MerchantStats>>(`/merchant/${storeId}/stats`).then((r) => r.data.data),

  getMerchantProducts: (storeId = 1): Promise<MerchantProductItem[]> =>
    isMockMode()
      ? mockServices.getMerchantProducts(storeId)
      : apiClient.get<ApiList<MerchantProductItem>>(`/merchant/${storeId}/products`).then((r) => r.data.data),

  getMerchantOrders: (storeId = 1): Promise<MerchantOrderItem[]> =>
    isMockMode()
      ? mockServices.getMerchantOrders(storeId)
      : apiClient.get<ApiList<MerchantOrderItem>>(`/merchant/${storeId}/orders`).then((r) => r.data.data),

  updateOrderPrepStatus: (orderItemId: number, status: MerchantPrepStatus) =>
    isMockMode()
      ? mockServices.updateOrderPrepStatus(orderItemId, status)
      : apiClient.patch(`/merchant/order-items/${orderItemId}/status`, { status }).then((r) => r.data),

  // =======================================================================
  // لوحة التوصيل
  // =======================================================================
  getDeliveryStats: (): Promise<DeliveryStats> =>
    isMockMode()
      ? mockServices.getDeliveryStats()
      : apiClient.get<ApiData<DeliveryStats>>('/delivery/stats').then((r) => r.data.data),

  getDeliveryMissions: (filterStatus?: DeliveryStatus): Promise<DeliveryMission[]> =>
    isMockMode()
      ? mockServices.getDeliveryMissions(filterStatus)
      : apiClient.get<ApiList<DeliveryMission>>('/delivery/missions', { params: { status: filterStatus } }).then((r) => r.data.data),

  updateDeliveryStatus: (missionId: number, status: DeliveryStatus, notes?: string): Promise<DeliveryMission[]> =>
    isMockMode()
      ? mockServices.updateDeliveryStatus(missionId, status, notes)
      : apiClient.patch<ApiData<DeliveryMission[]>>(`/delivery/missions/${missionId}/status`, { status, notes }).then((r) => r.data.data),
}
