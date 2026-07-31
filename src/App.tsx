import { useMemo, useRef, useState } from 'react'
import type { Day } from './types'
import { useItinerary, type Target } from './store/itinerary'
import { downloadJson, parseImport } from './store/storage'
import { POOL_COLOR } from './data/palette'
import { useRoutes } from './hooks/useRoutes'
import MapView from './components/MapView'
import Drawer from './components/Drawer'
import SearchPanel from './components/SearchPanel'
import OptimizeDialog from './components/OptimizeDialog'

export default function App() {
  const { itinerary, dispatch } = useItinerary()
  const [active, setActive] = useState<Target>(itinerary.days[0]?.id ?? 'pool')
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [showAllTrip, setShowAllTrip] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [optimizeOpen, setOptimizeOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const activeDay = itinerary.days.find((d) => d.id === active)

  // Dias reais visíveis (para rota): dia atual ou viagem inteira
  const routeDays: Day[] = useMemo(
    () => (showAllTrip ? itinerary.days : activeDay ? [activeDay] : []),
    [showAllTrip, itinerary.days, activeDay],
  )
  const routes = useRoutes(routeDays)

  // Pins do mapa: dias reais + (quando na aba do banco) as ideias como pseudo-dia
  const mapDays: Day[] = useMemo(() => {
    const base = [...routeDays]
    if (active === 'pool') {
      base.push({
        id: 'pool',
        date: '',
        label: 'Banco de ideias',
        emoji: '💡',
        color: POOL_COLOR,
        profile: 'foot',
        stops: itinerary.pool.stops,
      })
    }
    return base
  }, [routeDays, active, itinerary.pool.stops])

  function selectStop(id: string) {
    setSelectedStopId(id)
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
        onOpenSearch={() => setSearchOpen(true)}
        onOpenOptimize={() => setOptimizeOpen(true)}
        onToggleExpanded={() => setExpanded((v) => !v)}
      />

      {searchOpen && (
        <div className="overlay" onClick={() => setSearchOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <SearchPanel
              days={itinerary.days}
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
    </div>
  )
}
