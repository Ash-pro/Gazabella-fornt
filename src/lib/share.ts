import qrcode from 'qrcode-generator'

/**
 * المشاركة الاجتماعية — روابط كل قناة مع UTM لقياس مصدر الزيارات (P4-3 · P1-6).
 * لا نحمّل أي سكربت من منصات التواصل: روابط مشاركة عادية فقط (خصوصية + سرعة + CSP).
 */
export type ShareChannel = 'whatsapp' | 'telegram' | 'facebook' | 'messenger' | 'x' | 'pinterest' | 'snapchat' | 'email' | 'sms'

export interface ShareContent { url: string; title: string; text?: string; image?: string | null; campaign: 'product' | 'wishlist' | 'guide' }

/** الرابط نفسه مع utm_source لكل قناة */
export function withUtm(url: string, source: string, campaign: string): string {
  try {
    const u = new URL(url, window.location.origin)
    u.searchParams.set('utm_source', source)
    u.searchParams.set('utm_medium', 'share')
    u.searchParams.set('utm_campaign', campaign)
    return u.toString()
  } catch { return url }
}

const enc = encodeURIComponent

export function shareHref(channel: ShareChannel, c: ShareContent): string {
  const url = withUtm(c.url, channel, c.campaign)
  const line = c.text ? `${c.title} — ${c.text}` : c.title
  switch (channel) {
    case 'whatsapp': return `https://wa.me/?text=${enc(`${line}\n${url}`)}`
    case 'telegram': return `https://t.me/share/url?url=${enc(url)}&text=${enc(line)}`
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`
    case 'messenger': return `fb-messenger://share/?link=${enc(url)}`
    case 'x': return `https://x.com/intent/post?text=${enc(line)}&url=${enc(url)}`
    case 'pinterest': return `https://pinterest.com/pin/create/button/?url=${enc(url)}&description=${enc(line)}${c.image ? `&media=${enc(c.image)}` : ''}`
    case 'snapchat': return `https://www.snapchat.com/scan?attachmentUrl=${enc(url)}`
    case 'email': return `mailto:?subject=${enc(c.title)}&body=${enc(`${line}\n\n${url}`)}`
    case 'sms': return `sms:?&body=${enc(`${line} ${url}`)}`
  }
}

export const isTouchDevice = (): boolean => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** رمز QR كصورة SVG (data URL) — للمشاركة وجهاً لوجه أو الطباعة */
export function qrDataUrl(text: string, cell = 6): string {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  return `data:image/svg+xml;utf8,${enc(qr.createSvgTag({ cellSize: cell, margin: 2, scalable: true }))}`
}

/**
 * بطاقة مشاركة (PNG 1080×1350) بهوية Gazabella: العنوان + حتى 6 أسماء + رمز QR للرابط.
 * مناسبة لستوري إنستغرام وحالة واتساب. لا نرسم صور المنتجات لأنها من نطاق آخر (canvas يرفض تصديرها).
 */
export async function shareCard(c: ShareContent, lines: string[]): Promise<Blob | null> {
  const W = 1080, H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const g = canvas.getContext('2d')
  if (!g) return null
  await document.fonts?.ready
  const grad = g.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, '#9B2D52'); grad.addColorStop(1, '#5E1A33')
  g.fillStyle = grad; g.fillRect(0, 0, W, H)
  g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(W - 120, 160, 260, 0, Math.PI * 2); g.fill()
  g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = '#fff'
  g.font = 'italic 600 64px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.fillText('Gazabella', W / 2, 150)
  g.textAlign = 'right'
  g.font = '700 64px "Readex Pro", Tajawal, sans-serif'
  wrap(g, c.title, W - 100, 300, W - 200, 80)
  g.font = '400 40px "Readex Pro", Tajawal, sans-serif'; g.fillStyle = '#F6DCE6'
  lines.slice(0, 6).forEach((l, i) => g.fillText(`• ${l.length > 34 ? l.slice(0, 33) + '…' : l}`, W - 100, 520 + i * 66))
  // رمز QR في بطاقة بيضاء
  const qr = new Image()
  qr.src = qrDataUrl(withUtm(c.url, 'qr', c.campaign), 10)
  await new Promise((r) => { qr.onload = r; qr.onerror = r })
  g.fillStyle = '#fff'; roundRect(g, W / 2 - 190, 960, 380, 380 - 20, 32); g.fill()
  g.drawImage(qr, W / 2 - 160, 990, 320, 320)
  g.fillStyle = '#F6DCE6'; g.textAlign = 'center'; g.font = '400 30px "Readex Pro", Tajawal, sans-serif'
  g.fillText(new URL(c.url, window.location.origin).host, W / 2, 940)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(/\s+/); let line = ''; let yy = y
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (g.measureText(test).width > max && line) { g.fillText(line, x, yy); line = w; yy += lh } else line = test
  }
  if (line) g.fillText(line, x, yy)
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
