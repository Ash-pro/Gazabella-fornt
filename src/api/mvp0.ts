import { apiClient } from '../lib/apiClient'
import { clearGuestUuid, getGuestUuid } from '../lib/guest'
import { useAuthStore } from '../stores/authStore'
import type { ProductFilters } from './gazabella'
import type { ApiList, AuthResponse, Cart, Category, CheckoutBegin, CheckoutQuote, Mvp0CheckoutPayload, Order, ProductDetail, ProductImage, ProductVariant, SiteSettings, User } from '../types/api'

export function normalizePhone(phone: string) {
  const digits = phone.replace(/[\s()-]/g, '')
  if (/^05\d{8}$/.test(digits)) return '+970' + digits.slice(1)
  if (/^5\d{8}$/.test(digits)) return '+970' + digits
  if (/^\+?9705\d{8}$/.test(digits)) return '+' + digits.replace(/^\+/, '')
  throw new Error('أدخل رقمًا فلسطينيًا بصيغة 0591234567 أو +970591234567')
}

interface RawProduct {
  id: number; name: string; slug: string; min_price: number; description?: string
  thumbnail_url?: string; images?: ProductImage[]; variants: ProductVariant[]
  category: ProductDetail['category']
}
export function normalizeMvp0Product(raw: RawProduct): ProductDetail {
  const stock = raw.variants.reduce((sum, v) => sum + v.available_quantity, 0)
  const cheapest = [...raw.variants].sort((a, b) => Number(a.price) - Number(b.price))[0]
  const current = Number(cheapest?.price ?? raw.min_price)
  const original = cheapest?.compare_at_price != null && Number(cheapest.compare_at_price) > current ? Number(cheapest.compare_at_price) : null
  return { id: raw.id, name: raw.name, slug: raw.slug, price: original ?? current, discount_price: original ? current : null,
    description: raw.description ?? null, category: raw.category, stock, in_stock: stock > 0,
    variants: raw.variants, images: raw.images ?? (raw.thumbnail_url ? [{ url: raw.thumbnail_url, alt_text: raw.name, is_primary: true, sort_order: 0 }] : []) }
}

interface RawCart {
  items: Array<{ id: number; product_id: number; product_variant_id: number; product_slug: string | null; stock: number; product_name: string; variant_name: string; unit_price: string; quantity: number; subtotal: string; thumbnail_url: string | null }>
  total_items: number; subtotal: string; has_active_reservation: boolean
}
export function normalizeMvp0Cart(raw: RawCart): Cart {
  return { total_items: raw.total_items, subtotal: raw.subtotal, has_active_reservation: raw.has_active_reservation,
    items: raw.items.map(item => ({ ...item, image_url: item.thumbnail_url })) }
}

export function normalizeMvp0Order(raw: Omit<Order, 'address' | 'payment_status' | 'items'> & {
  address: Mvp0CheckoutPayload['address']; payment_status: string;
  items: Array<Order['items'][number] & { thumbnail_url?: string }>
}): Order {
  const amount = (value: unknown) => {
    if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('مبالغ الطلب غير مكتملة.')
    return String(value)
  }
  if (!Array.isArray(raw.items) || !raw.order_number) throw new Error('تفاصيل الطلب غير مكتملة.')
  const status = ({ unpaid: 'pending', completed: 'paid', pending: 'pending', failed: 'failed', refunded: 'refunded' } as const)[raw.payment_status as 'unpaid']
  if (!status) throw new Error('حالة الدفع غير معروفة.')
  return { id: raw.id, order_number: raw.order_number, status: raw.status,
    items: raw.items.map(i => ({ id: i.id, product_name: i.product_name, variant_name: i.variant_name, quantity: i.quantity, unit_price: amount(i.unit_price), subtotal: amount(i.subtotal), image_url: i.thumbnail_url ?? null })),
    subtotal: amount(raw.subtotal), delivery_fee: amount(raw.delivery_fee), total: amount(raw.total),
    discount_amount: amount(raw.discount_amount ?? 0),
    name: raw.address.full_name, phone: raw.address.phone, email: '',
    address: [raw.address.city, raw.address.area, raw.address.details, raw.address.landmark].filter(Boolean).join('، '),
    payment_method: raw.payment_method, payment_status: status, notes: raw.notes,
    tracking: raw.tracking, created_at: raw.created_at }
}

let guestInit: Promise<void> | null = null
async function ensureGuest() {
  if (useAuthStore.getState().token) return
  guestInit ??= apiClient.post('/auth/guest/init', { guest_uuid: getGuestUuid() }).then(() => undefined).finally(() => { guestInit = null })
  await guestInit
}
const cart = (response: { data: { data: RawCart } }) => normalizeMvp0Cart(response.data.data)
const unavailable = async (): Promise<never> => { throw new Error('هذه الخدمة غير متاحة في MVP0.') }

export const mvp0Api = {
  async otpSend(phone: string) {
    const { data } = await apiClient.post('/auth/otp/send', { phone: normalizePhone(phone) })
    return { message: data.message as string }
  },
  async otpVerify(phone: string, otp: string, name?: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/otp/verify', { phone: normalizePhone(phone), otp, ...(name ? { name } : {}) }, { headers: { 'X-Guest-UUID': getGuestUuid() } })
    if (!data.token || !Number.isInteger(data.user?.id)) throw new Error('استجابة تسجيل الدخول غير مكتملة.')
    clearGuestUuid()
    return data
  },
  getMe: () => apiClient.get<{ data: User }>('/auth/me').then(r => r.data.data),
  async getCategories(): Promise<Category[]> {
    const { data } = await apiClient.get<{ data: Array<Category & { subcategories?: Category[] }> }>('/categories')
    return data.data.map(c => ({ ...c, children: (c.subcategories ?? []).map(child => ({ ...child, children: [] })) }))
  },
  async getProducts(filters: ProductFilters): Promise<ApiList<ProductDetail>> {
    const { data } = await apiClient.get<ApiList<RawProduct>>('/products', { params: {
      category: filters.category_slug, category_id: filters.category_id, search: filters.search,
      min_price: filters.min_price, max_price: filters.max_price,
      sort: filters.sort === 'price' ? 'price_asc' : filters.sort === '-price' ? 'price_desc' : 'newest', page: filters.page, per_page: filters.per_page,
    } })
    return { ...data, data: data.data.map(normalizeMvp0Product) }
  },
  getProduct: (slug: string) => apiClient.get(`/products/${encodeURIComponent(slug)}`).then(r => normalizeMvp0Product(r.data.data)),
  async getCart() { await ensureGuest(); return cart(await apiClient.get('/cart')) },
  async addToCart(variantId: number, quantity: number) { await ensureGuest(); return cart(await apiClient.post('/cart', { product_variant_id: variantId, quantity })) },
  updateCartItem: (id: number, quantity: number) => apiClient.patch(`/cart/${id}`, { quantity }).then(cart),
  removeCartItem: (id: number) => apiClient.delete(`/cart/${id}`).then(cart),
  clearCart: unavailable,
  getOrders: (page = 1): Promise<ApiList<Order>> => apiClient.get('/orders', { params: { page } }).then(r => ({ ...r.data, data: r.data.data.map(normalizeMvp0Order) })),
  getOrder: (number: string | number) => apiClient.get(`/orders/${encodeURIComponent(number)}`).then(r => normalizeMvp0Order(r.data.data)),
  checkout: unavailable,
  confirmJawwalPayment: unavailable,
  lookupOrderByReference: unavailable,
  initPayment: async (number: string): Promise<{ payment_url: string }> => {
    const order = await mvp0Api.getOrder(number)
    const { data } = await apiClient.post('/payments/init', { order_id: order.id })
    return data
  },
  getSettings: async (): Promise<SiteSettings> => ({ store_name: 'Gazabella', tagline: null, logo_url: null, favicon_url: null, phone: null, email: null, address: null, social_links: {} }),
  getBanners: async () => [],
  getCollections: async () => [],
  getBrands: async () => [],
  getWishlist: unavailable,
  toggleWishlist: unavailable,
}

export const mvp0Checkout = {
  reserve: () => apiClient.post('/cart/reserve').then(r => r.data as { expires_at: string; seconds_remaining: number }),
  begin: (): Promise<CheckoutBegin> => apiClient.post('/orders/checkout/begin').then(r => r.data),
  quote: (delivery_option_id: number, city: string, coupon_code?: string): Promise<CheckoutQuote> => apiClient.post('/orders/checkout/quote', { delivery_option_id, city, ...(coupon_code ? { coupon_code } : {}) }).then(r => r.data.data),
  create: (payload: Mvp0CheckoutPayload, key: string): Promise<Order> => apiClient.post('/orders', payload, { headers: { 'Idempotency-Key': key } }).then(r => normalizeMvp0Order(r.data.data)),
}
