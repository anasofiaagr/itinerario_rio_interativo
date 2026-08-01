import { useMemo, useRef, useState } from 'react'
import type { Day } from './types'
import { useItinerary, findContainerId, type Target } from './store/itinerary'
import { downloadJson, parseImport } from './store/storage'
import { useRoutes } from './hooks/useRoutes'
import MapView from './components/MapView'
import Drawer from './components/Drawer'
import SearchPanel from './components/SearchPanel'
import OptimizeDialog from './components/OptimizeDialog'
import EditStopSheet from './components/EditStopSheet'

export default function App() {
  const { itinerary, dispatch } = useItinerary()
  const [active, setActive] = useState<Target>(itinerary.days[0]?.id ?? 'pool')
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [centerNonce, setCenterNonce] = useState(0)
  const [showAllTrip, setShowAllTrip] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [optimizeOpen, setOptimizeOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingStopId, setEditingStopId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const activeDay = itinerary.days.find((d) => d.id === active)

  const activeBank = itinerary.banks.find((b) => b.id === active)

  // Localiza a parada em edição e seu container (dia ou banco)
  const editing = useMemo(() => {
    if (!editingStopId) return null
    const all = [
      ...itinerary.days.flatMap((d) => d.stops),
      ...itinerary.banks.flatMap((b) => b.stops),
    ]
    const stop = all.find((s) => s.id === editingStopId)
    if (!stop) return null
    const container = findContainerId(itinerary, editingStopId) ?? active
    return { stop, container }
  }, [editingStopId, itinerary, active])

  // Dias reais visíveis (para rota): dia atual ou viagem inteira
  const routeDays: Day[] = useMemo(
    () => (showAllTrip ? itinerary.days : activeDay ? [activeDay] : []),
    [showAllTrip, itinerary.days, activeDay],
  )
  const routes = useRoutes(routeDays)

  // Pins do mapa: dias reais + (quando num banco) as paradas do banco como pseudo-dia
  const mapDays: Day[] = useMemo(() => {
    const base = [...routeDays]
    if (activeBank) {
      base.push({
        id: activeBank.id,
        date: '',
        label: activeBank.label,
        emoji: activeBank.emoji,
        color: activeBank.color,
        profile: 'foot',
        stops: activeBank.stops,
      })
    }
    return base
  }, [routeDays, activeBank])

  function selectStop(id: string) {
    setSelectedStopId(id)
    setCenterNonce((n) => n + 1) // recentraliza mesmo se for o mesmo card
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((txt) => {
      const parsed = parseImport(txt)
      if (parsed) {
        dispatch({ type: 'import', itinerary: parsed })
        setActive(parsed.days[0]?.id ?? 'pool')
        setMenuOpen(false)
      } else {
        alert('Arquivo inválido. Esperado um JSON de roteiro exportado por este app.')
      }
    })
    e.target.value = ''
  }

  return (
    <div className="app">
      <MapView
        visibleDays={mapDays}
        routes={routes}
        selectedStopId={selectedStopId}
        centerNonce={centerNonce}
        onSelectStop={selectStop}
      />

      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__mark">🧭</span>
          <span className="topbar__title">Roteiro Rio</span>
        </div>
        <div className="topbar__right">
          <button
            className={`pill ${showAllTrip ? '' : 'pill--on'}`}
            onClick={() => setShowAllTrip(false)}
          >
            Dia atual
          </button>
          <button
            className={`pill ${showAllTrip ? 'pill--on' : ''}`}
            onClick={() => setShowAllTrip(true)}
          >
            Viagem toda
          </button>
          <button className="icon-btn" onClick={() => setMenuOpen((m) => !m)} aria-label="Menu">
            ⋯
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="menu">
          <button
            className="menu__item"
            onClick={() => {
              downloadJson(itinerary)
              setMenuOpen(false)
            }}
          >
            ⬇️ Exportar JSON
          </button>
          <button className="menu__item" onClick={() => fileRef.current?.click()}>
            ⬆️ Importar JSON
          </button>
          <button
            className="menu__item menu__item--danger"
            onClick={() => {
              if (confirm('Voltar ao roteiro original? Suas mudanças serão perdidas.')) {
                dispatch({ type: 'reset' })
                setActive(itinerary.days[0]?.id ?? 'pool')
                setMenuOpen(false)
              }
            }}
          >
            ♻️ Resetar pro roteiro original
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onImportFile}
          />
        </div>
      )}

      <Drawer
        itinerary={itinerary}
        active={active}
        routes={routes}
        selectedStopId={selectedStopId}
        expanded={expanded}
        dispatch={dispatch}
        onSelectTab={(t) => {
          setActive(t)
          setSelectedStopId(null)
        }}
        onSelectStop={selectStop}
        onEditStop={(id) => setEditingStopId(id)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenOptimize={() => setOptimizeOpen(true)}
        onToggleExpanded={() => setExpanded((v) => !v)}
      />

      {searchOpen && (
        <div className="overlay" onClick={() => setSearchOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <SearchPanel
              days={itinerary.days}
              banks={itinerary.banks}
              defaultTarget={active}
              dispatch={dispatch}
              onClose={() => setSearchOpen(false)}
            />
          </div>
        </div>
      )}

      {optimizeOpen && activeDay && (
        <div className="overlay" onClick={() => setOptimizeOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <OptimizeDialog day={activeDay} dispatch={dispatch} onClose={() => setOptimizeOpen(false)} />
          </div>
        </div>
      )}

      {editing && (
        <div className="overlay" onClick={() => setEditingStopId(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <EditStopSheet
              stop={editing.stop}
              container={editing.container}
              days={itinerary.days}
              banks={itinerary.banks}
              dispatch={dispatch}
              onClose={() => setEditingStopId(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
