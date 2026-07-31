export interface LatLng {
  lat: number
  lng: number
}

const R = 6_371_000 // raio da Terra em metros

/** Distância em linha reta (haversine), em metros. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Formata metros como "850 m" ou "1,5 km" (vírgula decimal, pt-BR). */
export function formatDistance(m: number): string {
  if (!isFinite(m) || m < 0) return '—'
  if (m < 950) return `${Math.round(m / 10) * 10} m`
  const km = m / 1000
  const s = km >= 10 ? km.toFixed(0) : km.toFixed(1)
  return `${s.replace('.', ',')} km`
}

/** Formata segundos como "12 min", "1h10" ou "45 s". */
export function formatDuration(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '—'
  if (sec < 60) return `${Math.round(sec)} s`
  const totalMin = Math.round(sec / 60)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
