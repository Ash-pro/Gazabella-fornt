import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/** QR لرابط التحقق — يُرسم من مصفوفة الوحدات مباشرة (بلا innerHTML) */
export function InvoiceQr({ value, className, label }: { value: string; className?: string; label: string }) {
  const { d, size } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const count = qr.getModuleCount()
    const parts: string[] = []
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) parts.push(`M${c + 2} ${r + 2}h1v1h-1z`)
    return { d: parts.join(''), size: count + 4 }
  }, [value])
  return (
    <svg className={className} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  )
}
