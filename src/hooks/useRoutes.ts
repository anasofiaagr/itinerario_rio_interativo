import { useEffect, useRef, useState } from 'react'
import type { Day } from '../types'
import { geoStops, routeKey } from '../lib/day'
import { routeThrough, type RouteResult } from '../services/osrm'

export type RouteMap = Record<string, RouteResult | undefined>

/**
 * Busca (e cacheia) a rota OSRM de cada dia visível. Cache por `routeKey`, então
 * só refaz a chamada quando a ordem/perfil/pontos mudam. Falha vira linha reta.
 */
export function useRoutes(days: Day[]): RouteMap {
  const [routes, setRoutes] = useState<RouteMap>({})
  const cache = useRef<Map<string, RouteResult>>(new Map())

  useEffect(() => {
    let cancelled = false

    async function run() {
      const next: RouteMap = {}
      const toFetch: Day[] = []
      for (const day of days) {
        const key = routeKey(day)
        const cached = cache.current.get(key)
        if (cached) next[day.id] = cached
        else toFetch.push(day)
      }
      if (Object.keys(next).length) setRoutes((r) => ({ ...r, ...next }))

      for (const day of toFetch) {
        if (cancelled) return
        const pts = geoStops(day).map((s) => ({ lat: s.lat, lng: s.lng }))
        const result = await routeThrough(pts, day.profile)
        if (cancelled) return
        cache.current.set(routeKey(day), result)
        setRoutes((r) => ({ ...r, [day.id]: result }))
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.map(routeKey).join('||')])

  return routes
}
