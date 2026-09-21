import type {
  Category,
  ProductDetail,
  Cart,
  Order,
  DeliveryOption,
  MerchantStore,
  DeliveryMission,
} from '../types/api'

// =======================================================================
// قاعدة البيانات الوهمية لـ Gazabella (Mock Database)
// =======================================================================

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 1,
    name: 'العناية بالبشرة',
    slug: 'skincare',
    image_url: '/images/products/serum.webp',
    parent_id: null,
    children: [
      { id: 11, name: 'سيرومات الإشراقة والنضارة', slug: 'serums', image_url: null, parent_id: 1, children: [] },
      { id: 12, name: 'كريمات وترطيب عميق', slug: 'moisturizers', image_url: null, parent_id: 1, children: [] },
      { id: 13, name: 'درع الحماية وواقيات الشمس (SPF)', slug: 'sunscreens', image_url: null, parent_id: 1, children: [] },
    ],
  },
  {
    id: 2,
    name: 'المكياج',
    slug: 'cosmetics',
    image_url: '/images/products/lipstick.webp',
    parent_id: null,
    children: [
      { id: 21, name: 'أحمر شفاه ومحددات مخملية', slug: 'lipsticks', image_url: null, parent_id: 2, children: [] },
      { id: 22, name: 'كريمات أساس وكونسيلر احترافي', slug: 'foundation', image_url: null, parent_id: 2, children: [] },
      { id: 23, name: 'باليتات العيون والهايلايتر', slug: 'eyeshadow', image_url: null, parent_id: 2, children: [] },
      { id: 24, name: 'مكياج حلال ومعتمد', slug: 'halal-beauty', image_url: null, parent_id: 2, children: [] },
    ],
  },
  {
    id: 3,
    name: 'العطور',
    slug: 'perfumes',
    image_url: '/images/products/perfume.webp',
    parent_id: null,
    children: [
      { id: 31, name: 'عطور شرقية ونفحات العود', slug: 'oriental-perfumes', image_url: null, parent_id: 3, children: [] },
      { id: 32, name: 'عطور فرنسية نسائية ناعمة', slug: 'french-perfumes', image_url: null, parent_id: 3, children: [] },
      { id: 33, name: 'معطرات الجسم وخمرية الشعر', slug: 'body-mists', image_url: null, parent_id: 3, children: [] },
    ],
  },
  {
    id: 4,
    name: 'العروس',
    slug: 'bridal',
    image_url: '/images/products/bridal-robe.webp',
    parent_id: null,
    children: [
      { id: 41, name: 'باقات جهاز العروس', slug: 'bridal-boxes', image_url: null, parent_id: 4, children: [] },
      { id: 42, name: 'مكياج العروس الثابت (Waterproof)', slug: 'bridal-makeup', image_url: null, parent_id: 4, children: [] },
      { id: 43, name: 'روتين العناية قبل الحفل', slug: 'bridal-care', image_url: null, parent_id: 4, children: [] },
      { id: 44, name: 'أرواب ومستلزمات الحرير الفاخر', slug: 'bridal-robes', image_url: null, parent_id: 4, children: [] },
    ],
  },
  {
    id: 5,
    name: 'الهدايا',
    slug: 'gifts',
    image_url: '/images/products/giftbox.webp',
    parent_id: null,
    children: [
      { id: 52, name: 'بوكسات المناسبات والأعياد', slug: 'gift-boxes', image_url: null, parent_id: 5, children: [] },
    ],
  },
  {
    id: 6,
    name: 'العناية الطبيعية',
    slug: 'hair-deadsea',
    image_url: '/images/products/deadsea.webp',
    parent_id: null,
    children: [
      { id: 61, name: 'طين وأملاح البحر الميت الطبيعية', slug: 'deadsea-products', image_url: null, parent_id: 6, children: [] },
      { id: 62, name: 'زيوت وماسكات ترميم الشعر', slug: 'hair-masks', image_url: null, parent_id: 6, children: [] },
      { id: 63, name: 'روتين الاستحمام العضوي', slug: 'organic-bath', image_url: null, parent_id: 6, children: [] },
    ],
  },
  {
    id: 7,
    name: 'أدوات الجمال',
    slug: 'tools-nails',
    image_url: '/images/products/palette.webp',
    parent_id: null,
    children: [
      { id: 71, name: 'فرش وإسفنجات دمج احترافية', slug: 'brushes-blenders', image_url: null, parent_id: 7, children: [] },
      { id: 72, name: 'طلاء أظافر جل وعناية بالأظافر', slug: 'nail-care', image_url: null, parent_id: 7, children: [] },
      { id: 73, name: 'أجهزة تدليك البشرة بالكوارتز', slug: 'skincare-tools', image_url: null, parent_id: 7, children: [] },
    ],
  },
]

export const INITIAL_PRODUCTS: ProductDetail[] = [
  {
    id: 1,
    store: { name: "متجر روز غزة للجمال (Gaza Rose)" },
    name: 'سيروم أوريليا للترطيب اليومي',
    slug: 'nivea-face-cream-001',
    description: 'سيروم للعناية اليومية ضمن مجموعة العرض التجريبية. اختاري الحجم المناسب لروتينكِ.',
    category: { id: 1, name: 'العناية بالبشرة', slug: 'skincare' },
    images: [
      { url: '/images/products/serum.webp', alt_text: 'سيروم أوريليا', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 101, name: 'حجم 100 مل', price: '28.00', compare_at_price: '35.00', available_quantity: 18, sku: 'NIV-SFT-100' },
      { id: 102, name: 'حجم 200 مل العائلي', price: '48.00', compare_at_price: '58.00', available_quantity: 12, sku: 'NIV-SFT-200' },
      { id: 103, name: 'حجم حقيبة اليد 50 مل', price: '16.00', compare_at_price: null, available_quantity: 25, sku: 'NIV-SFT-050' },
    ],
  },
  {
    id: 2,
    store: { name: "بوتيك سحر الشرق للعطور" },
    name: 'عطر الورد الجبلي المركز 50 مل',
    slug: 'rose-perfume-50ml-002',
    description: 'تحفة عطرية تجمع بين عبير الورد الدمشقي العريق ونفحات العود الأبيض الهادئ، مصمم للمناسبات الراقية مع ثبات يتجاوز 24 ساعة.',
    category: { id: 3, name: 'العطور', slug: 'perfumes' },
    images: [
      { url: '/images/products/perfume.webp', alt_text: 'عطر الورد المركز', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 201, name: 'زجاجة فاخرة 50 مل', price: '120.00', compare_at_price: '150.00', available_quantity: 9, sku: 'PERF-ROSE-50' },
      { id: 202, name: 'إصدار العروس الخاص 100 مل', price: '195.00', compare_at_price: '240.00', available_quantity: 5, sku: 'PERF-ROSE-100' },
    ],
  },
  {
    id: 3,
    store: { name: "لافندر كوزمتكس وباقات العروس" },
    name: 'بوكس العروس الملكي المتكامل - Gazabella Bride',
    slug: 'bridal-royal-box-003',
    description: 'الباقة الأكثر طلباً لعرائس غزة! باقة متكاملة من 7 مستحضرات: سيروم نضارة الذهب، مسك الطهارة الأبيض، عطر شعر، لوشن حريري، ومجموعة أحمر شفاه كلاسيكية.',
    category: { id: 4, name: 'العروس', slug: 'bridal' },
    images: [
      { url: '/images/products/giftbox.webp', alt_text: 'بوكس العروس الملكي', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 301, name: 'الباقة الذهبية المتكاملة (صندوق مخملي)', price: '340.00', compare_at_price: '420.00', available_quantity: 6, sku: 'BRD-ROYAL-BOX' },
      { id: 302, name: 'الباقة الفضية المدمجة', price: '230.00', compare_at_price: '280.00', available_quantity: 8, sku: 'BRD-SILVER-BOX' },
    ],
  },
  {
    id: 4,
    store: { name: "متجر روز غزة للجمال (Gaza Rose)" },
    name: 'أحمر شفاه مات مخملي - Ruby Velvet #04',
    slug: 'matte-lipstick-ruby-004',
    description: 'لون غني ومكثف بمسحة واحدة، ملمس مخملي يدوم حتى 16 ساعة دون جفاف للشفاه بفضل زبدة الشيا وفيتامين E.',
    category: { id: 2, name: 'المكياج', slug: 'cosmetics' },
    images: [
      { url: '/images/products/lipstick.webp', alt_text: 'أحمر شفاه مات روبي', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 401, name: 'درجة 04 أحمر كلاسيكي', price: '38.00', compare_at_price: '45.00', available_quantity: 15, sku: 'LIP-RUBY-04' },
      { id: 402, name: 'درجة 07 وردي ناعم (نيود)', price: '38.00', compare_at_price: '45.00', available_quantity: 20, sku: 'LIP-NUDE-07' },
      { id: 403, name: 'درجة 12 كرزي دافئ', price: '38.00', compare_at_price: '45.00', available_quantity: 11, sku: 'LIP-CHERRY-12' },
    ],
  },
  {
    id: 5,
    store: { name: "بوتيك سحر الشرق للعطور" },
    name: 'سيروم الهيالورونيك أسيد المركز 2% + B5',
    slug: 'hyaluronic-acid-serum-005',
    description: 'تركيبة فائقة الترطيب تدعم حاجز البشرة وتعيد ملء الخطوط التعبيرية لتمنحك إشراقة شبابية ونضارة فورية.',
    category: { id: 1, name: 'العناية بالبشرة', slug: 'skincare' },
    images: [
      { url: '/images/products/serum.webp', alt_text: 'سيروم الهيالورونيك', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 501, name: 'قطارة 30 مل', price: '55.00', compare_at_price: '70.00', available_quantity: 14, sku: 'SRM-HA-30' },
      { id: 502, name: 'حجم توفيري 60 مل', price: '92.00', compare_at_price: '115.00', available_quantity: 7, sku: 'SRM-HA-60' },
    ],
  },
  {
    id: 6,
    store: { name: "لافندر كوزمتكس وباقات العروس" },
    name: 'لوحة ظلال العيون والإضاءة - Gaza Glow Palette',
    slug: 'gaza-glow-palette-006',
    description: '18 لوناً مصممة بعناية بين الألوان الترابية الدافئة واللمعات البرّاقة لتناسب الإطلالات اليومية ومناسبات السهرات الراقية.',
    category: { id: 2, name: 'المكياج', slug: 'cosmetics' },
    images: [
      { url: '/images/products/palette.webp', alt_text: 'باليت غزة جلو', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 601, name: 'باليت متكامل مع مرآة فاخرة', price: '85.00', compare_at_price: '110.00', available_quantity: 16, sku: 'PLT-GLOW-18' },
    ],
  },
  {
    id: 7,
    store: { name: "متجر روز غزة للجمال (Gaza Rose)" },
    name: 'معطر الجسم باللافندر الفرنسي وزيت الأرغان',
    slug: 'french-lavender-mist-007',
    description: 'رذاذ منعش ومرطب للجسم يمنحك هالة من الهدوء والاسترخاء مع لمسة حريرية غير دهنية تدوم لساعات.',
    category: { id: 3, name: 'العطور', slug: 'perfumes' },
    images: [
      { url: '/images/products/perfume.webp', alt_text: 'معطر اللافندر الفرنسي', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 701, name: 'عبوة رذاذ 250 مل', price: '42.00', compare_at_price: '50.00', available_quantity: 22, sku: 'MST-LAV-250' },
    ],
  },
  {
    id: 8,
    store: { name: "بوتيك سحر الشرق للعطور" },
    name: 'طقم روب العروس الحريري المطرز بالخيوط الذهبية',
    slug: 'bridal-silk-robe-set-008',
    description: 'روب صباحية العروس الفاخر من الحرير الإيطالي الناعم مع تطريز Gazabella الذهبي الأنيق، مرفق مع ربطة شعر وسليبر حريري متطابق.',
    category: { id: 4, name: 'العروس', slug: 'bridal' },
    images: [
      { url: '/images/products/bridal-robe.webp', alt_text: 'روب العروس الحريري', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 801, name: 'مقاس Standard (أبيض لؤلؤي)', price: '160.00', compare_at_price: '190.00', available_quantity: 7, sku: 'ROBE-BRD-WHT' },
      { id: 802, name: 'مقاس Standard (وردي عاجي)', price: '160.00', compare_at_price: '190.00', available_quantity: 5, sku: 'ROBE-BRD-PNK' },
    ],
  },
  {
    id: 9,
    store: { name: "لافندر كوزمتكس وباقات العروس" },
    name: 'طين البحر الميت الطبيعي المنقي للبشرة والشعر',
    slug: 'dead-sea-mud-mask-009',
    description: 'مستخلص أصيل من أملاح وطين البحر الميت الغني بالمعادن النادرة؛ ينقي المسام، يغذي فروة الرأس، ويمنح إشراقة ونعومة مخملية لا تضاهى.',
    category: { id: 6, name: 'العناية الطبيعية', slug: 'hair-deadsea' },
    images: [
      { url: '/images/products/deadsea.webp', alt_text: 'طين البحر الميت الطبيعي', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 901, name: 'عبوة زجاجية 300 غرام', price: '35.00', compare_at_price: '45.00', available_quantity: 20, sku: 'DSM-300G' },
      { id: 902, name: 'باقة التوفير 600 غرام مع أملاح الاستحمام', price: '60.00', compare_at_price: '80.00', available_quantity: 12, sku: 'DSM-600G-SET' },
    ],
  },
  {
    id: 10,
    store: { name: "متجر روز غزة للجمال (Gaza Rose)" },
    name: 'طقم فرش المكياج الاحترافية 14 قطعة مع حقيبة مخملية',
    slug: 'pro-makeup-brushes-set-010',
    description: 'شعيرات نباتية فائقة النعومة مع مقابض روز جولد فاخرة تضمن دمجاً مثالياً لكريم الأساس والبودرة وظلال العيون، مع حقيبة سفر أنيقة.',
    category: { id: 7, name: 'أدوات الجمال', slug: 'tools-nails' },
    images: [
      { url: '/images/products/palette.webp', alt_text: 'طقم فرش المكياج 14 قطعة', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 1001, name: 'طقم 14 فرشاة مع حقيبة روز جولد', price: '75.00', compare_at_price: '95.00', available_quantity: 15, sku: 'BRSH-SET-14' },
    ],
  },
  {
    id: 11,
    store: { name: "بوتيك سحر الشرق للعطور" },
    name: 'صندوق إهداء Gazabella الفاخر - باقة الورد والمسك',
    slug: 'luxury-gift-box-rose-011',
    description: 'هدية راقية تعبر عن أصدق المشاعر؛ يحتوي على عطر ميني مركز، لوشن للجسم، شمعة معطرة، وكرت إهداء مكتوب باليد داخل صندوق مخملي فاخر.',
    category: { id: 5, name: 'الهدايا', slug: 'gifts' },
    images: [
      { url: '/images/products/giftbox.webp', alt_text: 'صندوق إهداء فاخر', is_primary: true, sort_order: 1 },
    ],
    variants: [
      { id: 1101, name: 'الصندوق المخملي الفاخر مع كرت إهداء', price: '145.00', compare_at_price: '180.00', available_quantity: 8, sku: 'GFT-LUX-ROSE' },
    ],
  },
]


export const INITIAL_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 1,
    name: 'توصيل موحّد قياسي (خانيونس)',
    description: 'توصيل موحد لجميع منتجات سلتك بطلب واحد حتى باب منزلك في خانيونس',
    fee: '15.00',
    estimated_days: 1,
    is_available: true,
  },
  {
    id: 2,
    name: 'توصيل سريع VIP (خانيونس - نفس اليوم)',
    description: 'تسليم في نفس اليوم للطلبات المؤكدة قبل الساعة 2:00 ظهراً',
    fee: '25.00',
    estimated_days: 1,
    is_available: true,
  },
  {
    id: 3,
    name: 'توصيل باقات العروس الملكية (مجاني)',
    description: 'شحن وتوصيل فاخر مجاني لباقات تجهيز العروس وصناديق الهدايا',
    fee: '0.00',
    estimated_days: 1,
    is_available: false,
  },
]

export const INITIAL_MERCHANT_STORES: MerchantStore[] = [
  {
    id: 1,
    name: 'متجر روز غزة للجمال (Gaza Rose)',
    slug: 'gaza-rose-beauty',
    logo_url: '/brand/symbol/logo-192.webp',
    phone: '+970599123456',
    city: 'خانيونس',
    area: 'حي الأمل - الشارع الرئيسي',
    is_active: true,
    commission_rate: '10%',
  },
  {
    id: 2,
    name: 'بوتيك سحر الشرق للعطور',
    slug: 'sahar-alsharq',
    logo_url: '/brand/symbol/logo-192.webp',
    phone: '+970599654321',
    city: 'خانيونس',
    area: 'وسط البلد - السوق الرئيسي',
    is_active: true,
    commission_rate: '12%',
  },
  {
    id: 3,
    name: 'لافندر كوزمتكس وباقات العروس',
    slug: 'lavender-cosmetics',
    logo_url: '/brand/symbol/logo-192.webp',
    phone: '+970599789012',
    city: 'خانيونس',
    area: 'وسط البلد - شارع الصناعة',
    is_active: true,
    commission_rate: '10%',
  },
]

export const INITIAL_DELIVERY_MISSIONS: DeliveryMission[] = [
  {
    id: 1,
    order_number: 'GAZ-2026-0014',
    customer_name: 'أمل النجار',
    customer_phone: '0599876543',
    city: 'خانيونس',
    area: 'حي الأمل',
    address_details: 'بجوار برج حجي، الطابق الثالث',
    items_count: 3,
    total_amount: '183.00',
    delivery_fee: '15.00',
    payment_status: 'paid',
    payment_method: 'jawwal_pay',
    delivery_status: 'in_transit',
    pickup_stores: ['متجر روز غزة للجمال', 'بوتيك سحر الشرق'],
    driver_name: 'محمود أبو العوف',
    driver_phone: '0598112233',
    delivery_notes: 'الرجاء الاتصال قبل الوصول بـ 15 دقيقة',
    created_at: '2026-09-20 08:30',
    estimated_delivery_time: 'اليوم خلال ساعة',
  },
  {
    id: 2,
    order_number: 'GAZ-2026-0015',
    customer_name: 'سارة عبد الله',
    customer_phone: '0592345678',
    city: 'خانيونس',
    area: 'وسط البلد',
    address_details: 'بالقرب من مستشفى القدس، بناية الأمل',
    items_count: 2,
    total_amount: '355.00',
    delivery_fee: '15.00',
    payment_status: 'unpaid',
    payment_method: 'cash_on_delivery',
    delivery_status: 'pending_pickup',
    pickup_stores: ['لافندر كوزمتكس وباقات العروس'],
    driver_name: 'أحمد شعت',
    driver_phone: '0597445566',
    delivery_notes: 'طلب عروس - تسليم بعناية فائقة',
    created_at: '2026-09-20 09:15',
    estimated_delivery_time: 'اليوم قبل 2:00 م',
  },
  {
    id: 3,
    order_number: 'GAZ-2026-0016',
    customer_name: 'نور الدين خضر',
    customer_phone: '0595123987',
    city: 'خانيونس',
    area: 'حي المنارة',
    address_details: 'تقاطع شارع العيون، عمارة الكرامة',
    items_count: 1,
    total_amount: '120.00',
    delivery_fee: '15.00',
    payment_status: 'paid',
    payment_method: 'jawwal_pay',
    delivery_status: 'picked_up',
    pickup_stores: ['بوتيك سحر الشرق للعطور'],
    driver_name: 'محمود أبو العوف',
    driver_phone: '0598112233',
    delivery_notes: null,
    created_at: '2026-09-20 07:45',
    estimated_delivery_time: 'خلال ساعتين',
  },
  {
    id: 4,
    order_number: 'GAZ-2026-0017',
    customer_name: 'روان القصاص',
    customer_phone: '0594321987',
    city: 'خانيونس',
    area: 'حي الأمل',
    address_details: 'الشارع العام، عمارة المهندسين',
    items_count: 4,
    total_amount: '276.00',
    delivery_fee: '20.00',
    payment_status: 'paid',
    payment_method: 'jawwal_pay',
    delivery_status: 'delivered',
    pickup_stores: ['متجر روز غزة للجمال'],
    driver_name: 'إبراهيم المصري',
    driver_phone: '0591223344',
    delivery_notes: 'تم التسليم بنجاح مع استلام التوقيع',
    created_at: '2026-09-19 16:20',
    estimated_delivery_time: 'تم التسليم',
  },
]

const STORAGE_KEYS = {
  CART: 'gazabella_mock_cart',
  ORDERS: 'gazabella_mock_orders',
  MISSIONS: 'gazabella_mock_missions',
}

export function getStoredCart(): Cart {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CART)
    if (raw) {
      const parsed = JSON.parse(raw) as Cart
      let modified = false
      if (parsed && Array.isArray(parsed.items)) {
        parsed.items.forEach((item) => {
          const matched = INITIAL_PRODUCTS.find((p) =>
            p.variants.some((v) => v.id === item.product_variant_id) || p.name === item.product_name
          )
          const targetUrl = matched?.images[0]?.url || '/images/products/serum.webp'
          const matchedVariant = matched?.variants.find((v) => v.id === item.product_variant_id)
          if (item.compare_at_price !== matchedVariant?.compare_at_price) {
            item.compare_at_price = matchedVariant?.compare_at_price || null
            modified = true
          }
          if (!item.thumbnail_url || item.thumbnail_url.includes('unsplash') || item.thumbnail_url !== targetUrl) {
            item.thumbnail_url = targetUrl
            modified = true
          }
        })
      }
      if (modified) {
        saveStoredCart(parsed)
      }
      return parsed
    }
  } catch (e) {
    console.error('Error reading mock cart', e)
  }

  const sampleCart: Cart = {
    items: [
      {
        id: 1,
        product_variant_id: 101,
        product_name: 'سيروم أوريليا للترطيب اليومي',
        variant_name: 'حجم 100 مل',
        unit_price: '28.00',
        compare_at_price: '35.00',
        quantity: 2,
        subtotal: '56.00',
        thumbnail_url: '/images/products/serum.webp',
        reservation: {
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          seconds_remaining: 900,
          is_extended: false,
        },
      },
      {
        id: 2,
        product_variant_id: 201,
        product_name: 'عطر الورد الجبلي المركز 50 مل',
        variant_name: 'زجاجة فاخرة 50 مل',
        unit_price: '120.00',
        compare_at_price: '150.00',
        quantity: 1,
        subtotal: '120.00',
        thumbnail_url: '/images/products/perfume.webp',
        reservation: {
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          seconds_remaining: 900,
          is_extended: false,
        },
      },
    ],
    total_items: 3,
    subtotal: '176.00',
    has_active_reservation: true,
  }
  saveStoredCart(sampleCart)
  return sampleCart
}

export function saveStoredCart(cart: Cart): void {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart))
}

export function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading mock orders', e)
  }
  const samples: Order[] = [
    {
      id: 14,
      order_number: 'GAZ-2026-0014',
      status: 'shipped',
      items: [
        {
          id: 1,
          product_name: 'سيروم أوريليا للترطيب اليومي',
          variant_name: 'حجم 100 مل',
          unit_price: '28.00',
          quantity: 2,
          subtotal: '56.00',
          thumbnail_url: '/images/products/serum.webp',
          product_variant_id: 101,
        },
        {
          id: 2,
          product_name: 'عطر الورد الجبلي المركز 50 مل',
          variant_name: 'زجاجة فاخرة 50 مل',
          unit_price: '120.00',
          quantity: 1,
          subtotal: '120.00',
          thumbnail_url: '/images/products/perfume.webp',
          product_variant_id: 201,
        },
      ],
      subtotal: '176.00',
      delivery_fee: '15.00',
      discount_amount: '0.00',
      total: '191.00',
      delivery_option: { name: 'توصيل موحّد قياسي (خانيونس)', estimated_days: 1 },
      address: {
        full_name: 'أمل النجار',
        phone: '0599876543',
        city: 'خانيونس',
        area: 'حي الأمل',
        details: 'شارع النصر، مقابل المدرسة الثانوية',
        landmark: 'بجانب مسجد الرحمة',
        lat: 31.3452,
        lng: 34.3092,
      },
      payment_status: 'paid',
      tracking: [
        { status: 'pending', note: 'تم استلام طلبك بنجاح', created_at: '2026-09-20 08:00' },
        { status: 'confirmed', note: 'تم تأكيد الدفع عبر Jawwal Pay', created_at: '2026-09-20 08:05' },
        { status: 'processing', note: 'قام التجار بتجهيز وتغليف المنتجات', created_at: '2026-09-20 08:25' },
        { status: 'shipped', note: 'الشحنة مع مندوب التوصيل (محمود أبو العوف)', created_at: '2026-09-20 08:35' },
      ],
      coupon_code: null,
      notes: 'الرجاء الاتصال قبل الوصول بـ 15 دقيقة',
      delivery_pin: '4829',
      created_at: '2026-09-20 08:00',
    },
  ]
  for (const [index, mission] of INITIAL_DELIVERY_MISSIONS.slice(1).entries()) {
    const product = INITIAL_PRODUCTS[index + 2]
    const variant = product.variants[0]
    const delivered = mission.delivery_status === 'delivered'
    const status = delivered ? 'delivered' : mission.delivery_status === 'in_transit' ? 'shipped' : 'processing'
    const created = new Date(Date.now() - (index + 1) * 3600_000).toISOString()
    samples.push({id:15+index,order_number:mission.order_number,status,
      items:[{id:150+index,product_name:product.name,variant_name:variant.name,unit_price:variant.price,quantity:1,subtotal:variant.price,thumbnail_url:product.images[0]?.url || null,product_variant_id:variant.id}],
      subtotal:variant.price,delivery_fee:mission.delivery_fee,discount_amount:'0.00',total:(Number(variant.price)+Number(mission.delivery_fee)).toFixed(2),
      delivery_option:{name:'توصيل موحد قياسي',estimated_days:1},address:{full_name:mission.customer_name,phone:mission.customer_phone,city:mission.city,area:mission.area,details:mission.address_details},
      payment_status:mission.payment_status,tracking:[{status,note:'طلب تجريبي للعرض',created_at:created}],coupon_code:null,notes:mission.delivery_notes,delivery_pin:String(4830+index),
      escrow_expires_at:delivered ? new Date(Date.now()+47*3600_000).toISOString() : undefined,created_at:created})
  }
  saveStoredOrders(samples)
  return samples
}

export function saveStoredOrders(orders: Order[]): void {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders))
}

export function getStoredMissions(): DeliveryMission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MISSIONS)
    if (raw) return hydrateMissions(JSON.parse(raw))
  } catch (e) {
    console.error('Error reading mock missions', e)
  }
  const missions = hydrateMissions(INITIAL_DELIVERY_MISSIONS)
  saveStoredMissions(missions)
  return missions
}

export function saveStoredMissions(missions: DeliveryMission[]): void {
  localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(missions))
}

function hydrateMissions(missions: DeliveryMission[]): DeliveryMission[] {
  const orders = getStoredOrders()
  return missions.map((mission) => {
    const order = orders.find((o) => o.order_number === mission.order_number)
    if (!order) return mission
    return {...mission,total_amount:order.total,delivery_fee:order.delivery_fee,items_count:order.items.length,
      city:order.address?.city || mission.city,area:order.address?.area || mission.area,
      address_details:order.address?.details || mission.address_details}
  })
}
