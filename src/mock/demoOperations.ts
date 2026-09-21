import { getStoredOrders, saveStoredOrders, getStoredMissions, saveStoredMissions } from './mockDatabase'
import type { ProductDetail, MerchantPrepStatus } from '../types/api'

function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback } }
export function demoProduct(product: ProductDetail): ProductDetail {
  const inventory = read<Record<string,number>>('gazabella_mock_inventory', {})
  return { ...product, variants: product.variants.map((v) => ({...v, available_quantity: inventory[v.id] ?? v.available_quantity})) }
}
export function demoSetStock(variantId: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10000) throw new Error('أدخلي كمية صحيحة من 0 إلى 10000.')
  const inventory = read<Record<string,number>>('gazabella_mock_inventory', {})
  inventory[variantId] = quantity
  localStorage.setItem('gazabella_mock_inventory', JSON.stringify(inventory))
}
export function demoPrep(itemId: number): MerchantPrepStatus { return read<Record<string,MerchantPrepStatus>>('gazabella_mock_prep', {})[itemId] || 'preparing' }
export function demoSetPrep(itemId: number, status: MerchantPrepStatus) {
  const map = read<Record<string,MerchantPrepStatus>>('gazabella_mock_prep', {})
  map[itemId] = status
  localStorage.setItem('gazabella_mock_prep', JSON.stringify(map))
}
export interface DemoDispute { id: string; order: string; reason: string; created_at: string; status: 'open' }
export function demoDispute(order: string): DemoDispute | undefined { return read<DemoDispute[]>('gazabella_mock_disputes', []).find((d) => d.order === order) }
export function demoOpenDispute(orderNumber: string, reason: string) {
  const order = getStoredOrders().find((o) => o.order_number === orderNumber)
  if (!order || order.status !== 'delivered' || !order.escrow_expires_at || Date.parse(order.escrow_expires_at) <= Date.now()) throw new Error('يتاح فتح النزاع خلال 48 ساعة من استلام الطلب.')
  if (reason.trim().length < 10) throw new Error('اكتبي وصفًا للمشكلة لا يقل عن 10 أحرف.')
  const disputes = read<DemoDispute[]>('gazabella_mock_disputes', [])
  const existing = disputes.find((d) => d.order === orderNumber)
  if (existing) return existing
  const result: DemoDispute = {id:'DEMO-' + Date.now().toString(36).toUpperCase(), order:orderNumber, reason:reason.trim(),created_at:new Date().toISOString(),status:'open'}
  disputes.push(result)
  localStorage.setItem('gazabella_mock_disputes',JSON.stringify(disputes))
  return result
}
export function demoConfirmDelivery(missionId: number, pin: string) {
  const missions = getStoredMissions()
  const mission = missions.find((m) => m.id === missionId)
  const orders = getStoredOrders()
  const order = orders.find((o) => o.order_number === mission?.order_number)
  if (!mission || mission.delivery_status !== 'in_transit') throw new Error('يجب أن تكون الشحنة في الطريق قبل تأكيد التسليم.')
  if (!order?.delivery_pin || order.delivery_pin !== pin) throw new Error('رمز التسليم غير صحيح. راجعي الكود مع العميل.')
  if (mission.payment_method === 'jawwal_pay' && mission.payment_status !== 'paid') throw new Error('لم يتم تأكيد الدفع لهذا الطلب بعد.')
  mission.delivery_status='delivered'
  if (mission.payment_method === 'cash_on_delivery') mission.payment_status='paid'
  order.status='delivered'
  order.payment_status='paid'
  order.escrow_expires_at = new Date(Date.now()+48*3600_000).toISOString()
  order.tracking.push({status:'delivered',note:'تم التحقق من رمز التسليم في العرض التجريبي',created_at:new Date().toISOString()})
  saveStoredOrders(orders)
  saveStoredMissions(missions)
  return mission
}
