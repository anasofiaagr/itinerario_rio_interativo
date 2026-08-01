import type { Category, SafetyLevel } from '../types'

/** Cores dos dias — paleta quente, cada dia com hue própria e contraste p/ texto branco. */
export const DAY_COLORS: string[] = [
  '#E0662A', // Dia 0 — laranja pôr do sol
  '#B8860B', // Dia 1 — dourado / mostarda
  '#C0392B', // Dia 2 — vermelho-carmim (feira)
  '#3E8E7E', // Dia 3 — verde-sálvia
  '#8E5572', // Dia 4 — ameixa queimada
  '#A0522D', // extra — terracota (para dias criados depois)
]

export const POOL_COLOR = '#7A7266' // cinza-terra para o banco de ideias
export const RESTAURANT_COLOR = '#B5533F' // terracota-avermelhado para restaurantes

export const CATEGORY_EMOJI: Record<Category, string> = {
  praia: '🏖️',
  museu: '🏛️',
  feira: '🧺',
  comida: '🍽️',
  natureza: '🌿',
  transporte: '🚗',
  casa: '🏠',
  noite: '🌙',
}

export const SAFETY_META: Record<SafetyLevel, { emoji: string; label: string; color: string }> = {
  tranquilo: { emoji: '🟢', label: 'Tranquilo', color: '#3E8E7E' },
  atencao: { emoji: '🟡', label: 'Atenção', color: '#C98A00' },
  evitar: { emoji: '🔴', label: 'Evitar', color: '#C0392B' },
}

export const SAFETY_LEVELS = Object.keys(SAFETY_META) as SafetyLevel[]

export const CATEGORY_LABEL: Record<Category, string> = {
  praia: 'Praia',
  museu: 'Museu',
  feira: 'Feira',
  comida: 'Comida',
  natureza: 'Natureza',
  transporte: 'Transporte',
  casa: 'Casa',
  noite: 'Noite',
}

/** "HH:MM" -> minutos desde meia-noite. Retorna undefined se inválido. */
export function hhmmToMin(s: string | undefined): number | undefined {
  if (!s) return undefined
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return undefined
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return undefined
  return h * 60 + min
}

/** minutos -> "HH:MM" (faz wrap em 24h). */
export function minToHHMM(n: number): string {
  const t = ((Math.round(n) % 1440) + 1440) % 1440
  const h = Math.floor(t / 60)
  const m = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
