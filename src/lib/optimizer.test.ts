import { describe, it, expect } from 'vitest'
import { optimizeDay, type OptStop } from './optimizer'

/** Helper: matriz simétrica a partir de uma tabela de pares (segundos). */
function sym(n: number, pairs: Record<string, number>): number[][] {
  const m = Array.from({ length: n }, () => Array(n).fill(0))
  for (const [k, v] of Object.entries(pairs)) {
    const [i, j] = k.split('-').map(Number)
    m[i][j] = v
    m[j][i] = v
  }
  return m
}

describe('optimizeDay', () => {
  it('mantém a primeira e a última parada fixas', () => {
    // 5 paradas numa linha; ordem inicial fora de ordem
    const stops: OptStop[] = [
      { id: 's0' }, { id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' },
    ]
    // x = 0,3,1,2,4  -> travel = |dx| * 100
    const x = [0, 3, 1, 2, 4]
    const m = Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => Math.abs(x[i] - x[j]) * 100),
    )
    const r = optimizeDay(stops, m)
    expect(r.order[0]).toBe('s0')
    expect(r.order[r.order.length - 1]).toBe('s4')
  })

  it('reduz o tempo total de deslocamento (nearest-neighbor + 2-opt)', () => {
    const stops: OptStop[] = [
      { id: 's0' }, { id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' },
    ]
    const x = [0, 3, 1, 2, 4]
    const m = Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => Math.abs(x[i] - x[j]) * 100),
    )
    const r = optimizeDay(stops, m)
    expect(r.beforeSec).toBe(800) // 3+2+1+2 = 8 -> 800
    expect(r.afterSec).toBe(400) // 0,1,2,3,4 em x -> 4 -> 400
    expect(r.afterSec).toBeLessThan(r.beforeSec)
    expect(r.changed).toBe(true)
    // ordem ótima em x: s0,s2,s3,s1,s4
    expect(r.order).toEqual(['s0', 's2', 's3', 's1', 's4'])
  })

  it('não move uma parada com locked=true da sua posição', () => {
    const stops: OptStop[] = [
      { id: 's0' }, { id: 's1', locked: true }, { id: 's2' }, { id: 's3' }, { id: 's4' },
    ]
    const x = [0, 3, 1, 2, 4]
    const m = Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => Math.abs(x[i] - x[j]) * 100),
    )
    const r = optimizeDay(stops, m)
    // s1 travada no índice 1
    expect(r.order[1]).toBe('s1')
    expect(r.order[0]).toBe('s0')
    expect(r.order[4]).toBe('s4')
  })

  it('não agenda chegada depois do fechamento (respeita janela)', () => {
    // Ordem inicial (barata) é inválida; deve trocar para a ordem válida mais cara.
    const stops: OptStop[] = [
      { id: 's0' },
      { id: 'b', durationMin: 60 },
      { id: 'a', hours: { close: 530 } }, // fecha 08:50
      { id: 's3' },
    ]
    // matriz não-métrica p/ controlar tempos
    const m = sym(4, {
      '0-1': 600, // s0-b  (10min)
      '0-2': 1200, // s0-a (20min)
      '1-2': 300, // b-a   (5min)
      '1-3': 1800, // b-s3
      '2-3': 600, // a-s3
      '0-3': 9999,
    })
    // Entrada: s0,b,a,s3 (barata=1500). Chega em 'a' às 08:55 -> inválida.
    const r = optimizeDay(stops, m, { startMin: 480 })
    // Resultado válido: s0,a,b,s3 (a chega às 08:20)
    expect(r.order).toEqual(['s0', 'a', 'b', 's3'])
    expect(r.changed).toBe(true)
  })

  it('mantém uma ordem já válida e ótima (changed=false)', () => {
    const stops: OptStop[] = [
      { id: 's0' }, { id: 's1' }, { id: 's2' }, { id: 's3' },
    ]
    const x = [0, 1, 2, 3]
    const m = Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 4 }, (_, j) => Math.abs(x[i] - x[j]) * 100),
    )
    const r = optimizeDay(stops, m)
    expect(r.changed).toBe(false)
    expect(r.order).toEqual(['s0', 's1', 's2', 's3'])
  })

  it('não quebra com poucas paradas', () => {
    const r = optimizeDay([{ id: 'a' }, { id: 'b' }], [[0, 100], [100, 0]])
    expect(r.order).toEqual(['a', 'b'])
    expect(r.changed).toBe(false)
  })
})
