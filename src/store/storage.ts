import type { Itinerary } from '../types'
import { makeSeed, SEED_VERSION } from '../data/seed'

const STORAGE_KEY = 'roteiro-rio:v1'

/** Carrega do localStorage ou cria a partir do seed. Nunca lança. */
export function loadItinerary(): Itinerary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return makeSeed()
    const parsed = JSON.parse(raw) as Itinerary
    return migrate(parsed)
  } catch {
    return makeSeed()
  }
}

export function saveItinerary(it: Itinerary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(it))
  } catch {
    // localStorage cheio ou indisponível: ignora silenciosamente
  }
}

/** Migrações futuras por versão. Hoje só garante os campos mínimos. */
function migrate(it: Itinerary): Itinerary {
  if (!it || !Array.isArray(it.days)) return makeSeed()
  return {
    version: it.version ?? SEED_VERSION,
    days: it.days.map((d) => ({ ...d, profile: d.profile ?? 'driving', stops: d.stops ?? [] })),
    pool: it.pool ?? { stops: [] },
  }
}

export function exportJson(it: Itinerary): string {
  return JSON.stringify(it, null, 2)
}

/** Valida e converte um JSON importado. Retorna null se inválido. */
export function parseImport(raw: string): Itinerary | null {
  try {
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.days) || !data.pool || !Array.isArray(data.pool.stops)) {
      return null
    }
    return migrate(data as Itinerary)
  } catch {
    return null
  }
}

export function downloadJson(it: Itinerary): void {
  const blob = new Blob([exportJson(it)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `roteiro-rio-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export { STORAGE_KEY }
