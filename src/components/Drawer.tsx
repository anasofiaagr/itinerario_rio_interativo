import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Itinerary, Day, Stop } from '../types'
import type { Action, Target } from '../store/itinerary'
import { geoStops } from '../lib/day'
import { formatDistance, formatDuration } from '../lib/geo'
import { POOL_COLOR } from '../data/palette'
import type { RouteMap } from '../hooks/useRoutes'
import DayTabs from './DayTabs'
import StopCard from './StopCard'

interface Props {
  itinerary: Itinerary
  active: Target
  routes: RouteMap
  selectedStopId: string | null
  expanded: boolean
  dispatch: React.Dispatch<Action>
  onSelectTab: (t: Target) => void
  onSelectStop: (id: string) => void
  onOpenSearch: () => void
  onOpenOptimize: () => void
  onToggleExpanded: () => void
}

export default function Drawer(props: Props) {
  const { itinerary, active, routes, selectedStopId, expanded, dispatch } = props
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const day: Day | undefined = itinerary.days.find((d) => d.id === active)
  const stops: Stop[] = active === 'pool' ? itinerary.pool.stops : day?.stops ?? []
  const color = active === 'pool' ? POOL_COLOR : day?.color ?? POOL_COLOR

  // ordem geográfica + tempos de trecho
  const gs = day ? geoStops(day) : []
  const route = day ? routes[day.id] : undefined
  const orderById = new Map<string, number>()
  const legById = new Map<string, number>()
  gs.forEach((s, i) => {
    orderById.set(s.id, i + 1)
    if (i > 0 && route?.legsSec[i - 1] != null) legById.set(s.id, route.legsSec[i - 1])
  })

  function onDragEnd(e: DragEndEvent) {
    const { active: a, over } = e
    if (!over || a.id === over.id) return
    const ids = stops.map((s) => s.id)
    const from = ids.indexOf(String(a.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    const next = ids.slice()
    next.splice(to, 0, next.splice(from, 1)[0])
    if (active === 'pool') dispatch({ type: 'reorderPool', orderedIds: next })
    else if (day) dispatch({ type: 'reorder', dayId: day.id, orderedIds: next })
  }

  return (
    <section className={`drawer ${expanded ? 'drawer--full' : ''}`}>
      <button className="drawer__grip" onClick={props.onToggleExpanded} aria-label="Expandir painel">
        <span className="drawer__grip-bar" />
      </button>

      <DayTabs
        days={itinerary.days}
        poolCount={itinerary.pool.stops.length}
        active={active}
        onSelect={props.onSelectTab}
      />

      <div className="drawer__toolbar">
        {day ? (
          <>
            <div className="totals">
              {route ? (
                <>
                  <span className="totals__main">
                    {day.profile === 'foot' ? '🚶' : '🚗'} {formatDuration(route.totalSec)} ·{' '}
                    {formatDistance(route.totalM)}
                  </span>
                  {route.fallback && <span className="totals__warn">linha reta</span>}
                </>
              ) : (
                <span className="totals__main">calculando rota…</span>
              )}
            </div>
            <div className="drawer__actions">
              <div className="modeswitch" role="group" aria-label="Modo de deslocamento">
                <button
                  className={day.profile === 'foot' ? 'on' : ''}
                  onClick={() => dispatch({ type: 'setProfile', dayId: day.id, profile: 'foot' })}
                >
                  🚶 a pé
                </button>
                <button
                  className={day.profile === 'driving' ? 'on' : ''}
                  onClick={() => dispatch({ type: 'setProfile', dayId: day.id, profile: 'driving' })}
                >
                  🚗 carro
                </button>
              </div>
              <button className="btn btn--sm" onClick={props.onOpenOptimize}>✨ Otimizar</button>
              <button className="btn btn--sm" onClick={props.onOpenSearch}>＋ Lugar</button>
            </div>
          </>
        ) : (
          <div className="drawer__actions drawer__actions--pool">
            <span className="totals__main">💡 Ideias fora dos dias</span>
            <button className="btn btn--sm" onClick={props.onOpenSearch}>＋ Lugar</button>
          </div>
        )}
      </div>

      <div className="drawer__list">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {stops.map((s) => (
              <StopCard
                key={s.id}
                stop={s}
                container={active}
                order={orderById.get(s.id) ?? null}
                legSec={legById.get(s.id)}
                color={color}
                days={itinerary.days}
                selected={s.id === selectedStopId}
                onSelect={() => props.onSelectStop(s.id)}
                dispatch={dispatch}
              />
            ))}
            {stops.length === 0 && (
              <p className="drawer__empty">Sem paradas aqui ainda. Toque em “＋ Lugar”.</p>
            )}
          </SortableContext>
        </DndContext>
      </div>
    </section>
  )
}
