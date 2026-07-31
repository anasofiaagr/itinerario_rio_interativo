import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import type L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Day } from '../types'
import { geoStops } from '../lib/day'
import { makePinIcon } from './pin'
import type { RouteMap } from '../hooks/useRoutes'

interface MapMarker {
  id: string
  name: string
  emoji: string
  lat: number
  lng: number
  time?: string
  notes?: string
  color: string
  order: number
}

interface Props {
  visibleDays: Day[]
  routes: RouteMap
  selectedStopId: string | null
  /** muda a cada toque num card — força recentrar mesmo no mesmo lugar */
  centerNonce: number
  onSelectStop: (id: string) => void
}

function buildMarkers(days: Day[]): MapMarker[] {
  const out: MapMarker[] = []
  for (const day of days) {
    geoStops(day).forEach((s, i) => {
      out.push({
        id: s.id,
        name: s.name,
        emoji: s.emoji,
        lat: s.lat,
        lng: s.lng,
        time: s.time,
        notes: s.notes,
        color: day.color,
        order: i + 1,
      })
    })
  }
  return out
}

/** Controla câmera e popups a partir do estado externo. */
function MapController({
  markers,
  selectedStopId,
  centerNonce,
  markerRefs,
}: {
  markers: MapMarker[]
  selectedStopId: string | null
  centerNonce: number
  markerRefs: React.MutableRefObject<Map<string, L.Marker>>
}) {
  const map = useMap()
  const fitKey = markers.map((m) => m.id).join(',')

  // Enquadra as paradas visíveis quando o conjunto muda
  useEffect(() => {
    if (!markers.length) return
    const bounds = markers.map((m) => [m.lat, m.lng]) as [number, number][]
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  // Centraliza e abre popup da parada selecionada.
  // Desloca o alvo para cima para não ficar escondido atrás da gaveta de baixo.
  useEffect(() => {
    if (!selectedStopId) return
    const m = markers.find((x) => x.id === selectedStopId)
    if (!m) return
    const zoom = Math.max(map.getZoom(), 15)
    // ~22% da altura para baixo => o pin fica na faixa visível acima da gaveta
    const offsetY = map.getSize().y * 0.22
    const pt = map.project([m.lat, m.lng], zoom).add([0, offsetY])
    const target = map.unproject(pt, zoom)
    map.flyTo(target, zoom, { duration: 0.6 })
    const marker = markerRefs.current.get(selectedStopId)
    if (marker) window.setTimeout(() => marker.openPopup(), 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStopId, centerNonce])

  return null
}

export default function MapView({ visibleDays, routes, selectedStopId, centerNonce, onSelectStop }: Props) {
  const markers = useMemo(() => buildMarkers(visibleDays), [visibleDays])
  const markerRefs = useRef<Map<string, L.Marker>>(new Map())

  return (
    <MapContainer
      center={[-22.95, -43.35]}
      zoom={11}
      zoomControl={false}
      className="map"
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      {visibleDays.map((day) => {
        const r = routes[day.id]
        if (!r || r.coords.length < 2) return null
        return (
          <Polyline
            key={`route-${day.id}`}
            positions={r.coords}
            pathOptions={{
              color: day.color,
              weight: 5,
              opacity: 0.75,
              dashArray: r.fallback ? '2 10' : undefined,
              lineCap: 'round',
            }}
          />
        )
      })}

      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={makePinIcon(m.emoji, m.color, m.order, m.id === selectedStopId)}
          ref={(ref) => {
            if (ref) markerRefs.current.set(m.id, ref)
            else markerRefs.current.delete(m.id)
          }}
          eventHandlers={{ click: () => onSelectStop(m.id) }}
        >
          <Popup>
            <div className="popup">
              <div className="popup__title">
                <span className="popup__emoji">{m.emoji}</span> {m.name}
              </div>
              {m.time && <div className="popup__meta">🕒 {m.time}</div>}
              {m.notes && <div className="popup__notes">{m.notes}</div>}
            </div>
          </Popup>
        </Marker>
      ))}

      <MapController
        markers={markers}
        selectedStopId={selectedStopId}
        centerNonce={centerNonce}
        markerRefs={markerRefs}
      />
    </MapContainer>
  )
}
