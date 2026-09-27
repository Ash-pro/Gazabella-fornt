const GUEST_UUID_KEY = `gazabella_guest_uuid:${import.meta.env.VITE_API_BASE_URL || '/api/v1'}`

export function clearGuestUuid() { localStorage.removeItem(GUEST_UUID_KEY) }

export function getGuestUuid(): string {
  const existing = localStorage.getItem(GUEST_UUID_KEY)
  if (existing) return existing

  const guestUuid = crypto.randomUUID()
  localStorage.setItem(GUEST_UUID_KEY, guestUuid)
  return guestUuid
}
