import { demoProduct, demoPrep, demoSetPrep } from './demoOperations'
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
import type { ProductFilters } from '../api/gazabella'
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_DELIVERY_OPTIONS,
  INITIAL_MERCHANT_STORES,
  getStoredCart,
  saveStoredCart,
  getStoredOrders,
  saveStoredOrders,
  getStoredMissions,
  saveStoredMissions,
} from './mockDatabase'

function readCart(): Cart {
  const cart = getStoredCart()
  cart.items.forEach((item) => {
    if (item.reservation) item.reservation.seconds_remaining = Math.max(0, Math.ceil((Date.parse(item.reservation.expires_at) - Date.now()) / 1000))
  })
  cart.has_active_reservation = cart.items.length > 0 && cart.items.every((item) => (item.reservation?.seconds_remaining || 0) > 0)
  return cart
}

function validateStock(cart: Cart) {
  const variants = INITIAL_PRODUCTS.map(demoProduct).flatMap((p) => p.variants)
  if (cart.items.some((i) => i.quantity > (variants.find((v) => v.id === i.product_variant_id)?.available_quantity || 0))) throw new Error('تغيّر المخزون المتاح. راجعي كميات السلة قبل المتابعة.')
}
const MOCK_DELAY = Number(import.meta.env.VITE_MOCK_DELAY_MS || 250)

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const mockServices = {
  // ── Auth ──
  health: async () => delay({ status: 'healthy', mode: 'mock', time: new Date().toISOString() }),

  initGuest: async () =>
    delay({
      guest_uuid: 'mock-guest-uuid-' + Math.random().toString(36).substring(2, 10),
      expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    }),

  sendOtp: async (_phone: string) =>
    delay({
      message: 'تم إرسال رمز التحقق (رمز الاختبار للتجربة هو: 123456)',
      expires_in_seconds: 300,
    }),

  verifyOtp: async (phone: string, otp: string): Promise<AuthResponse> => {
    if (otp !== '123456') {
      throw Object.assign(new Error('رمز التحقق غير صحيح، يرجى إدخال 123456'), { response: { status: 422, data: { message: 'رمز التحقق غير صحيح، يرجى إدخال 123456' } } })
    }
    return delay({
      token: 'gazabella_mock_bearer_token_' + Date.now(),
      token_type: 'Bearer',
      user: {
        id: 101,
        name: 'أمل النجار',
        phone: phone || '+970599123456',
        role: 'customer' as const,
        created_at: new Date().toISOString(),
      },
      cart_merged: true,
    })
  },

  logout: async () => delay({ message: 'تم تسجيل الخروج بنجاح' }),

  // ── Products & Categories ──
  getCategories: async (): Promise<Category[]> => delay(INITIAL_CATEGORIES),

  getProducts: async (filters: ProductFilters): Promise<ApiList<ProductBrief>> => {
    let list = INITIAL_PRODUCTS.map(demoProduct)

    if (filters.category_slugs?.length) list = list.filter((p) => filters.category_slugs!.includes(p.category.slug))
    if (filters.stores?.length) list = list.filter((p) => p.store && filters.stores!.includes(p.store.name))

    // تصفية حسب الفئة أو الفئة الفرعية الذكية
    if (filters.category_slug) {
      const slug = filters.category_slug
      list = list.filter((p) => {
        if (p.category.slug === slug) return true
        if (p.slug.includes(slug)) return true

        // مطابقة ذكية للفئات الفرعية (Subcategories)
        if (slug === 'serums' && (p.name.includes('سيروم') || p.slug.includes('serum'))) return true
        if (slug === 'moisturizers' && (p.name.includes('كريم') || p.name.includes('ترطيب') || p.name.includes('سوفت'))) return true
        if (slug === 'sunscreens' && (p.name.includes('شمس') || p.name.includes('SPF') || p.name.includes('حماية'))) return true
        if (slug === 'lipsticks' && (p.name.includes('شفاه') || p.slug.includes('lipstick') || p.name.includes('روبي'))) return true
        if (slug === 'eyeshadow' && (p.name.includes('ظلال') || p.name.includes('باليت') || p.slug.includes('palette'))) return true
        if (slug === 'foundation' && (p.name.includes('أساس') || p.name.includes('كونسيلر'))) return true
        if (slug === 'halal-beauty' && p.category.slug === 'cosmetics') return true
        if (slug === 'oriental-perfumes' && (p.name.includes('عود') || p.name.includes('مسك') || p.name.includes('شرقي'))) return true
        if (slug === 'french-perfumes' && (p.name.includes('فرنسي') || p.name.includes('ورد') || p.slug.includes('rose'))) return true
        if (slug === 'body-mists' && (p.name.includes('معطر') || p.name.includes('رذاذ') || p.slug.includes('mist'))) return true
        if (slug === 'bridal-boxes' && (p.name.includes('بوكس') || p.name.includes('باقة') || p.name.includes('جهاز'))) return true
        if (slug === 'bridal-robes' && (p.name.includes('روب') || p.name.includes('حرير') || p.slug.includes('robe'))) return true
        if (slug === 'bridal-makeup' && (p.category.slug === 'bridal' || p.category.slug === 'cosmetics')) return true
        if (slug === 'bridal-care' && (p.category.slug === 'bridal' || p.category.slug === 'skincare')) return true
        if (slug === 'deadsea-products' && (p.name.includes('طين') || p.name.includes('أملاح') || p.slug.includes('dead-sea'))) return true
        if (slug === 'hair-masks' && (p.name.includes('شعر') || p.name.includes('ماسك') || p.name.includes('زيت'))) return true
        if (slug === 'organic-bath' && (p.category.slug === 'hair-deadsea')) return true
        if (slug === 'gift-boxes' && (p.name.includes('صندوق') || p.name.includes('هدية') || p.name.includes('بوكس'))) return true
        if ((slug === 'tools-nails' || slug === 'tools-brushes' || slug === 'nails-care') && (p.category.slug === 'tools-nails' || p.name.includes('فرش') || p.name.includes('أظافر'))) return true

        return false
      })
    }

    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      )
    }

    if (filters.min_price !== undefined) {
      list = list.filter((p) => Math.min(...p.variants.map((v) => Number(v.price))) >= filters.min_price!)
    }

    if (filters.max_price !== undefined) {
      list = list.filter((p) => Math.min(...p.variants.map((v) => Number(v.price))) <= filters.max_price!)
    }

    if (filters.sort === 'price_asc') {
      list.sort((a, b) => Math.min(...a.variants.map((v) => Number(v.price))) - Math.min(...b.variants.map((v) => Number(v.price))))
    } else if (filters.sort === 'price_desc') {
      list.sort((a, b) => Math.min(...b.variants.map((v) => Number(v.price))) - Math.min(...a.variants.map((v) => Number(v.price))))
    } else if (filters.sort === 'newest') {
      list.sort((a, b) => b.id - a.id)
    } else if (filters.sort === 'popular') {
      const rank = [2, 5, 1, 4, 3, 10, 7, 9, 11, 6, 8]
      list.sort((a, b) => rank.indexOf(a.id) - rank.indexOf(b.id))
    }

    const briefs: ProductBrief[] = list.map((p) => {
      const prices = p.variants.map((v) => Number(v.price))
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      const cheapest = p.variants.reduce((a, b) => Number(a.price) < Number(b.price) ? a : b)
      const compareAtPrice = cheapest.compare_at_price

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        store: p.store,
        thumbnail_url: p.images[0]?.url || null,
        min_price: min.toFixed(2),
        max_price: max.toFixed(2),
        compare_at_price: compareAtPrice,
        is_available: p.variants.some((v) => v.available_quantity > 0),
        category: { id: p.category.id, name: p.category.name },
      }
    })

    return delay({
      data: briefs.slice(((filters.page || 1) - 1) * (filters.per_page || 12), (filters.page || 1) * (filters.per_page || 12)),
      meta: {
        current_page: filters.page || 1,
        last_page: Math.max(1, Math.ceil(briefs.length / (filters.per_page || 12))),
        per_page: filters.per_page || 12,
        total: briefs.length,
      },
    })
  },

  getProduct: async (slug: string): Promise<ProductDetail> => {
    const found = INITIAL_PRODUCTS.find((p) => p.slug === slug)
    if (!found) {
      throw Object.assign(new Error('المنتج المطلوب غير موجود'), { response: { status: 404, data: { message: 'المنتج المطلوب غير موجود' } } })
    }
    return delay(demoProduct(found))
  },

  // ── Cart & Reservation ──
  getCart: async (): Promise<Cart> => delay(readCart()),

  addToCart: async (productVariantId: number, quantity: number): Promise<Cart> => {
    const cart = readCart()
    let foundProduct: ProductDetail | undefined
    let foundVariant: ProductDetail['variants'][number] | undefined

    for (const p of INITIAL_PRODUCTS.map(demoProduct)) {
      const v = p.variants.find((vr) => vr.id === productVariantId)
      if (v) {
        foundProduct = p
        foundVariant = v
        break
      }
    }

    if (!foundProduct || !foundVariant) {
      throw Object.assign(new Error('المتغير المطلوب غير موجود'), { response: { status: 404, data: { message: 'المتغير المطلوب غير موجود' } } })
    }

    const existingIndex = cart.items.findIndex((item) => item.product_variant_id === productVariantId)
    const requested = quantity + (cart.items[existingIndex]?.quantity || 0)
    if (quantity < 1 || !Number.isInteger(quantity) || requested > Math.min(10, foundVariant.available_quantity)) throw new Error('الكمية المطلوبة تتجاوز المخزون المتاح أو الحد الأقصى 10 قطع.')
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity
      cart.items[existingIndex].subtotal = (
        Number(cart.items[existingIndex].unit_price) * cart.items[existingIndex].quantity
      ).toFixed(2)
    } else {
      cart.items.push({
        id: Date.now(),
        product_variant_id: productVariantId,
        product_name: foundProduct.name,
        variant_name: foundVariant.name,
        unit_price: foundVariant.price,
        available_quantity: foundVariant.available_quantity,
        quantity,
        subtotal: (Number(foundVariant.price) * quantity).toFixed(2),
        thumbnail_url: foundProduct.images[0]?.url || '/images/products/serum.webp',
        reservation: {
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          seconds_remaining: 900,
          is_extended: false,
        },
      })
    }

    cart.total_items = cart.items.reduce((acc, i) => acc + i.quantity, 0)
    cart.subtotal = cart.items.reduce((acc, i) => acc + Number(i.subtotal), 0).toFixed(2)
    cart.has_active_reservation = cart.items.every((i) => (i.reservation?.seconds_remaining || 0) > 0)
    saveStoredCart(cart)

    return delay(cart)
  },

  updateCartItem: async (itemId: number, quantity: number): Promise<Cart> => {
    const cart = readCart()
    const item = cart.items.find((i) => i.id === itemId)
    if (item) {
      const variant = INITIAL_PRODUCTS.map(demoProduct).flatMap((p) => p.variants).find((v) => v.id === item.product_variant_id)
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > Math.min(10, variant?.available_quantity || 0)) throw new Error('الكمية المطلوبة غير متاحة.')
      if (quantity <= 0) {
        cart.items = cart.items.filter((i) => i.id !== itemId)
      } else {
        item.quantity = quantity
        item.subtotal = (Number(item.unit_price) * quantity).toFixed(2)
      }
      cart.total_items = cart.items.reduce((acc, i) => acc + i.quantity, 0)
      cart.subtotal = cart.items.reduce((acc, i) => acc + Number(i.subtotal), 0).toFixed(2)
      saveStoredCart(cart)
    }
    return delay(cart)
  },

  removeCartItem: async (itemId: number): Promise<Cart> => {
    const cart = readCart()
    cart.items = cart.items.filter((i) => i.id !== itemId)
    cart.total_items = cart.items.reduce((acc, i) => acc + i.quantity, 0)
    cart.subtotal = cart.items.reduce((acc, i) => acc + Number(i.subtotal), 0).toFixed(2)
    saveStoredCart(cart)
    return delay(cart)
  },

  reserveCart: async (): Promise<CartReservationResponse> => {
    const cart = readCart()
    if (!cart.items.length) throw new Error('أضيفي منتجات إلى السلة أولًا.')
    validateStock(cart)
    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    cart.items.forEach((item) => {
      if (item.reservation && item.reservation.seconds_remaining > 0) return
      item.reservation = {
        expires_at: reservedUntil,
        seconds_remaining: 900,
        is_extended: false,
      }
    })
    cart.has_active_reservation = true
    saveStoredCart(cart)
    return delay({
      data: cart,
      expires_at: cart.items.map((i) => i.reservation!.expires_at).sort()[0],
      seconds_remaining: Math.min(...cart.items.map((i) => i.reservation!.seconds_remaining)),
    })
  },

  heartbeat: async (): Promise<HeartbeatResponse> => {
    const cart = readCart()
    const expires = cart.items.map((i) => i.reservation?.expires_at).filter(Boolean).sort()[0]
    const seconds = expires ? Math.max(0, Math.ceil((Date.parse(expires) - Date.now()) / 1000)) : null
    return delay({ has_reservation: Boolean(seconds), seconds_remaining: seconds, is_extended: cart.items.some((i) => i.reservation?.is_extended), expires_at: expires || null })
  },
  beginCheckout: async (couponCode?: string): Promise<CheckoutSession> => {
    const cart = readCart()
    if (!cart.items.length || !cart.has_active_reservation) throw new Error('انتهى الحجز. عودي إلى السلة لتحديث التوافر.')
    if (couponCode && couponCode !== 'GAZA2026') throw new Error('رمز الخصم غير صالح.')
    cart.items.forEach((i) => {
      if (i.reservation && !i.reservation.is_extended) {
        i.reservation.expires_at = new Date(Date.parse(i.reservation.expires_at) + 15 * 60_000).toISOString()
        i.reservation.is_extended = true
      }
    })
    saveStoredCart(cart)
    const expires = cart.items.map((i) => i.reservation!.expires_at).sort()[0]
    return delay({ reservation_extended: true, expires_at: expires, seconds_remaining: Math.max(0, Math.ceil((Date.parse(expires) - Date.now()) / 1000)), cart, delivery_options: INITIAL_DELIVERY_OPTIONS.filter((d) => d.is_available), coupon: couponCode === 'GAZA2026' ? { code: 'GAZA2026', discount_type: 'fixed', discount_value: '20.00', discount_amount: Math.min(20, Number(cart.subtotal)).toFixed(2) } : null })
  },

  createOrder: async (payload: {
    delivery_option_id: number
    coupon_code?: string
    notes?: string
    address: Address
  }): Promise<ApiData<Order> & { next_step: string }> => {
    const cart = readCart()
    if (!cart.items.length || !cart.has_active_reservation) throw new Error('السلة فارغة أو انتهى الحجز. عودي إلى السلة.')
    validateStock(cart)
    if (payload.coupon_code && payload.coupon_code !== 'GAZA2026') throw new Error('رمز الخصم غير صالح.')
    if (payload.address.city !== 'خانيونس') throw new Error('التوصيل متاح في خانيونس حاليًا.')
    const orders = getStoredOrders()
    const deliveryOpt = INITIAL_DELIVERY_OPTIONS.find((d) => d.id === payload.delivery_option_id)
    if (!deliveryOpt?.is_available) throw new Error('اختاري طريقة توصيل متاحة.')

    const orderNum = 'GAZ-' + new Date().getFullYear() + '-' + String(Math.max(17, ...orders.map((o) => Number(o.order_number.split('-').at(-1)))) + 1).padStart(4, '0')
    const discount = payload.coupon_code === 'GAZA2026' ? Math.min(20, Number(cart.subtotal)) : 0
    const subtotalNum = Number(cart.subtotal || 0)
    const deliveryFeeNum = Number(deliveryOpt.fee)
    const totalNum = Math.max(0, subtotalNum + deliveryFeeNum - discount)
    const generatedPin = String(Math.floor(1000 + Math.random() * 9000))

    const newOrder: Order = {
      id: Date.now(),
      order_number: orderNum,
      status: 'confirmed',
      items: cart.items.map((i,index) => ({
        id: Math.max(0,...orders.flatMap((o) => o.items.map((item) => item.id))) + index + 1,
        product_name: i.product_name,
        variant_name: i.variant_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        subtotal: i.subtotal,
        thumbnail_url: i.thumbnail_url,
        product_variant_id: i.product_variant_id,
      })),
      subtotal: subtotalNum.toFixed(2),
      delivery_fee: deliveryFeeNum.toFixed(2),
      discount_amount: discount.toFixed(2),
      total: totalNum.toFixed(2),
      delivery_option: { name: deliveryOpt.name, estimated_days: deliveryOpt.estimated_days },
      address: payload.address,
      payment_status: 'unpaid',
      payment_method: 'cash_on_delivery',
      tracking: [
        { status: 'confirmed', note: 'تم تأكيد الطلب التجريبي — الدفع عند الاستلام', created_at: new Date().toISOString() },
      ],
      coupon_code: payload.coupon_code || null,
      notes: payload.notes || null,
      delivery_pin: generatedPin,
      created_at: new Date().toISOString(),
    }

    orders.unshift(newOrder)
    saveStoredOrders(orders)

    // تفريغ السلة بعد إتمام الطلب بنجاح
    saveStoredCart({ items: [], total_items: 0, subtotal: '0.00', has_active_reservation: false })

    // إضافة مهمة جديدة للوحة التوصيل تلقائياً
    const missions = getStoredMissions()
    missions.unshift({
      id: Date.now(),
      order_number: orderNum,
      customer_name: payload.address.full_name,
      customer_phone: payload.address.phone,
      city: payload.address.city,
      area: payload.address.area,
      address_details: payload.address.details,
      items_count: newOrder.items.length,
      total_amount: newOrder.total,
      delivery_fee: newOrder.delivery_fee,
      payment_status: 'unpaid',
      payment_method: 'cash_on_delivery',
      delivery_status: 'pending_pickup',
      pickup_stores: [...new Set(cart.items.map((i) => { const p = INITIAL_PRODUCTS.find((p) => p.variants.some((v) => v.id === i.product_variant_id)); if (!p) return 'متجر غير محدد'; const store = INITIAL_MERCHANT_STORES.find((s) => s.id === ((p.id - 1) % 3) + 1); return store?.name ?? 'متجر غير محدد' }))],
      driver_name: 'محمود أبو العوف',
      driver_phone: '0598112233',
      delivery_notes: payload.notes || null,
      created_at: new Date().toISOString().substring(0, 16).replace('T', ' '),
      estimated_delivery_time: deliveryOpt.description || undefined,
    })
    saveStoredMissions(missions)

    return delay({
      data: newOrder,
      next_step: 'confirmation',
    })
  },

  getOrders: async (status?: string): Promise<ApiList<Order>> => {
    let orders = getStoredOrders()
    if (status) orders = orders.filter((o) => o.status === status)
    return delay({
      data: orders,
      meta: { current_page: 1, last_page: 1, per_page: 20, total: orders.length },
    })
  },

  getOrder: async (orderNumber: string): Promise<Order> => {
    const orders = getStoredOrders()
    const found = orders.find((o) => o.order_number === orderNumber)
    if (!found) {
      throw Object.assign(new Error('الطلب غير موجود'), { response: { status: 404, data: { message: 'الطلب غير موجود' } } })
    }
    return delay(found)
  },

  initPayment: async (orderId: number) => {
    const orders = getStoredOrders()
    const order = orders.find((o) => o.id === orderId)
    if (!order) throw new Error('لم نعثر على الطلب.')
    if (order.payment_method === 'cash_on_delivery') throw new Error('الدفع لهذا الطلب عند الاستلام فقط.')
    if (order.status === 'cancelled' || order.status === 'refunded') throw new Error('هذا الطلب غير قابل للدفع.')
    if (order.payment_status !== 'paid') {
      order.payment_status = 'paid'
      order.status = 'confirmed'
      order.tracking.push({ status: 'confirmed', note: 'تم تأكيد الدفع التجريبي — لا توجد عملية مالية حقيقية', created_at: new Date().toISOString() })
      saveStoredOrders(orders)
      const missions = getStoredMissions()
      missions.filter((m) => m.order_number === order.order_number).forEach((m) => { m.payment_status = 'paid' })
      saveStoredMissions(missions)
    }
    return delay({ payment_url: '/orders/' + order.order_number + '?payment=success', payment_id: order.id, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() })
  },

  // =======================================================================
  // لوحة التاجر (Merchant Dashboard Services)
  // =======================================================================
  getMerchantStores: async (): Promise<MerchantStore[]> => delay(INITIAL_MERCHANT_STORES),

  getMerchantStats: async (storeId = 1): Promise<MerchantStats> => {
    const products = await mockServices.getMerchantProducts(storeId)
    const orders = await mockServices.getMerchantOrders(storeId)
    const today = new Date().toISOString().slice(0,10)
    const todayItems = orders.filter((o) => o.created_at.startsWith(today))
    return delay({today_sales: todayItems.reduce((sum, o) => sum + Number(o.subtotal),0).toFixed(2),today_orders_count: new Set(todayItems.map((o) => o.order_number)).size,pending_prep_count: orders.filter((o) => o.prep_status === 'preparing').length,ready_for_pickup_count: orders.filter((o) => o.prep_status === 'ready_for_pickup').length,low_stock_items_count:products.filter((p) => p.total_stock < 5).length})
  },

  getMerchantProducts: async (storeId = 1): Promise<MerchantProductItem[]> => {
    const list: MerchantProductItem[] = INITIAL_PRODUCTS.filter((p) => ((p.id - 1) % 3) + 1 === storeId).map(demoProduct).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category_name: p.category.name,
      thumbnail_url: p.images[0]?.url || null,
      variants_count: p.variants.length,
      total_stock: p.variants.reduce((acc, v) => acc + v.available_quantity, 0),
      is_active: true,
      min_price: Math.min(...p.variants.map((v) => Number(v.price))).toFixed(2),
      max_price: Math.max(...p.variants.map((v) => Number(v.price))).toFixed(2),
    }))
    return delay(list)
  },

  getMerchantOrders: async (storeId = 1): Promise<MerchantOrderItem[]> => {
    const orders = getStoredOrders().filter((o) => (o.payment_status === 'paid' || o.payment_method === 'cash_on_delivery') && !['cancelled','refunded'].includes(o.status))
    const items: MerchantOrderItem[] = []

    orders.forEach((o) => {
      o.items.forEach((item) => {
        const product = INITIAL_PRODUCTS.find((p) => p.variants.some((v) => v.id === item.product_variant_id))
        if (!product || ((product.id - 1) % 3) + 1 !== storeId) return
        items.push({
          id: item.id,
          order_number: o.order_number,
          product_name: item.product_name,
          variant_name: item.variant_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          customer_name: o.address?.full_name || 'زبون Gazabella',
          customer_area: o.address?.area || 'غزة',
          prep_status: ['shipped','delivered'].includes(o.status) ? 'picked_up' : demoPrep(item.id),
          created_at: o.created_at,
        })
      })
    })

    return delay(items)
  },

  updateOrderPrepStatus: async (orderItemId: number, status: MerchantPrepStatus) => {
    const orders = getStoredOrders()
    const order = orders.find((o) => o.items.some((i) => i.id === orderItemId))
    if (!order || (order.payment_status !== 'paid' && order.payment_method !== 'cash_on_delivery') || !['confirmed','processing'].includes(order.status)) throw new Error('هذا الطلب غير متاح للتجهيز.')
    demoSetPrep(orderItemId, status)
    if (order.status === 'confirmed') { order.status = 'processing'; order.tracking.push({status:'processing',note:'بدأ تجهيز الطلب لدى المتاجر',created_at:new Date().toISOString()}); saveStoredOrders(orders) }
    return delay({ success: true, order_item_id: orderItemId, status })
  },

  // =======================================================================
  // لوحة التوصيل (Delivery Dashboard Services)
  // =======================================================================
  getDeliveryStats: async (): Promise<DeliveryStats> => {
    const missions = getStoredMissions()
    const pending = missions.filter((m) => m.delivery_status === 'pending_pickup').length
    const transit = missions.filter((m) => m.delivery_status === 'in_transit' || m.delivery_status === 'picked_up').length
    const today = new Date().toISOString().slice(0,10)
    const delivered = getStoredOrders().filter((o) => o.status === 'delivered' && o.tracking.some((t) => t.status === 'delivered' && t.created_at.startsWith(today))).length

    return delay({
      total_active_deliveries: pending + transit,
      pending_pickup_count: pending,
      in_transit_count: transit,
      delivered_today_count: delivered,
      cash_to_collect_total: missions.filter((m) => m.payment_method === 'cash_on_delivery' && m.payment_status !== 'paid' && m.delivery_status !== 'returned').reduce((sum, m) => sum + Number(m.total_amount), 0).toFixed(2),
    })
  },

  getDeliveryMissions: async (filterStatus?: DeliveryStatus): Promise<DeliveryMission[]> => {
    let missions = getStoredMissions()
    if (filterStatus) {
      missions = missions.filter((m) => m.delivery_status === filterStatus)
    }
    return delay(missions)
  },

  updateDeliveryStatus: async (missionId: number, newStatus: DeliveryStatus, notes?: string): Promise<DeliveryMission[]> => {
    const missions = getStoredMissions()
    const m = missions.find((item) => item.id === missionId)
    if (!m) throw new Error('لم نعثر على مهمة التوصيل.')
    if (m.payment_method === 'jawwal_pay' && m.payment_status !== 'paid') throw new Error('يجب تأكيد الدفع قبل بدء التوصيل.')
    const next = {pending_pickup:'picked_up',picked_up:'in_transit'} as const
    if (!(m.delivery_status in next) || next[m.delivery_status as keyof typeof next] !== newStatus) throw new Error('هذا الانتقال غير متاح. تأكيد التسليم يحتاج الرمز الصحيح.')
    m.delivery_status = newStatus
    if (notes) m.delivery_notes = notes
    const orders = getStoredOrders()
    const order = orders.find((o) => o.order_number === m.order_number)
    if (order) {
      order.items.forEach((i) => demoSetPrep(i.id,'picked_up'))
      if (newStatus === 'in_transit') { order.status='shipped'; order.tracking.push({status:'shipped',note:'الطلب في الطريق مع المندوب',created_at:new Date().toISOString()}) }
      saveStoredOrders(orders)
    }
    saveStoredMissions(missions)
    return delay(missions)
  },
}
