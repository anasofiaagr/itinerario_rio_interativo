import { describe, it, expect } from 'vitest'
import { haversineMeters, formatDistance, formatDuration } from './geo'

describe('haversineMeters', () => {
  it('mede ~distância entre Copacabana e Pão de Açúcar (~3,5 km)', () => {
    const copa = { lat: -22.9711, lng: -43.1822 }
    const pao = { lat: -22.9503, lng: -43.1601 }
    const d = haversineMeters(copa, pao)
    expect(d).toBeGreaterThan(2800)
    expect(d).toBeLessThan(3600)
  })

  it('é zero para o mesmo ponto', () => {
    const p = { lat: -22.9, lng: -43.1 }
    expect(haversineMeters(p, p)).toBe(0)
  })
})

describe('formatDistance', () => {
  it('metros abaixo de 950', () => {
    expect(formatDistance(120)).toBe('120 m')
  })
  it('km com vírgula decimal', () => {
    expect(formatDistance(1500)).toBe('1,5 km')
  })
  it('km inteiro acima de 10', () => {
    expect(formatDistance(12000)).toBe('12 km')
  })
})

describe('formatDuration', () => {
  it('minutos', () => {
    expect(formatDuration(720)).toBe('12 min')
  })
  it('horas e minutos', () => {
    expect(formatDuration(4200)).toBe('1h10')
  })
  it('horas exatas', () => {
    expect(formatDuration(7200)).toBe('2h')
  })
})
