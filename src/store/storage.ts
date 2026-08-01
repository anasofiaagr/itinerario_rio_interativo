import type { Bank, Itinerary } from '../types'
import { makeSeed, SEED_VERSION } from '../data/seed'
import { POOL_COLOR, RESTAURANT_COLOR, WINE_COLOR } from '../data/palette'

const STORAGE_KEY = 'roteiro-rio:v1'

/** Carrega do localStorage ou cria a partir do seed. Nunca lança. */
export function loadItinerary(): Itinerary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return makeSeed()
    return migrate(JSON.parse(raw))
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

const DEFAULT_BANKS: Bank[] = [
  { id: 'pool', label: 'Banco de ideias', emoji: '💡', color: POOL_COLOR, stops: [] },
  { id: 'restaurants', label: 'Restaurantes', emoji: '🍽️', color: RESTAURANT_COLOR, stops: [] },
  { id: 'wine', label: 'Vinho', emoji: '🍷', color: WINE_COLOR, stops: [] },
]

// Bancos com conteúdo curado no seed que devem ser preenchidos automaticamente
// ao subir de versão (sem apagar nada que o usuário já tenha ali).
const CURATED_BANK_IDS = ['restaurants', 'wine']

/** Garante os campos mínimos e migra formatos antigos (pool -> banks). */
function migrate(raw: unknown): Itinerary {
  const it = raw as Partial<Itinerary> & { pool?: { stops?: unknown[] }; version?: number }
  if (!it || !Array.isArray(it.days)) return makeSeed()

  const storedVersion = it.version ?? 1

  let banks: Bank[]
  if (Array.isArray(it.banks) && it.banks.length) {
    banks = it.banks as Bank[]
  } else {
    // formato antigo: um único `pool`
    const poolStops = it.pool?.stops ?? []
    banks = DEFAULT_BANKS.map((b) =>
      b.id === 'pool' ? { ...b, stops: poolStops as Bank['stops'] } : { ...b },
    )
  }
  // garante que os bancos padrão existam
  for (const def of DEFAULT_BANKS) {
    if (!banks.some((b) => b.id === def.id)) banks.push({ ...def })
  }

  // Preenche/atualiza os bancos curados (Restaurantes/Vinho) a partir do seed,
  // sem apagar nada que o usuário tenha ali. Roda quando a versão salva é antiga.
  if (storedVersion < SEED_VERSION) {
    const seed = makeSeed()
    banks = banks.map((b) => {
      if (!CURATED_BANK_IDS.includes(b.id)) return b
      const seedBank = seed.banks.find((sb) => sb.id === b.id)
      if (!seedBank) return b
      // banco vazio: preenche com o seed inteiro
      if (b.stops.length === 0) return { ...b, stops: seedBank.stops }
      // banco já preenchido: só completa coordenadas que faltam (mantém edições)
      const seedById = new Map(seedBank.stops.map((s) => [s.id, s]))
      const stops = b.stops.map((s) => {
        const seedStop = seedById.get(s.id)
        if (seedStop && typeof s.lat !== 'number' && typeof seedStop.lat === 'number') {
          return { ...s, lat: seedStop.lat, lng: seedStop.lng }
        }
        return s
      })
      return { ...b, stops }
    })
  }

  return {
    version: SEED_VERSION,
    days: it.days.map((d) => ({ ...d, profile: d.profile ?? 'driving', stops: d.stops ?? [] })),
    banks,
  }
}

export function exportJson(it: Itinerary): string {
  return JSON.stringify(it, null, 2)
}

/** Valida e converte um JSON importado. Retorna null se inválido. */
export function parseImport(raw: string): Itinerary | null {
  try {
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.days)) return null
    // aceita tanto o formato novo (banks) quanto o antigo (pool)
    if (!Array.isArray(data.banks) && !data.pool) return null
    return migrate(data)
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
