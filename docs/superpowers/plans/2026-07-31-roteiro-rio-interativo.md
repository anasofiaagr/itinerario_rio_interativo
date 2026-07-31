# Roteiro Rio Interativo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A mobile-first, offline-capable personal travel-itinerary map app for Rio, no backend.

**Architecture:** React SPA. Pure `lib/` modules (geo, optimizer) with Vitest tests. Thin `services/` wrappers over Nominatim/OSRM with haversine fallback. A reducer-based store persisted to localStorage. Leaflet map + a bottom drawer of drag-sortable day cards.

**Tech Stack:** Vite, React, TypeScript, react-leaflet/Leaflet, @dnd-kit, vite-plugin-pwa, Vitest.

## Global Constraints

- No backend; state in localStorage; import/export JSON; reset-to-seed.
- Nominatim: max 1 req/s, debounce 1s, custom User-Agent, Rio viewbox bias.
- OSRM demo server: use `/route` (draw) and `/table` (matrix); always fallback to haversine on error/rate-limit; never break the screen.
- OSM attribution visible on the map (license requirement).
- Seed coordinates verified in Rio at build time and baked into `data/seed.ts`. Never invent coordinates. Generic items have no coords.
- Interface 100% PT-BR. Mobile-first, one-handed ergonomics, warm palette, emoji as primary graphic.
- Frequent commits, TDD for `lib/optimizer.ts`.

---

### Task 1: Scaffold project

**Files:** `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`.

- [ ] Scaffold Vite react-ts, install deps: `leaflet react-leaflet @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`, dev: `vitest @types/leaflet vite-plugin-pwa`.
- [ ] Configure `vite.config.ts` with `base` for Pages, PWA plugin (app-shell + runtime cache for `*.tile.openstreetmap.org`), Vitest (`environment: 'jsdom'` for component bits, node for lib).
- [ ] Minimal App renders. `npm run dev` works. Commit.

### Task 2: Types + palette

**Files:** Create `src/types.ts`, `src/data/palette.ts`.

**Produces:** `Stop`, `Day`, `Pool`, `Itinerary`, `Category`, `Hours` (per spec data model). `DAY_COLORS: string[]`, `CATEGORY_EMOJI: Record<Category,string>`, `hhmmToMin(s)`, `minToHHMM(n)`.

- [ ] Write the interfaces exactly as in the spec. Commit.

### Task 3: geo lib (TDD)

**Files:** Create `src/lib/geo.ts`, `src/lib/geo.test.ts`.

**Produces:** `haversineMeters(a,b)`, `formatDistance(m)`, `formatDuration(sec)`.

- [ ] Test: haversine between two known Rio points ≈ expected (±2%). FAIL → implement → PASS.
- [ ] Test: `formatDuration(4200)==='1h10'`, `formatDistance(1500)==='1,5 km'`. Commit.

### Task 4: optimizer lib (TDD — core tested unit)

**Files:** Create `src/lib/optimizer.ts`, `src/lib/optimizer.test.ts`.

**Interfaces / Produces:**
```ts
interface OptStop { id: string; lat?: number; lng?: number; locked?: boolean; hours?: {open?:number;close?:number}; time?: string; durationMin?: number }
interface OptResult { order: string[]; beforeSec: number; afterSec: number; changed: boolean }
// matrix[i][j] = seconds from stop i to stop j (indexes align with input array)
function optimizeDay(stops: OptStop[], matrix: number[][], opts?: { startMin?: number }): OptResult
```
Rules: first & last index fixed; `locked` stops keep their index; nearest-neighbor seed then 2-opt on movable positions; reject any candidate order where a stop with `hours.close` would be *arrived at* after close (arrival computed by walking cumulative travel+duration from `startMin` or first stop's `time`). `beforeSec`/`afterSec` = total travel seconds of input order vs output order.

- [ ] Test: locked stop stays at its index after optimize.
- [ ] Test: first and last stops unchanged.
- [ ] Test: a window-violating reorder is rejected (stop with `close` stays reachable in time).
- [ ] Test: 2-opt result total ≤ input total.
- [ ] Test: `changed=false` when input already optimal.
- [ ] Implement → all PASS. Commit.

### Task 5: services — nominatim + osrm

**Files:** Create `src/services/nominatim.ts`, `src/services/osrm.ts`.

**Produces:**
```ts
// nominatim
interface NomResult { name: string; displayName: string; lat: number; lng: number }
function searchRio(query: string, signal?: AbortSignal): Promise<NomResult[]>
// osrm
interface RouteResult { coords: [number,number][]; legsSec: number[]; totalSec: number; totalM: number; fallback: boolean }
function routeThrough(points: {lat:number;lng:number}[], profile: 'foot'|'driving'): Promise<RouteResult>
function durationMatrix(points: {lat:number;lng:number}[], profile: 'foot'|'driving'): Promise<number[][]> // haversine fallback
```
- [ ] Nominatim: `https://nominatim.openstreetmap.org/search` with `format=jsonv2`, `viewbox` Rio bbox, `bounded=1`, `limit=6`, header `User-Agent: roteiro-rio-interativo/1.0 (personal use)`. try/catch → `[]`.
- [ ] OSRM route/table via `router.project-osrm.org` demo; on any failure compute haversine straight-line legs (speed: foot 1.35 m/s, driving 8.3 m/s) so nothing breaks. Commit.

### Task 6: seed data with verified coords (build-time geocode)

**Files:** Create `src/data/seed.ts`.

- [ ] Geocode every real place (Task S below) via Nominatim CLI, verify each lat/lng is within Rio bbox, bake into `seed.ts`. Generic/agenda items have no lat/lng. Each day gets a color from `DAY_COLORS`, an emoji, a `profile`. Pool includes availability notes. Commit.

### Task 7: store + persistence

**Files:** Create `src/store/itinerary.ts` (reducer + actions), `src/store/storage.ts` (load/save localStorage, export/import JSON, reset).

**Produces:** actions: add/remove/rename/setEmoji/setTime/reorder/moveStopToDay/toDay↔pool, setDayProfile, importJson, exportJson, reset. `useItinerary()` hook.
- [ ] Load from localStorage or seed; persist on change; versioned migration. Commit.

### Task 8: MapView + pins + route

**Files:** Create `src/components/MapView.tsx`, `src/components/MapPin.tsx`.
- [ ] Full-screen Leaflet, OSM tiles + attribution. Emoji divIcon pins colored by day with order number. Draw day route polyline in the day color from OSRM (fallback straight line). "só dia atual" vs "viagem inteira" filter. Click pin → popup. Commit.

### Task 9: Drawer + DayTabs + StopCard (dnd)

**Files:** Create `src/components/Drawer.tsx`, `DayTabs.tsx`, `StopCard.tsx`.
- [ ] Bottom drawer (mobile) with day tabs colored by day. dnd-kit sortable cards; card shows emoji/name/time/duration + per-leg travel time. Tap card → center map + open popup. Edit controls (rename, emoji, time, move day, to/from pool). Totals (distance/time) + foot/driving toggle per day. Commit.

### Task 10: SearchPanel (Nominatim)

**Files:** Create `src/components/SearchPanel.tsx`.
- [ ] Debounced (1s) search, results w/ address, one-tap add to day or pool. Loading/erro/rate-limit states. Commit.

### Task 11: OptimizeDialog

**Files:** Create `src/components/OptimizeDialog.tsx`.
- [ ] "Otimizar este dia": fetch matrix (OSRM/fallback), run `optimizeDay`, show before→after diff, Aplicar / Desfazer. Commit.

### Task 12: Visual polish + import/export UI + PWA verify

**Files:** `src/index.css`, `src/App.tsx`, `public/manifest`, README.
- [ ] Warm palette, display+sans fonts, big tap targets. Import/export/reset buttons. Verify PWA builds and tiles cache. README (rodar + usar no celular). Commit.

### Task S: Places to geocode (verify each in Rio bbox ~ lat -23.10..-22.75, lng -43.80..-43.10)

Aeroporto Santos Dumont · Cinema Barra da Tijuca (shopping) · Pedra do Pontal (Recreio) ·
Mercadão de Madureira · Central do Brasil · Rua do Senado (Centro) · Rua do Lavradio ·
Aterro do Flamengo · Jardim Botânico · Arpoador · Praça XV · Museu do Amanhã · Praia
Vermelha · Bondinho Pão de Açúcar · Mureta da Urca · Aeroporto Galeão · Grumari · Prainha ·
Praia da Joatinga · São Conrado · MAR · Museu Nacional de Belas Artes · Mercadão de Madureira
(Baile Charme / Feirinha da Glória → coord do local, com nota de disponibilidade).
Base 1 Recreio / Base 2 Zona Sul → sem coord exata (privado) ou centro do bairro; manter genérico.

## Self-Review notes

- Spec coverage: features 1–8, optimizer, tests, resilience, attribution, visual — each mapped to a task above.
- Optimizer arrival-time window check uses cumulative travel+durationMin from startMin; tested in Task 4.
- Fallback path exists in every OSRM/Nominatim call (Task 5) and is exercised by optimizer tests via injected matrix.
