export type Category =
  | 'praia'
  | 'museu'
  | 'feira'
  | 'comida'
  | 'natureza'
  | 'transporte'
  | 'casa'
  | 'noite'

/** Janela de funcionamento, em minutos desde meia-noite. */
export interface Hours {
  open?: number
  close?: number
}

export interface Stop {
  id: string
  name: string
  emoji: string
  /** undefined => item só de agenda (não vai pro mapa nem pra rota) */
  lat?: number
  lng?: number
  /** "HH:MM" */
  time?: string
  durationMin?: number
  notes?: string
  /** não muda de posição nem de horário no otimizador */
  locked?: boolean
  category: Category
  hours?: Hours
  /** ex.: "só domingo — indisponível nas datas da viagem" */
  unavailableNote?: string
}

export interface Day {
  id: string
  /** ISO "2026-08-04" */
  date: string
  label: string
  emoji: string
  /** cor do dia: dirige pin, rota e aba */
  color: string
  profile: 'foot' | 'driving' | 'transit'
  stops: Stop[]
}

export interface Pool {
  stops: Stop[]
}

export interface Itinerary {
  version: number
  days: Day[]
  pool: Pool
}
