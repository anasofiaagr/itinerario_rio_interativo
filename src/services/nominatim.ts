// Busca de lugares via Nominatim (OSM). A API pede no máximo 1 req/s e um
// User-Agent identificável. O debounce de 1s fica na UI (SearchPanel).

export interface NomResult {
  name: string
  displayName: string
  lat: number
  lng: number
}

// Rio de Janeiro (município): viewbox p/ enviesar resultados.
const RIO_VIEWBOX = '-43.80,-22.75,-43.10,-23.10'
const UA = 'roteiro-rio-interativo/1.0 (uso pessoal)'

export class RateLimitError extends Error {}

/** Busca lugares no Rio. Nunca lança por falha de rede — retorna []. */
export async function searchRio(query: string, signal?: AbortSignal): Promise<NomResult[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q,
      format: 'jsonv2',
      limit: '6',
      viewbox: RIO_VIEWBOX,
      bounded: '1',
      addressdetails: '1',
    }).toString()

  try {
    const res = await fetch(url, {
      signal,
      headers: { 'Accept-Language': 'pt-BR', 'User-Agent': UA },
    })
    if (res.status === 429) throw new RateLimitError('Limite de requisições atingido')
    if (!res.ok) return []
    const data = (await res.json()) as Array<{
      display_name: string
      name?: string
      lat: string
      lon: string
    }>
    return data.map((r) => ({
      name: r.name && r.name.length > 0 ? r.name : r.display_name.split(',')[0],
      displayName: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }))
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    // AbortError (busca cancelada) ou falha de rede: silencioso
    return []
  }
}
