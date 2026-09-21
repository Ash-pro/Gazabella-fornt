import { apiClient } from '../lib/apiClient'
import { getGuestUuid } from '../lib/guest'
import { mockServices } from '../mock/mockServices'
import type {
  Address,
  ApiData,
  ApiList,
  AuthResponse,
  Cart,
  CartReservationResponse,
  Category,
  CheckoutSession,
  HeartbeatResponse,
  Order,
  ProductBrief,
  ProductDetail,
  MerchantStore,
  MerchantProductItem,
  MerchantOrderItem,
  MerchantPrepStatus,
  MerchantStats,
  DeliveryMission,
  DeliveryStatus,
  DeliveryStats,
} from '../types/api'

export interface ProductFilters {
  category_slugs?: string[]
  stores?: string[]
  category_slug?: string
  search?: string
  min_price?: number
  max_price?: number
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular'
  page?: number
  per_page?: number
}

// قراءة مصدر البيانات من البيئة (mock افتراضياً)
export const isMockMode = (): boolean => {
  const source = import.meta.env.VITE_DATA_SOURCE
  return source === 'mock' || !source
}

export const gazabellaApi = {
  // ── المصادقة والنظام ──
  health: () =>
    isMockMode() ? mockServices.health() : apiClient.get('/health').then((res) => res.data),

  initGuest: () =>
    isMockMode()
      ? mockServices.initGuest()
      : apiClient
          .post<{ guest_uuid: string; expires_at: string }>('/auth/guest/init', {
            guest_uuid: getGuestUuid(),
          })
          .then((res) => res.data),

  sendOtp: (phone: string) =>
    isMockMode()
      ? mockServices.sendOtp(phone)
      : apiClient
          .post<{ message: string; expires_in_seconds: number }>('/auth/otp/send', { phone })
          .then((res) => res.data),

  verifyOtp: (phone: string, otp: string) =>
    isMockMode()
      ? mockServices.verifyOtp(phone, otp)
      : apiClient
          .post<AuthResponse>('/auth/otp/verify', { phone, otp })
          .then((res) => res.data),

  logout: () =>
    isMockMode() ? mockServices.logout() : apiClient.post('/auth/logout').then((res) => res.data),

  // ── المنتجات والتصنيفات ──
  getCategories: () =>
    isMockMode()
      ? mockServices.getCategories()
      : apiClient.get<ApiData<Category[]>>('/categories').then((res) => res.data.data),

  getProducts: (filters: ProductFilters) =>
    isMockMode()
      ? mockServices.getProducts(filters)
      : apiClient
          .get<ApiList<ProductBrief>>('/products', { params: filters })
          .then((res) => res.data),

  getProduct: (slug: string) =>
    isMockMode()
      ? mockServices.getProduct(slug)
      : apiClient
          .get<ApiData<ProductDetail>>(`/products/${slug}`)
          .then((res) => res.data.data),

  // ── السلة والحجز ──
  getCart: () =>
    isMockMode()
      ? mockServices.getCart()
      : apiClient.get<ApiData<Cart>>('/cart').then((res) => res.data.data),

  addToCart: (product_variant_id: number, quantity: number) =>
    isMockMode()
      ? mockServices.addToCart(product_variant_id, quantity)
      : apiClient
          .post<ApiData<Cart>>('/cart', { product_variant_id, quantity })
          .then((res) => res.data.data),

  updateCartItem: (itemId: number, quantity: number) =>
    isMockMode()
      ? mockServices.updateCartItem(itemId, quantity)
      : apiClient
          .patch<ApiData<Cart>>(`/cart/${itemId}`, { quantity })
          .then((res) => res.data.data),

  removeCartItem: (itemId: number) =>
    isMockMode()
      ? mockServices.removeCartItem(itemId)
      : apiClient
          .delete<ApiData<Cart>>(`/cart/${itemId}`)
          .then((res) => res.data.data),

  reserveCart: () =>
    isMockMode()
      ? mockServices.reserveCart()
      : apiClient
          .post<CartReservationResponse>('/cart/reserve')
          .then((res) => res.data),

  heartbeat: () =>
    isMockMode()
      ? mockServices.heartbeat()
      : apiClient.post<HeartbeatResponse>('/cart/heartbeat').then((res) => res.data),

  // ── الدفع والطلبات ──
  beginCheckout: (coupon_code?: string) =>
    isMockMode()
      ? mockServices.beginCheckout(coupon_code)
      : apiClient
          .post<CheckoutSession>('/orders/checkout/begin', coupon_code ? { coupon_code } : {})
          .then((res) => res.data),

  createOrder: (payload: {
    delivery_option_id: number
    coupon_code?: string
    notes?: string
    address: Address
  }) =>
    isMockMode()
      ? mockServices.createOrder(payload)
      : apiClient
          .post<ApiData<Order> & { next_step: string }>('/orders', payload)
          .then((res) => res.data),

  getOrders: (status?: string) =>
    isMockMode()
      ? mockServices.getOrders(status)
      : apiClient
          .get<ApiList<Order>>('/orders', { params: status ? { status } : undefined })
          .then((res) => res.data),

  getOrder: (orderNumber: string) =>
    isMockMode()
      ? mockServices.getOrder(orderNumber)
      : apiClient
          .get<ApiData<Order>>(`/orders/${orderNumber}`)
          .then((res) => res.data.data),

  initPayment: (order_id: number) =>
    isMockMode()
      ? mockServices.initPayment(order_id)
      : apiClient
          .post<{ payment_url: string; payment_id: number; expires_at: string }>(
            '/payments/init',
            { order_id },
          )
          .then((res) => res.data),

  // =======================================================================
  // لوحة التاجر (Merchant Dashboard API)
  // =======================================================================
  getMerchantStores: (): Promise<MerchantStore[]> =>
    isMockMode()
      ? mockServices.getMerchantStores()
      : apiClient
          .get<ApiData<MerchantStore[]>>('/merchant/stores')
          .then((res) => res.data.data),

  getMerchantStats: (storeId = 1): Promise<MerchantStats> =>
    isMockMode()
      ? mockServices.getMerchantStats(storeId)
      : apiClient
          .get<ApiData<MerchantStats>>(`/merchant/${storeId}/stats`)
          .then((res) => res.data.data),

  getMerchantProducts: (storeId = 1): Promise<MerchantProductItem[]> =>
    isMockMode()
      ? mockServices.getMerchantProducts(storeId)
      : apiClient
          .get<ApiList<MerchantProductItem>>(`/merchant/${storeId}/products`)
          .then((res) => res.data.data),

  getMerchantOrders: (storeId = 1): Promise<MerchantOrderItem[]> =>
    isMockMode()
      ? mockServices.getMerchantOrders(storeId)
      : apiClient
          .get<ApiList<MerchantOrderItem>>(`/merchant/${storeId}/orders`)
          .then((res) => res.data.data),

  updateOrderPrepStatus: (orderItemId: number, status: MerchantPrepStatus) =>
    isMockMode()
      ? mockServices.updateOrderPrepStatus(orderItemId, status)
      : apiClient
          .patch(`/merchant/order-items/${orderItemId}/status`, { status })
          .then((res) => res.data),

  // =======================================================================
  // لوحة التوصيل (Delivery Dashboard API)
  // =======================================================================
  getDeliveryStats: (): Promise<DeliveryStats> =>
    isMockMode()
      ? mockServices.getDeliveryStats()
      : apiClient
          .get<ApiData<DeliveryStats>>('/delivery/stats')
          .then((res) => res.data.data),

  getDeliveryMissions: (filterStatus?: DeliveryStatus): Promise<DeliveryMission[]> =>
    isMockMode()
      ? mockServices.getDeliveryMissions(filterStatus)
      : apiClient
          .get<ApiList<DeliveryMission>>('/delivery/missions', { params: { status: filterStatus } })
          .then((res) => res.data.data),

  updateDeliveryStatus: (missionId: number, status: DeliveryStatus, notes?: string): Promise<DeliveryMission[]> =>
    isMockMode()
      ? mockServices.updateDeliveryStatus(missionId, status, notes)
      : apiClient
          .patch<ApiData<DeliveryMission[]>>(`/delivery/missions/${missionId}/status`, { status, notes })
          .then((res) => res.data.data),
}
