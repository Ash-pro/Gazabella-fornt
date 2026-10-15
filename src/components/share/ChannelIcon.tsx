import type { ReactNode } from 'react'

/** رموز قنوات المشاركة (أبيض على لون القناة) — مبسطة ومرسومة محلياً، بلا تحميل من المنصات */
const PATHS: Record<string, ReactNode> = {
  whatsapp: <><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.2z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2.2-1-1 .9a5 5 0 0 1-2.6-2.6l.9-1-1-2.2z" fill="currentColor" stroke="none" /></>,
  telegram: <path d="M21 4 3 11.2l5.6 1.9L18 7l-7.4 7.2.3 5.3 3-3.6 4.6 3.4z" />,
  facebook: <path d="M14.5 21v-7.5H17l.5-3h-3V8.7c0-.9.4-1.5 1.6-1.5h1.5V4.4A19 19 0 0 0 15.4 4.3c-2.4 0-3.9 1.4-3.9 4v2.2H9v3h2.5V21" />,
  messenger: <><path d="M12 3C7 3 3 6.7 3 11.4c0 2.6 1.2 4.9 3.2 6.5V21l2.9-1.6c.9.3 1.9.4 2.9.4 5 0 9-3.7 9-8.4S17 3 12 3z" /><path d="m7.5 13.5 3-3.2 2 2 3.5-2.3-3 3.3-2-2z" fill="currentColor" stroke="none" /></>,
  x: <path d="M4 4l16 16M20 4 4 20" />,
  pinterest: <><circle cx="12" cy="12" r="8.5" /><path d="M11 20.5 12.8 13M10 12a2.5 2.5 0 1 1 4.6 1.4c-.6 1-1.6 1.6-2.6 1.4" /></>,
  snapchat: <path d="M12 3.5c-2.8 0-4.5 2-4.5 4.6v2.4l-1.8.6.9 1.4c-.6 1.6-1.8 2.8-3.1 3.3.9.8 2.2.9 2.9 1.3l.4 1.4 1.8-.2c.9.3 1.9 1.7 3.4 1.7s2.5-1.4 3.4-1.7l1.8.2.4-1.4c.7-.4 2-.5 2.9-1.3-1.3-.5-2.5-1.7-3.1-3.3l.9-1.4-1.8-.6V8.1c0-2.6-1.7-4.6-4.5-4.6z" />,
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" /></>,
  email: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  sms: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 10h8M8 13h5" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
  qr: <><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" /><rect x="14" y="3.5" width="6.5" height="6.5" rx="1" /><rect x="3.5" y="14" width="6.5" height="6.5" rx="1" /><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 18v2.5" /></>,
  story: <><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M12 7.5v6M9 10.5l3-3 3 3M9 17h6" /></>,
  device: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 13.3 7.6 4.4M15.8 6.3 8.2 10.7" /></>,
}

export function ChannelIcon({ name }: { name: keyof typeof PATHS | string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6">{PATHS[name]}</svg>
}
