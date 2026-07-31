import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Stop } from '../types'
import type { LatLng } from '../lib/geo'
import { formatDistance, formatDuration } from '../lib/geo'
import { nearestMetro } from '../data/metro'
import { googleMapsTransitUrl } from '../lib/maps'
import { SAFETY_META } from '../data/palette'

interface Props {
  stop: Stop
  order: number | null
  legSec?: number
  color: string
  selected: boolean
  prevPoint?: LatLng
  onSelect: () => void
  onEdit: () => void
}

export default function StopCard({
  stop,
  order,
  legSec,
  color,
  selected,
  prevPoint,
  onSelect,
  onEdit,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeftColor: color,
  }

  const hasCoords = typeof stop.lat === 'number' && typeof stop.lng === 'number'
  const agenda = !hasCoords

  // Estação de metrô mais próxima (só útil se estiver razoavelmente perto)
  const metro = hasCoords ? nearestMetro({ lat: stop.lat!, lng: stop.lng! }) : null
  const metroClose = metro && metro.distanceM < 2500
  const stationShort = metro ? metro.station.name.split(' / ')[0] : ''

  function openTransit() {
    if (!hasCoords) return
    const url = googleMapsTransitUrl({ lat: stop.lat!, lng: stop.lng! }, prevPoint)
    window.open(url, '_blank', 'noopener')
  }

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
            {metroClose && (
              <span className="chip chip--metro">Ⓜ️ {stationShort} · {formatDistance(metro!.distanceM)}</span>
            )}
            {stop.safety && (
              <span
                className="chip chip--safety"
                style={{ ['--sf' as string]: SAFETY_META[stop.safety].color }}
              >
                {SAFETY_META[stop.safety].emoji} {SAFETY_META[stop.safety].label}
              </span>
            )}
          </div>
          {stop.notes && <div className="card__notes">{stop.notes}</div>}
          {stop.unavailableNote && <div className="card__warn">⚠️ {stop.unavailableNote}</div>}
        </button>

        <div className="card__side">
          {hasCoords && (
            <button
              className="card__transit"
              onClick={openTransit}
              aria-label="Como chegar de transporte público"
              title="Rota de transporte público (Google Maps)"
            >
              🚌
            </button>
          )}
          <button className="card__edit" onClick={onEdit} aria-label="Editar">✎</button>
        </div>
      </div>
    </div>
  )
}
