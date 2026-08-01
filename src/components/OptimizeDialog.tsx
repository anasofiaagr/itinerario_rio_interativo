import { useEffect, useState } from 'react'
import type { Day } from '../types'
import type { Action } from '../store/itinerary'
import { geoStops } from '../lib/day'
import { durationMatrix } from '../services/osrm'
import { optimizeDay, type OptStop } from '../lib/optimizer'
import { formatDuration } from '../lib/geo'
import { hhmmToMin } from '../data/palette'

interface Props {
  day: Day
  dispatch: React.Dispatch<Action>
  onClose: () => void
}

type Phase = 'loading' | 'ready' | 'applied' | 'noop' | 'error'

/** Reordena os ids do dia inteiro colocando as paradas geográficas na nova ordem,
 *  mantendo os itens só-de-agenda nas suas posições. */
function applyGeoOrder(day: Day, newGeoOrder: string[]): string[] {
  const byId = new Map(day.stops.map((s) => [s.id, s]))
  let g = 0
  return day.stops.map((s) => {
    if (typeof s.lat === 'number' && byId.has(newGeoOrder[g])) {
      return newGeoOrder[g++]
    }
    return s.id
  })
}

export default function OptimizeDialog({ day, dispatch, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [beforeSec, setBeforeSec] = useState(0)
  const [afterSec, setAfterSec] = useState(0)
  const [fullOrder, setFullOrder] = useState<string[]>([])
  const [prevOrder] = useState<string[]>(() => day.stops.map((s) => s.id))

  useEffect(() => {
    let cancelled = false
    async function run() {
      const gs = geoStops(day)
      if (gs.length < 3) {
        setPhase('noop')
        return
      }
      try {
        const points = gs.map((s) => ({ lat: s.lat, lng: s.lng }))
        const matrix = await durationMatrix(points, day.profile)
        if (cancelled) return
        const optStops: OptStop[] = gs.map((s) => ({
          id: s.id,
          lat: s.lat,
          lng: s.lng,
          locked: s.locked,
          hours: s.hours,
          time: s.time,
          durationMin: s.durationMin,
        }))
        const startMin = hhmmToMin(gs[0].time)
        const result = optimizeDay(optStops, matrix, startMin != null ? { startMin } : undefined)
        if (cancelled) return
        setBeforeSec(result.beforeSec)
        setAfterSec(result.afterSec)
        if (!result.changed) {
          setPhase('noop')
        } else {
          setFullOrder(applyGeoOrder(day, result.order))
          setPhase('ready')
        }
      } catch {
        if (!cancelled) setPhase('error')
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function apply() {
    dispatch({ type: 'reorder', containerId: day.id, orderedIds: fullOrder })
    setPhase('applied')
  }
  function undo() {
    dispatch({ type: 'reorder', containerId: day.id, orderedIds: prevOrder })
    onClose()
  }

  const saved = beforeSec - afterSec

  return (
    <div className="sheet" role="dialog" aria-label="Otimizar dia">
      <div className="sheet__head">
        <strong>✨ Otimizar {day.emoji} {day.label}</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
      </div>

      {phase === 'loading' && <div className="search__hint">Calculando a melhor ordem…</div>}

      {phase === 'error' && (
        <div className="search__hint">Não consegui calcular agora. Tente de novo.</div>
      )}

      {phase === 'noop' && (
        <div className="opt">
          <p className="opt__ok">👍 Este dia já está bem resolvido — nada a reordenar.</p>
          <button className="btn" onClick={onClose}>Fechar</button>
        </div>
      )}

      {phase === 'ready' && (
        <div className="opt">
          <div className="opt__diff">
            <div className="opt__before">
              <span>antes</span>
              <strong>{formatDuration(beforeSec)}</strong>
            </div>
            <div className="opt__arrow">→</div>
            <div className="opt__after">
              <span>depois</span>
              <strong>{formatDuration(afterSec)}</strong>
            </div>
          </div>
          <p className="opt__saved">
            {saved > 0
              ? `Economiza ${formatDuration(saved)} em trânsito.`
              : 'Mesmo tempo de trânsito, mas respeitando as janelas de horário.'}
          </p>
          <div className="opt__actions">
            <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn--primary" onClick={apply}>Aplicar nova ordem</button>
          </div>
        </div>
      )}

      {phase === 'applied' && (
        <div className="opt">
          <p className="opt__ok">✅ Nova ordem aplicada.</p>
          <div className="opt__actions">
            <button className="btn btn--ghost" onClick={undo}>↩︎ Desfazer</button>
            <button className="btn btn--primary" onClick={onClose}>Pronto</button>
          </div>
        </div>
      )}
    </div>
  )
}
