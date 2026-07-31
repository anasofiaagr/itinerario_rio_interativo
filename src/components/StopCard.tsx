import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Category, Day, Stop } from '../types'
import type { Action, Target } from '../store/itinerary'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from '../data/palette'
import { formatDuration } from '../lib/geo'

const CATEGORIES = Object.keys(CATEGORY_EMOJI) as Category[]

interface Props {
  stop: Stop
  container: Target
  order: number | null
  legSec?: number
  color: string
  days: Day[]
  selected: boolean
  onSelect: () => void
  dispatch: React.Dispatch<Action>
}

export default function StopCard({
  stop,
  container,
  order,
  legSec,
  color,
  days,
  selected,
  onSelect,
  dispatch,
}: Props) {
  const [editing, setEditing] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeftColor: color,
  }

  const set = (patch: Partial<Stop>) => dispatch({ type: 'update', stopId: stop.id, patch })
  const agenda = typeof stop.lat !== 'number'

  return (
    <div ref={setNodeRef} style={style} className={`card ${selected ? 'card--selected' : ''}`}>
      <div className="card__row">
        <button className="card__handle" {...attributes} {...listeners} aria-label="Arrastar">
          <span className="card__emoji">{stop.emoji}</span>
          {order != null && <span className="card__num" style={{ background: color }}>{order}</span>}
        </button>

        <button className="card__main" onClick={onSelect}>
          <div className="card__name">
            {stop.name}
            {stop.locked && <span className="card__lock" title="Travada">🔒</span>}
          </div>
          <div className="card__meta">
            {stop.time && <span className="chip">🕒 {stop.time}</span>}
            {stop.durationMin != null && <span className="chip">⏳ {formatDuration(stop.durationMin * 60)}</span>}
            {agenda && <span className="chip chip--ghost">só agenda</span>}
            {legSec != null && legSec > 0 && (
              <span className="chip chip--leg">🚶 {formatDuration(legSec)} até aqui</span>
            )}
          </div>
          {stop.notes && <div className="card__notes">{stop.notes}</div>}
          {stop.unavailableNote && <div className="card__warn">⚠️ {stop.unavailableNote}</div>}
        </button>

        <button className="card__edit" onClick={() => setEditing((e) => !e)} aria-label="Editar">
          {editing ? '✕' : '✎'}
        </button>
      </div>

      {editing && (
        <div className="edit">
          <label className="edit__field edit__field--emoji">
            <span>Emoji</span>
            <input
              value={stop.emoji}
              onChange={(e) => set({ emoji: e.target.value })}
              maxLength={4}
            />
          </label>
          <label className="edit__field edit__field--name">
            <span>Nome</span>
            <input value={stop.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="edit__field">
            <span>Horário</span>
            <input
              type="time"
              value={stop.time ?? ''}
              onChange={(e) => set({ time: e.target.value || undefined })}
            />
          </label>
          <label className="edit__field">
            <span>Duração (min)</span>
            <input
              type="number"
              min={0}
              step={15}
              value={stop.durationMin ?? ''}
              onChange={(e) =>
                set({ durationMin: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
          <label className="edit__field">
            <span>Categoria</span>
            <select value={stop.category} onChange={(e) => set({ category: e.target.value as Category })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="edit__field edit__field--name">
            <span>Notas</span>
            <input
              value={stop.notes ?? ''}
              onChange={(e) => set({ notes: e.target.value || undefined })}
            />
          </label>
          <label className="edit__check">
            <input
              type="checkbox"
              checked={Boolean(stop.locked)}
              onChange={(e) => set({ locked: e.target.checked })}
            />
            <span>🔒 Travar (não reordena no otimizador)</span>
          </label>

          <div className="edit__move">
            <span>Mover para</span>
            <select
              value=""
              onChange={(e) => {
                const target = e.target.value as Target
                if (target) dispatch({ type: 'move', stopId: stop.id, target })
              }}
            >
              <option value="">escolher…</option>
              {days
                .filter((d) => d.id !== container)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.emoji} {d.label}
                  </option>
                ))}
              {container !== 'pool' && <option value="pool">💡 Banco de ideias</option>}
            </select>
          </div>

          <button
            className="edit__delete"
            onClick={() => dispatch({ type: 'remove', stopId: stop.id })}
          >
            🗑️ Remover
          </button>
        </div>
      )}
    </div>
  )
}
