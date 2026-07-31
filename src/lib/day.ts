import type { Day, Stop } from '../types'

/** Uma parada tem posição no mapa? (itens só de agenda não têm) */
export function hasCoords(s: Stop): s is Stop & { lat: number; lng: number } {
  return typeof s.lat === 'number' && typeof s.lng === 'number'
}

/** Paradas do dia que entram no mapa e na rota, na ordem atual. */
export function geoStops(day: Day): (Stop & { lat: number; lng: number })[] {
  return day.stops.filter(hasCoords)
}

/** Chave estável de uma rota — muda quando a ordem, o perfil ou os pontos mudam. */
export function routeKey(day: Day): string {
  return `${day.id}|${day.profile}|${geoStops(day)
    .map((s) => `${s.id}:${s.lat.toFixed(5)},${s.lng.toFixed(5)}`)
    .join('>')}`
}
