import { useEffect, useReducer } from 'react'
import type { Bank, Itinerary, Stop } from '../types'
import { loadItinerary, saveItinerary } from './storage'
import { makeSeed } from '../data/seed'

/** id de um container: um dia (dayId) ou um banco (bankId). */
export type Target = string

export type Action =
  | { type: 'add'; target: Target; stop: Stop; index?: number }
  | { type: 'remove'; stopId: string }
  | { type: 'update'; stopId: string; patch: Partial<Stop> }
  | { type: 'reorder'; containerId: Target; orderedIds: string[] }
  | { type: 'move'; stopId: string; target: Target; index?: number }
  | { type: 'setProfile'; dayId: string; profile: 'foot' | 'driving' | 'transit' }
  | { type: 'import'; itinerary: Itinerary }
  | { type: 'reset' }

/** Reordena as paradas de um container conforme a lista de ids. */
function applyOrder(stops: Stop[], orderedIds: string[]): Stop[] {
  const byId = new Map(stops.map((s) => [s.id, s]))
  const ordered = orderedIds.map((id) => byId.get(id)).filter((s): s is Stop => Boolean(s))
  const rest = stops.filter((s) => !orderedIds.includes(s.id)) // segurança
  return [...ordered, ...rest]
}

/** Aplica uma transformação nos stops do container (dia ou banco) com aquele id. */
function mapContainer(it: Itinerary, id: Target, fn: (stops: Stop[]) => Stop[]): Itinerary {
  return {
    ...it,
    days: it.days.map((d) => (d.id === id ? { ...d, stops: fn(d.stops) } : d)),
    banks: it.banks.map((b) => (b.id === id ? { ...b, stops: fn(b.stops) } : b)),
  }
}

/** Remove a parada de onde estiver e devolve o novo estado + a parada removida. */
function extract(it: Itinerary, stopId: string): { it: Itinerary; stop?: Stop } {
  let found: Stop | undefined
  const strip = (stops: Stop[]) => {
    const s = stops.find((x) => x.id === stopId)
    if (s) found = s
    return stops.filter((x) => x.id !== stopId)
  }
  const days = it.days.map((d) => ({ ...d, stops: strip(d.stops) }))
  const banks = it.banks.map((b) => ({ ...b, stops: strip(b.stops) }))
  return { it: { ...it, days, banks }, stop: found }
}

function insert(it: Itinerary, target: Target, stop: Stop, index?: number): Itinerary {
  return mapContainer(it, target, (stops) => {
    const next = [...stops]
    next.splice(index ?? next.length, 0, stop)
    return next
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
        banks: state.banks.map((b) => ({ ...b, stops: b.stops.map(patchStop) })),
      }
    }

    case 'reorder':
      return mapContainer(state, action.containerId, (stops) => applyOrder(stops, action.orderedIds))

    case 'move': {
      const { it, stop } = extract(state, action.stopId)
      if (!stop) return state
      return insert(it, action.target, stop, action.index)
    }

    case 'setProfile':
      return {
        ...state,
        days: state.days.map((d) =>
          d.id === action.dayId ? { ...d, profile: action.profile } : d,
        ),
      }

    case 'import':
      return action.itinerary

    case 'reset':
      return makeSeed()

    default:
      return state
  }
}

/** Encontra o container (dia ou banco) que contém a parada. */
export function findContainerId(it: Itinerary, stopId: string): Target | null {
  for (const d of it.days) if (d.stops.some((s) => s.id === stopId)) return d.id
  for (const b of it.banks) if (b.stops.some((s) => s.id === stopId)) return b.id
  return null
}

export function bankById(it: Itinerary, id: string): Bank | undefined {
  return it.banks.find((b) => b.id === id)
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
