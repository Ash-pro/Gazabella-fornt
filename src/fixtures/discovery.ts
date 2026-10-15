/** بيانات العرض التجريبي للمرحلة 3 (R-1) — ماركات توضيحية بأسماء مخترعة، تُوسم «عرض تجريبي» */
import type { Brand } from '../types/api'

export const DEMO_BRANDS: Brand[] = [
  { id: 9001, name: 'لوميير', slug: 'demo-lumiere', logo_url: null, description: 'عناية يومية خفيفة للبشرة — ماركة توضيحية للعرض.', products_count: 12 },
  { id: 9002, name: 'نوار', slug: 'demo-nawar', logo_url: null, description: 'عطور شرقية ومسك — ماركة توضيحية للعرض.', products_count: 8 },
  { id: 9003, name: 'روز ديو', slug: 'demo-rose-dew', logo_url: null, description: 'مكياج بألوان ناعمة — ماركة توضيحية للعرض.', products_count: 15 },
  { id: 9004, name: 'أورا', slug: 'demo-aura', logo_url: null, description: 'عناية بالشعر والجسم — ماركة توضيحية للعرض.', products_count: 6 },
]

export const isDemoBrand = (slug: string) => slug.startsWith('demo-')
