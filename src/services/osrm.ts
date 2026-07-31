// Rotas reais via OSRM (servidores públicos de demonstração do FOSSGIS, que
// suportam a pé e de carro). Toda falha degrada para linha reta (haversine) para
// não quebrar a tela.
//
// Transporte público: o OSRM não roteia ônibus/metrô. O perfil 'transit' é uma
// ESTIMATIVA — parte do tempo de carro, multiplicado por um fator e somado a uma
// espera por trecho — e vem sempre marcado como aproximado (`estimate: true`).
// Para a rota real de transporte público, o app abre o Google Maps.
import { haversineMeters, type LatLng } from '../lib/geo'

export type Profile = 'foot' | 'driving' | 'transit'

// Velocidades para o fallback em linha reta (m/s)
const FALLBACK_SPEED: Record<Profile, number> = {
  foot: 1.35, // ~4,9 km/h
  driving: 8.3, // ~30 km/h
  transit: 6.0, // ~21 km/h efetivos (com paradas)
}

const BASE: Record<'foot' | 'driving', string> = {
  foot: 'https://routing.openstreetmap.de/routed-foot',
  driving: 'https://routing.openstreetmap.de/routed-car',
}

// Estimativa de transporte público
const TRANSIT_FACTOR = 1.6 // ônibus/metrô costuma ser mais lento que o carro
const TRANSIT_WAIT_SEC = 300 // ~5 min de espera/baldeação por trecho

/** Perfil OSRM real usado para buscar geometria/tempos (transit usa o de carro). */
function osrmProfile(p: Profile): 'foot' | 'driving' {
  return p === 'transit' ? 'driving' : p
}

export interface RouteResult {
  coords: [number, number][]
  legsSec: number[]
  totalSec: number
  totalM: number
  /** caiu no fallback de linha reta */
  fallback: boolean
  /** os tempos são estimativa (perfil transporte público) */
  estimate: boolean
}

function coordsParam(points: LatLng[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(';')
}

function straightLineFallback(points: LatLng[], profile: Profile): RouteResult {
  const speed = FALLBACK_SPEED[profile]
  const wait = profile === 'transit' ? TRANSIT_WAIT_SEC : 0
  const legsSec: number[] = []
  let totalM = 0
  for (let i = 0; i < points.length - 1; i++) {
    const d = haversineMeters(points[i], points[i + 1])
    totalM += d
    legsSec.push(d / speed + wait)
  }
  return {
    coords: points.map((p) => [p.lat, p.lng]),
    legsSec,
    totalSec: legsSec.reduce((a, b) => a + b, 0),
    totalM,
    fallback: true,
    estimate: profile === 'transit',
  }
}

/** Rota passando por todos os pontos, na ordem dada. Nunca lança. */
export async function routeThrough(points: LatLng[], profile: Profile): Promise<RouteResult> {
  if (points.length < 2) {
    return { coords: points.map((p) => [p.lat, p.lng]), legsSec: [], totalSec: 0, totalM: 0, fallback: false, estimate: profile === 'transit' }
  }
  const op = osrmProfile(profile)
  const url =
    `${BASE[op]}/route/v1/${op}/${coordsParam(points)}` + '?overview=full&geometries=geojson&steps=false'
  try {
    const res = await fetch(url)
    if (!res.ok) return straightLineFallback(points, profile)
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) return straightLineFallback(points, profile)
    const route = data.routes[0]
    const coords: [number, number][] = (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng],
    )
    let legsSec: number[] = (route.legs as Array<{ duration: number }>).map((l) => l.duration)
    let totalSec: number = route.duration
    if (profile === 'transit') {
      legsSec = legsSec.map((s) => s * TRANSIT_FACTOR + TRANSIT_WAIT_SEC)
      totalSec = legsSec.reduce((a, b) => a + b, 0)
    }
    return { coords, legsSec, totalSec, totalM: route.distance, fallback: false, estimate: profile === 'transit' }
  } catch {
    return straightLineFallback(points, profile)
  }
}

/** Matriz de durações (segundos) entre todos os pontos. Fallback haversine. */
export async function durationMatrix(points: LatLng[], profile: Profile): Promise<number[][]> {
  const n = points.length
  const scale = (v: number, i: number, j: number) =>
    profile === 'transit' && i !== j ? v * TRANSIT_FACTOR + TRANSIT_WAIT_SEC : v
  const fallback = (): number[][] => {
    const speed = FALLBACK_SPEED[profile]
    return points.map((a, i) => points.map((b, j) => scale(haversineMeters(a, b) / speed, i, j)))
  }
  if (n < 2) return fallback()

  const op = osrmProfile(profile)
  const url = `${BASE[op]}/table/v1/${op}/${coordsParam(points)}?annotations=duration`
  try {
    const res = await fetch(url)
    if (!res.ok) return fallback()
    const data = await res.json()
    if (data.code !== 'Ok' || !Array.isArray(data.durations)) return fallback()
    const m = data.durations as (number | null)[][]
    const speed = FALLBACK_SPEED[profile]
    return m.map((row, i) =>
      row.map((v, j) => scale(v == null ? haversineMeters(points[i], points[j]) / speed : v, i, j)),
    )
  } catch {
    return fallback()
  }
}
