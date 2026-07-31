// Rotas reais via OSRM (servidores públicos de demonstração do FOSSGIS, que
// suportam os perfis a pé e de carro). Toda falha degrada para linha reta
// (haversine) para não quebrar a tela.
import { haversineMeters, type LatLng } from '../lib/geo'

export type Profile = 'foot' | 'driving'

// Velocidades para o fallback em linha reta (m/s)
const FALLBACK_SPEED: Record<Profile, number> = {
  foot: 1.35, // ~4,9 km/h
  driving: 8.3, // ~30 km/h (trânsito urbano)
}

const BASE: Record<Profile, string> = {
  foot: 'https://routing.openstreetmap.de/routed-foot',
  driving: 'https://routing.openstreetmap.de/routed-car',
}

export interface RouteResult {
  /** polilinha [lat, lng] para desenhar */
  coords: [number, number][]
  /** duração de cada trecho (entre paradas consecutivas), em segundos */
  legsSec: number[]
  totalSec: number
  totalM: number
  /** true se caiu no fallback de linha reta */
  fallback: boolean
}

function coordsParam(points: LatLng[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(';')
}

function straightLineFallback(points: LatLng[], profile: Profile): RouteResult {
  const speed = FALLBACK_SPEED[profile]
  const legsSec: number[] = []
  let totalM = 0
  for (let i = 0; i < points.length - 1; i++) {
    const d = haversineMeters(points[i], points[i + 1])
    totalM += d
    legsSec.push(d / speed)
  }
  return {
    coords: points.map((p) => [p.lat, p.lng]),
    legsSec,
    totalSec: legsSec.reduce((a, b) => a + b, 0),
    totalM,
    fallback: true,
  }
}

/** Rota passando por todos os pontos, na ordem dada. Nunca lança. */
export async function routeThrough(points: LatLng[], profile: Profile): Promise<RouteResult> {
  if (points.length < 2) {
    return { coords: points.map((p) => [p.lat, p.lng]), legsSec: [], totalSec: 0, totalM: 0, fallback: false }
  }
  const url =
    `${BASE[profile]}/route/v1/${profile}/${coordsParam(points)}` +
    '?overview=full&geometries=geojson&steps=false'
  try {
    const res = await fetch(url)
    if (!res.ok) return straightLineFallback(points, profile)
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) return straightLineFallback(points, profile)
    const route = data.routes[0]
    const coords: [number, number][] = (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng],
    )
    const legsSec: number[] = (route.legs as Array<{ duration: number }>).map((l) => l.duration)
    return {
      coords,
      legsSec,
      totalSec: route.duration,
      totalM: route.distance,
      fallback: false,
    }
  } catch {
    return straightLineFallback(points, profile)
  }
}

/** Matriz de durações (segundos) entre todos os pontos. Fallback haversine. */
export async function durationMatrix(points: LatLng[], profile: Profile): Promise<number[][]> {
  const n = points.length
  const fallback = (): number[][] => {
    const speed = FALLBACK_SPEED[profile]
    return points.map((a) => points.map((b) => haversineMeters(a, b) / speed))
  }
  if (n < 2) return fallback()

  const url = `${BASE[profile]}/table/v1/${profile}/${coordsParam(points)}?annotations=duration`
  try {
    const res = await fetch(url)
    if (!res.ok) return fallback()
    const data = await res.json()
    if (data.code !== 'Ok' || !Array.isArray(data.durations)) return fallback()
    const m = data.durations as (number | null)[][]
    // OSRM pode devolver null para pares inalcançáveis: troca por haversine
    const speed = FALLBACK_SPEED[profile]
    return m.map((row, i) =>
      row.map((v, j) => (v == null ? haversineMeters(points[i], points[j]) / speed : v)),
    )
  } catch {
    return fallback()
  }
}
