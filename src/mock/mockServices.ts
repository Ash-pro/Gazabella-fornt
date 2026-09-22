import { demoProduct, demoPrep, demoSetPrep } from './demoOperations'
import type {
  ApiData,
  ApiList,
  AuthResponse,
  Cart,
  Category,
  CheckoutPayload,
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
  return getStoredCart()
}

function validateStock(cart: Cart) {
  const products = INITIAL_PRODUCTS.map(demoProduct)
  if (cart.items.some((i) => {
    const product = products.find((p) => p.id === i.product_id)
    return i.quantity > (product?.variants[0]?.stock ?? 0)
  })) throw new Error('تغيّر المخزون المتاح. راجعي كميات السلة قبل المتابعة.')
}

const MOCK_DELAY = Number(import.meta.env.VITE_MOCK_DELAY_MS || 250)

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const mockServices = {
  // ── Auth ──
  health: async () => delay({ status: 'healthy', mode: 'mock', time: new Date().toISOString() }),

  verifyOtp: async (_phone: string, otp: string): Promise<AuthResponse> => {
    if (otp !== '123456' && otp !== '') {
      throw Object.assign(new Error('كلمة المرور غير صحيحة، يرجى إدخال 123456'), { response: { status: 422, data: { message: 'كلمة المرور غير صحيحة، يرجى إدخال 123456' } } })
    }
    return delay({
      token: 'gazabella_mock_bearer_token_' + Date.now(),
      token_type: 'Bearer' as const,
      user: {
        id: 101,
        name: 'أمل النجار',
        email: 'amal@example.com',
        role: 'customer' as const,
        created_at: new Date().toISOString(),
      },
    })
  },

  logout: async () => delay({ message: 'تم تسجيل الخروج بنجاح' }),

  // ── Products & Categories ──
  getCategories: async (): Promise<Category[]> => delay(INITIAL_CATEGORIES),

  getProducts: async (filters: ProductFilters): Promise<ApiList<ProductBrief>> => {
    let list = INITIAL_PRODUCTS.map(demoProduct)

    if (filters.category_slug) {
      const slug = filters.category_slug
      list = list.filter((p) => {
        if (p.category.slug === slug) return true
        if (p.slug.includes(slug)) return true
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

    if (filters.sort === 'price') {
      list.sort((a, b) => Math.min(...a.variants.map((v) => Number(v.price))) - Math.min(...b.variants.map((v) => Number(v.price))))
    } else if (filters.sort === '-price') {
      list.sort((a, b) => Math.min(...b.variants.map((v) => Number(v.price))) - Math.min(...a.variants.map((v) => Number(v.price))))
    } else if (filters.sort === 'created_at') {
      list.sort((a, b) => a.id - b.id)
    } else if (filters.sort === '-created_at') {
      list.sort((a, b) => b.id - a.id)
    }

    const briefs: ProductBrief[] = list.map((p) => {
      const prices = p.variants.map((v) => Number(v.price))
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      const cheapest = p.variants.reduce((a, b) => Number(a.price) < Number(b.price) ? a : b)
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        store: p.store,
        thumbnail_url: p.images[0]?.url || null,
        min_price: min.toFixed(2),
        max_price: max.toFixed(2),
        compare_at_price: cheapest.compare_at_price,
        is_available: p.variants.some((v) => v.stock > 0),
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

  // ── Cart ──
  getCart: async (): Promise<Cart> => delay(readCart()),

  addToCart: async (productId: number, quantity: number): Promise<Cart> => {
    const cart = readCart()
    const product = INITIAL_PRODUCTS.map(demoProduct).find((p) => p.id === productId)
    if (!product) {
      throw Object.assign(new Error('المنتج غير موجود'), { response: { status: 404, data: { message: 'المنتج غير موجود' } } })
    }
    const variant = product.variants[0]
    if (!variant) throw new Error('لا تتوفر متغيرات لهذا المنتج.')

    const existingIndex = cart.items.findIndex((item) => item.product_id === productId)
    const requested = quantity + (cart.items[existingIndex]?.quantity || 0)
    if (quantity < 1 || !Number.isInteger(quantity) || requested > Math.min(10, variant.stock)) {
      throw new Error('الكمية المطلوبة تتجاوز المخزون المتاح أو الحد الأقصى 10 قطع.')
    }

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity
      cart.items[existingIndex].subtotal = (
        Number(cart.items[existingIndex].unit_price) * cart.items[existingIndex].quantity
      ).toFixed(2)
    } else {
      cart.items.push({
        id: Date.now(),
        product_id: productId,
        product_name: product.name,
        variant_name: variant.name,
        unit_price: variant.price,
        stock: variant.stock,
        quantity,
        subtotal: (Number(variant.price) * quantity).toFixed(2),
        thumbnail_url: product.images[0]?.url || '/images/products/serum.webp',
        product_slug: product.slug,
      })
    }

    cart.total_items = cart.items.reduce((acc, i) => acc + i.quantity, 0)
    cart.subtotal = cart.items.reduce((acc, i) => acc + Number(i.subtotal), 0).toFixed(2)
    saveStoredCart(cart)
    return delay(cart)
  },

  updateCartItem: async (itemId: number, quantity: number): Promise<Cart> => {
    const cart = readCart()
    const item = cart.items.find((i) => i.id === itemId)
    if (item) {
      const product = INITIAL_PRODUCTS.map(demoProduct).find((p) => p.id === item.product_id)
      const maxStock = product?.variants[0]?.stock ?? 0
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > Math.min(10, maxStock)) throw new Error('الكمية المطلوبة غير متاحة.')
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

  // ── Checkout ──
  checkout: async (payload: CheckoutPayload): Promise<Order> => {
    const cart = readCart()
    if (!cart.items.length) throw new Error('أضيفي منتجات إلى السلة أولًا.')
    validateStock(cart)

    const orders = getStoredOrders()
    const defaultDelivery = INITIAL_DELIVERY_OPTIONS.find((d) => d.is_available) || INITIAL_DELIVERY_OPTIONS[0]
    const orderNum = 'GAZ-' + new Date().getFullYear() + '-' + String(Math.max(17, ...orders.map((o) => Number(o.order_number.split('-').at(-1) || '0'))) + 1).padStart(4, '0')
    const subtotalNum = Number(cart.subtotal || 0)
    const deliveryFeeNum = Number(defaultDelivery?.fee || '5.00')
    const totalNum = subtotalNum + deliveryFeeNum
    const generatedPin = String(Math.floor(1000 + Math.random() * 9000))

    const newOrder: Order = {
      id: Date.now(),
      order_number: orderNum,
      status: 'confirmed',
      items: cart.items.map((i, index) => ({
        id: Math.max(0, ...orders.flatMap((o) => o.items.map((item) => item.id))) + index + 1,
        product_name: i.product_name,
        variant_name: i.variant_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        subtotal: i.subtotal,
        thumbnail_url: i.thumbnail_url,
      })),
      subtotal: subtotalNum.toFixed(2),
      delivery_fee: deliveryFeeNum.toFixed(2),
      total: totalNum.toFixed(2),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      notes: payload.notes || null,
      payment_status: 'unpaid',
      tracking: [
        { status: 'confirmed', note: 'تم تأكيد الطلب التجريبي — الدفع عند الاستلام', created_at: new Date().toISOString() },
      ],
      delivery_pin: generatedPin,
      created_at: new Date().toISOString(),
    }

    orders.unshift(newOrder)
    saveStoredOrders(orders)
    saveStoredCart({ items: [], total_items: 0, subtotal: '0.00' })

    // إضافة مهمة توصيل تلقائياً
    const missions = getStoredMissions()
    missions.unshift({
      id: Date.now(),
      order_number: orderNum,
      customer_name: payload.name,
      customer_phone: payload.phone,
      city: 'خانيونس',
      area: 'خانيونس',
      address_details: payload.address,
      items_count: newOrder.items.length,
      total_amount: newOrder.total,
      delivery_fee: newOrder.delivery_fee,
      payment_status: 'unpaid',
      payment_method: 'cash_on_delivery',
      delivery_status: 'pending_pickup',
      pickup_stores: [...new Set(cart.items.map((i) => {
        const p = INITIAL_PRODUCTS.find((pr) => pr.id === i.product_id)
        const store = INITIAL_MERCHANT_STORES.find((s) => s.id === ((( p?.id || 1) - 1) % 3) + 1)
        return store?.name ?? 'متجر غير محدد'
      }))],
      driver_name: 'محمود أبو العوف',
      driver_phone: '0598112233',
      delivery_notes: payload.notes || null,
      created_at: new Date().toISOString().substring(0, 16).replace('T', ' '),
      estimated_delivery_time: defaultDelivery?.description || undefined,
    })
    saveStoredMissions(missions)

    return delay(newOrder)
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

  // =======================================================================
  // لوحة التاجر
  // =======================================================================
  getMerchantStores: async (): Promise<MerchantStore[]> => delay(INITIAL_MERCHANT_STORES),

  getMerchantStats: async (storeId = 1): Promise<MerchantStats> => {
    const products = await mockServices.getMerchantProducts(storeId)
    const orders = await mockServices.getMerchantOrders(storeId)
    const today = new Date().toISOString().slice(0, 10)
    const todayItems = orders.filter((o) => o.created_at.startsWith(today))
    return delay({
      today_sales: todayItems.reduce((sum, o) => sum + Number(o.subtotal), 0).toFixed(2),
      today_orders_count: new Set(todayItems.map((o) => o.order_number)).size,
      pending_prep_count: orders.filter((o) => o.prep_status === 'preparing').length,
      ready_for_pickup_count: orders.filter((o) => o.prep_status === 'ready_for_pickup').length,
      low_stock_items_count: products.filter((p) => p.total_stock < 5).length,
    })
  },

  getMerchantProducts: async (storeId = 1): Promise<MerchantProductItem[]> => {
    const list: MerchantProductItem[] = INITIAL_PRODUCTS.filter((p) => ((p.id - 1) % 3) + 1 === storeId).map(demoProduct).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category_name: p.category.name,
      thumbnail_url: p.images[0]?.url || null,
      variants_count: p.variants.length,
      total_stock: p.variants.reduce((acc, v) => acc + v.stock, 0),
      is_active: true,
      min_price: Math.min(...p.variants.map((v) => Number(v.price))).toFixed(2),
      max_price: Math.max(...p.variants.map((v) => Number(v.price))).toFixed(2),
    }))
    return delay(list)
  },

  getMerchantOrders: async (storeId = 1): Promise<MerchantOrderItem[]> => {
    const orders = getStoredOrders().filter((o) => (o.payment_status === 'paid' || (o as any).payment_method === 'cash_on_delivery') && !['cancelled', 'refunded'].includes(o.status))
    const items: MerchantOrderItem[] = []

    orders.forEach((o) => {
      o.items.forEach((item) => {
        // محاولة إيجاد المنتج من الاسم (طريقة بديلة بعد إزالة product_variant_id)
        const product = INITIAL_PRODUCTS.find((p) => demoProduct(p).name === item.product_name)
        if (!product || ((product.id - 1) % 3) + 1 !== storeId) return
        items.push({
          id: item.id,
          order_number: o.order_number,
          product_name: item.product_name,
          variant_name: item.variant_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          customer_name: o.name || 'زبون Gazabella',
          customer_area: 'غزة',
          prep_status: ['shipped', 'delivered'].includes(o.status) ? 'picked_up' : demoPrep(item.id),
          created_at: o.created_at,
        })
      })
    })

    return delay(items)
  },

  updateOrderPrepStatus: async (orderItemId: number, status: MerchantPrepStatus) => {
    const orders = getStoredOrders()
    const order = orders.find((o) => o.items.some((i) => i.id === orderItemId))
    if (!order || !['confirmed', 'processing'].includes(order.status)) throw new Error('هذا الطلب غير متاح للتجهيز.')
    demoSetPrep(orderItemId, status)
    if (order.status === 'confirmed') {
      order.status = 'processing'
      order.tracking?.push({ status: 'processing', note: 'بدأ تجهيز الطلب لدى المتاجر', created_at: new Date().toISOString() })
      saveStoredOrders(orders)
    }
    return delay({ success: true, order_item_id: orderItemId, status })
  },

  // =======================================================================
  // لوحة التوصيل
  // =======================================================================
  getDeliveryStats: async (): Promise<DeliveryStats> => {
    const missions = getStoredMissions()
    const pending = missions.filter((m) => m.delivery_status === 'pending_pickup').length
    const transit = missions.filter((m) => m.delivery_status === 'in_transit' || m.delivery_status === 'picked_up').length
    const today = new Date().toISOString().slice(0, 10)
    const delivered = getStoredOrders().filter((o) => o.status === 'delivered' && o.tracking?.some((t) => t.status === 'delivered' && t.created_at.startsWith(today))).length
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
    if (filterStatus) missions = missions.filter((m) => m.delivery_status === filterStatus)
    return delay(missions)
  },

  updateDeliveryStatus: async (missionId: number, newStatus: DeliveryStatus, notes?: string): Promise<DeliveryMission[]> => {
    const missions = getStoredMissions()
    const m = missions.find((item) => item.id === missionId)
    if (!m) throw new Error('لم نعثر على مهمة التوصيل.')
    if (m.payment_method === 'jawwal_pay' && m.payment_status !== 'paid') throw new Error('يجب تأكيد الدفع قبل بدء التوصيل.')
    const next = { pending_pickup: 'picked_up', picked_up: 'in_transit' } as const
    if (!(m.delivery_status in next) || next[m.delivery_status as keyof typeof next] !== newStatus) throw new Error('هذا الانتقال غير متاح. تأكيد التسليم يحتاج الرمز الصحيح.')
    m.delivery_status = newStatus
    if (notes) m.delivery_notes = notes
    const orders = getStoredOrders()
    const order = orders.find((o) => o.order_number === m.order_number)
    if (order) {
      order.items.forEach((i) => demoSetPrep(i.id, 'picked_up'))
      if (newStatus === 'in_transit') {
        order.status = 'shipped'
        order.tracking?.push({ status: 'shipped', note: 'الطلب في الطريق مع المندوب', created_at: new Date().toISOString() })
      }
      saveStoredOrders(orders)
    }
    saveStoredMissions(missions)
    return delay(missions)
  },
}
