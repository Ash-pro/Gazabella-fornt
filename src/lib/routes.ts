/** الكتالوج الكامل: الرئيسية لا تعرض كل المنتجات أسفلها، فهذا الرابط يفتح صفحة الكتالوج نفسها بلا فلاتر */
export const ALL_PRODUCTS = '/?all=1#products'

/** قسم «مختارات Gazabella» في الرئيسية (منتجات featured من الـ API) */
export const PICKS_ANCHOR = 'picks'
export const PICKS_LINK = '/#' + PICKS_ANCHOR

/**
 * روابط /products القديمة أو الواردة من المحتوى (لا توجد صفحة بهذا المسار في الواجهة):
 * featured → قسم المختارات، category → الكتالوج مفلترًا، وغير ذلك → الكتالوج الكامل مع بقية المعاملات.
 */
export function productsPathToRoute(search: string): string {
  const params = new URLSearchParams(search)
  const featured = params.get('featured')
  if (featured === '1' || featured === 'true') return PICKS_LINK
  params.delete('featured')
  if (!params.has('category')) params.set('all', '1')
  return '/?' + params.toString() + '#products'
}
