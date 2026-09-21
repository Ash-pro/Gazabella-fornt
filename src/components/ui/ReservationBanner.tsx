import { useReservationTimer } from '../../hooks/useReservationTimer'
import { Icon } from './Icon'

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remaining = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remaining}`
}

export function ReservationBanner() {
  const seconds = useReservationTimer()
  if (seconds === null) return null

  return (
    <div className={`reservation-banner ${seconds < 180 ? 'reservation-banner--urgent' : ''}`}>
      <Icon name="clock" className="size-5 shrink-0" />
      <p role="status">{seconds === 0 ? 'انتهت مهلة الحجز. راجعي السلة لتحديث التوافر.' : 'اختياراتكِ محجوزة مؤقتًا لإتمام الطلب'}</p>
      <span role="timer" aria-live="off" className="mr-auto font-mono text-base font-bold num" dir="ltr">{formatTime(seconds)}</span>
    </div>
  )
}
