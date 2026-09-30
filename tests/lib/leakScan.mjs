/**
 * P1-QA-02 — فاحص تسريب هوية المتجر في ردود واجهة العميل.
 * القواعد الثابتة: لا store_id · لا commission · لا sub_orders · لا اسم/شعار/SKU متجر · لا مورّد.
 * يُستخدم في: tests/leak-scan.test.mjs (Mock) · scripts/leak-scan.mjs (API حقيقي/Staging).
 */

/** مفاتيح ممنوعة في أي مستوى (مطابقة كاملة بعد التطبيع إلى lowercase) */
export const FORBIDDEN_KEYS = [
  'store', 'stores', 'store_id', 'storeid', 'store_name', 'store_logo', 'store_phone', 'store_sku',
  'vendor', 'vendors', 'vendor_id', 'vendor_order', 'vendor_orders', 'vendor_order_id',
  'merchant', 'merchant_id', 'merchant_name', 'supplier', 'supplier_id',
  'sub_order', 'sub_orders', 'sub_order_id', 'suborders',
  'commission', 'commission_amount', 'commission_rate', 'commission_rate_snapshot',
  'payout', 'pickup_stores', 'fulfillment_route', 'hub_received_at',
]

/** مفاتيح مسموحة رغم تشابهها — ليست بيانات متجر */
export const ALLOWED_KEYS = new Set(['store_name@settings'])

/**
 * يفحص أي JSON ويعيد قائمة المخالفات.
 * @param {unknown} data
 * @param {{ storeNames?: string[], context?: string }} [options]
 *   storeNames: أسماء المتاجر الشريكة الحقيقية للبحث عنها داخل القيم النصية
 *   context: اسم المسار (مثل 'settings') لتفعيل الاستثناءات
 * @returns {{ path: string, reason: string }[]}
 */
export function scanForLeaks(data, options = {}) {
  const names = (options.storeNames ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean)
  const findings = []
  const walk = (value, path) => {
    if (Array.isArray(value)) { value.forEach((v, i) => walk(v, `${path}[${i}]`)); return }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        const k = key.toLowerCase()
        const here = path ? `${path}.${key}` : key
        if (FORBIDDEN_KEYS.includes(k) && !ALLOWED_KEYS.has(`${k}@${options.context ?? ''}`)) {
          findings.push({ path: here, reason: `مفتاح ممنوع «${key}»` })
        }
        walk(child, here)
      }
      return
    }
    if (typeof value === 'string' && names.length) {
      const v = value.toLowerCase()
      for (const n of names) if (v.includes(n)) findings.push({ path, reason: `اسم متجر «${n}» داخل قيمة نصية` })
    }
  }
  walk(data, '')
  return findings
}

export function formatFindings(label, findings) {
  if (!findings.length) return `✓ ${label}: لا تسريب`
  return `✗ ${label}: ${findings.length} مخالفة\n` + findings.slice(0, 20).map((f) => `   - ${f.path || '(root)'} → ${f.reason}`).join('\n')
}
