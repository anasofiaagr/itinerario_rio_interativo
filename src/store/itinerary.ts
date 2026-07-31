import { useEffect, useReducer } from 'react'
import type { Day, Itinerary, Stop } from '../types'
import { loadItinerary, saveItinerary } from './storage'
import { makeSeed } from '../data/seed'

export type Target = string | 'pool' // dayId ou 'pool'

export type Action =
  | { type: 'add'; target: Target; stop: Stop; index?: number }
  | { type: 'remove'; stopId: string }
  | { type: 'update'; stopId: string; patch: Partial<Stop> }
  | { type: 'reorder'; dayId: string; orderedIds: string[] }
  | { type: 'reorderPool'; orderedIds: string[] }
  | { type: 'move'; stopId: string; target: Target; index?: number }
  | { type: 'setProfile'; dayId: string; profile: 'foot' | 'driving' }
  | { type: 'import'; itinerary: Itinerary }
  | { type: 'reset' }

function mapDay(it: Itinerary, dayId: string, fn: (d: Day) => Day): Itinerary {
  return { ...it, days: it.days.map((d) => (d.id === dayId ? fn(d) : d)) }
}

/** Remove a parada de onde estiver e devolve o novo estado + a parada removida. */
function extract(it: Itinerary, stopId: string): { it: Itinerary; stop?: Stop } {
  let found: Stop | undefined
  const days = it.days.map((d) => {
    const s = d.stops.find((x) => x.id === stopId)
    if (s) found = s
    return { ...d, stops: d.stops.filter((x) => x.id !== stopId) }
  })
  const poolStop = it.pool.stops.find((x) => x.id === stopId)
  if (poolStop) found = poolStop
  const pool = { stops: it.pool.stops.filter((x) => x.id !== stopId) }
  return { it: { ...it, days, pool }, stop: found }
}

function insert(it: Itinerary, target: Target, stop: Stop, index?: number): Itinerary {
  if (target === 'pool') {
    const stops = [...it.pool.stops]
    stops.splice(index ?? stops.length, 0, stop)
    return { ...it, pool: { stops } }
  }
  return mapDay(it, target, (d) => {
    const stops = [...d.stops]
    stops.splice(index ?? stops.length, 0, stop)
    return { ...d, stops }
  })
}

export function reducer(state: Itinerary, action: Action): Itinerary {
  switch (action.type) {
    case 'add':
      return insert(state, action.target, action.stop, action.index)

    case 'remove':
      return extract(state, action.stopId).it

    case 'update': {
      const patchStop = (s: Stop): Stop => (s.id === action.stopId ? { ...s, ...action.patch } : s)
      return {
        ...state,
        days: state.days.map((d) => ({ ...d, stops: d.stops.map(patchStop) })),
        pool: { stops: state.pool.stops.map(patchStop) },
      }
    }

    case 'reorder':
      return mapDay(state, action.dayId, (d) => {
        const byId = new Map(d.stops.map((s) => [s.id, s]))
        const ordered = action.orderedIds
          .map((id) => byId.get(id))
          .filter((s): s is Stop => Boolean(s))
        // preserva qualquer parada que não veio na lista (segurança)
        const rest = d.stops.filter((s) => !action.orderedIds.includes(s.id))
        return { ...d, stops: [...ordered, ...rest] }
      })

    case 'reorderPool': {
      const byId = new Map(state.pool.stops.map((s) => [s.id, s]))
      const ordered = action.orderedIds
        .map((id) => byId.get(id))
        .filter((s): s is Stop => Boolean(s))
      const rest = state.pool.stops.filter((s) => !action.orderedIds.includes(s.id))
      return { ...state, pool: { stops: [...ordered, ...rest] } }
    }

    case 'move': {
      const { it, stop } = extract(state, action.stopId)
      if (!stop) return state
      return insert(it, action.target, stop, action.index)
    }

    case 'setProfile':
      return mapDay(state, action.dayId, (d) => ({ ...d, profile: action.profile }))

    case 'import':
      return action.itinerary

    case 'reset':
      return makeSeed()

    default:
      return state
  }
}

export function useItinerary() {
  const [itinerary, dispatch] = useReducer(reducer, undefined, loadItinerary)

  useEffect(() => {
    saveItinerary(itinerary)
  }, [itinerary])

  return { itinerary, dispatch }
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}
