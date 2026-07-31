import { hhmmToMin } from '../data/palette'

export interface OptStop {
  id: string
  lat?: number
  lng?: number
  locked?: boolean
  hours?: { open?: number; close?: number }
  time?: string
  durationMin?: number
}

export interface OptResult {
  /** ordem final dos ids */
  order: string[]
  /** tempo total de deslocamento da ordem original, em segundos */
  beforeSec: number
  /** tempo total de deslocamento da ordem final, em segundos */
  afterSec: number
  /** true se a ordem mudou em relação à entrada */
  changed: boolean
}

const INVALID_PENALTY = 1e12

function travelOf(order: number[], m: number[][]): number {
  let t = 0
  for (let k = 0; k < order.length - 1; k++) t += m[order[k]]?.[order[k + 1]] ?? 0
  return t
}

/**
 * Caminha o relógio pela ordem: chegada = anterior + parada + trajeto.
 * Espera abrir (open) e reprova se chega depois de fechar (close).
 */
function isValid(order: number[], stops: OptStop[], m: number[][], startSec: number): boolean {
  let clock = startSec
  for (let k = 0; k < order.length; k++) {
    if (k > 0) clock += m[order[k - 1]]?.[order[k]] ?? 0
    const s = stops[order[k]]
    if (s.hours?.open != null) {
      const openSec = s.hours.open * 60
      if (clock < openSec) clock = openSec
    }
    if (s.hours?.close != null && clock > s.hours.close * 60) return false
    clock += (s.durationMin ?? 0) * 60
  }
  return true
}

function scoreOf(order: number[], stops: OptStop[], m: number[][], startSec: number): number {
  const penalty = isValid(order, stops, m, startSec) ? 0 : INVALID_PENALTY
  return penalty + travelOf(order, m)
}

/** Índices que não podem mudar de posição: primeira, última e travadas. */
function pinnedIndices(stops: OptStop[]): Set<number> {
  const pins = new Set<number>()
  const n = stops.length
  if (n > 0) pins.add(0)
  if (n > 1) pins.add(n - 1)
  stops.forEach((s, i) => {
    if (s.locked) pins.add(i)
  })
  return pins
}

/** Semente por vizinho-mais-próximo, respeitando as posições travadas. */
function nearestNeighborSeed(stops: OptStop[], m: number[][], pins: Set<number>): number[] {
  const n = stops.length
  const result: number[] = Array(n).fill(-1)
  const freePositions: number[] = []
  const pool: number[] = []
  for (let i = 0; i < n; i++) {
    if (pins.has(i)) result[i] = i
    else {
      freePositions.push(i)
      pool.push(i)
    }
  }
  let prev = -1
  for (let pos = 0; pos < n; pos++) {
    if (pins.has(pos)) {
      prev = result[pos]
      continue
    }
    let bestIdx = 0
    let bestCost = Infinity
    for (let c = 0; c < pool.length; c++) {
      const cost = prev < 0 ? 0 : (m[prev]?.[pool[c]] ?? 0)
      if (cost < bestCost) {
        bestCost = cost
        bestIdx = c
      }
    }
    const chosen = pool.splice(bestIdx, 1)[0]
    result[pos] = chosen
    prev = chosen
  }
  return result
}

/** Melhoria local: trocas de posições livres + reversões de segmentos sem pinos. */
function localSearch(
  start: number[],
  stops: OptStop[],
  m: number[][],
  startSec: number,
  pins: Set<number>,
): number[] {
  const n = start.length
  let current = start.slice()
  let currentScore = scoreOf(current, stops, m, startSec)
  const isFree = (pos: number) => !pins.has(pos)

  let improved = true
  while (improved) {
    improved = false

    // Troca de duas posições livres
    for (let i = 1; i < n - 1 && !improved; i++) {
      if (!isFree(i)) continue
      for (let j = i + 1; j < n - 1; j++) {
        if (!isFree(j)) continue
        const cand = current.slice()
        ;[cand[i], cand[j]] = [cand[j], cand[i]]
        const s = scoreOf(cand, stops, m, startSec)
        if (s < currentScore - 1e-9) {
          current = cand
          currentScore = s
          improved = true
          break
        }
      }
    }
    if (improved) continue

    // 2-opt: reverter segmento [i..j] se nenhuma posição interna for travada
    for (let i = 1; i < n - 1 && !improved; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        let hasPin = false
        for (let k = i; k <= j; k++) {
          if (!isFree(k)) {
            hasPin = true
            break
          }
        }
        if (hasPin) continue
        const cand = current.slice()
        let lo = i
        let hi = j
        while (lo < hi) {
          ;[cand[lo], cand[hi]] = [cand[hi], cand[lo]]
          lo++
          hi--
        }
        const s = scoreOf(cand, stops, m, startSec)
        if (s < currentScore - 1e-9) {
          current = cand
          currentScore = s
          improved = true
          break
        }
      }
    }
  }
  return current
}

/**
 * Otimiza a ordem das paradas de um dia para reduzir o tempo de deslocamento,
 * respeitando: primeira/última fixas, paradas travadas (locked) e janelas (hours).
 *
 * matrix[i][j] = segundos de trajeto da parada i para a j (índices alinham com `stops`).
 */
export function optimizeDay(
  stops: OptStop[],
  matrix: number[][],
  opts?: { startMin?: number },
): OptResult {
  const n = stops.length
  const identity = stops.map((_, i) => i)
  const beforeSec = travelOf(identity, matrix)

  if (n <= 3) {
    // 0,1,2 paradas: nada a reordenar (primeira e última já fixam tudo até n=2;
    // com n=3 a do meio é a única livre e não tem para onde ir).
    return { order: stops.map((s) => s.id), beforeSec, afterSec: beforeSec, changed: false }
  }

  const startMin = opts?.startMin ?? hhmmToMin(stops[0]?.time) ?? 0
  const startSec = startMin * 60
  const pins = pinnedIndices(stops)

  const candidates: number[][] = [
    localSearch(identity, stops, matrix, startSec, pins),
    localSearch(nearestNeighborSeed(stops, matrix, pins), stops, matrix, startSec, pins),
  ]

  let best = identity
  let bestScore = scoreOf(identity, stops, matrix, startSec)
  for (const c of candidates) {
    const s = scoreOf(c, stops, matrix, startSec)
    if (s < bestScore - 1e-9) {
      best = c
      bestScore = s
    }
  }

  const order = best.map((i) => stops[i].id)
  const changed = best.some((idx, pos) => idx !== identity[pos])
  return { order, beforeSec, afterSec: travelOf(best, matrix), changed }
}
