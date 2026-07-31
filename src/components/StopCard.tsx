import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Stop } from '../types'
import { formatDuration } from '../lib/geo'

interface Props {
  stop: Stop
  order: number | null
  legSec?: number
  color: string
  selected: boolean
  onSelect: () => void
  onEdit: () => void
}

export default function StopCard({ stop, order, legSec, color, selected, onSelect, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeftColor: color,
  }

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

        <button className="card__edit" onClick={onEdit} aria-label="Editar">✎</button>
      </div>
    </div>
  )
}
