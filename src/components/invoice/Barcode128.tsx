import { useMemo } from 'react'
import { code128Widths } from '../../lib/barcode128'

/** باركود Code128 لرقم الفاتورة — SVG بمسار واحد، منطقة هادئة 10 وحدات على الجانبين */
export function Barcode128({ value, height = 44, className, label }: { value: string; height?: number; className?: string; label: string }) {
  const { d, width } = useMemo(() => {
    const widths = code128Widths(value)
    const quiet = 10
    let x = quiet
    const parts: string[] = []
    widths.forEach((w, i) => {
      if (i % 2 === 0) parts.push(`M${x} 0h${w}v${height}h-${w}z`)
      x += w
    })
    return { d: parts.join(''), width: x + quiet }
  }, [value, height])
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={width} height={height} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  )
}
