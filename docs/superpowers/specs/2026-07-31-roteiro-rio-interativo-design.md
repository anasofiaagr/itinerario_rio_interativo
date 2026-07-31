# Roteiro Rio Interativo — Design

App web pessoal, mobile-first, de roteiro de viagem em mapa. Uso andando pelo Rio,
uma mão, no sol. Sem backend.

## Stack

- Vite + React + TypeScript
- react-leaflet + Leaflet, tiles do OpenStreetMap (sem chave)
- Nominatim (OSM) para busca/geocodificação
- OSRM demo server para rotas reais (perfis `foot` e `driving`)
- `@dnd-kit` para reordenar arrastando
- `vite-plugin-pwa` (Workbox) para app-shell + cache de tiles (offline best-effort)
- Vitest para testes do otimizador
- Sem backend. Estado em localStorage + import/export de JSON. Git desde o início.

## Modelo de dados

```ts
type Category = 'praia'|'museu'|'feira'|'comida'|'natureza'|'transporte'|'casa'|'noite'

interface Hours { open?: number; close?: number } // minutos desde meia-noite

interface Stop {
  id: string
  name: string
  emoji: string
  lat?: number            // undefined => item só de agenda (não vai pro mapa/rota)
  lng?: number
  time?: string           // "HH:MM"
  durationMin?: number
  notes?: string
  locked?: boolean        // não muda de posição nem de horário no otimizador
  category: Category
  hours?: Hours           // janela de funcionamento (restrição do otimizador)
  unavailableNote?: string // ex.: "só domingo — indisponível nas datas da viagem"
}

interface Day {
  id: string
  date: string            // ISO "2026-08-04"
  label: string
  emoji: string
  color: string           // dirige pin, rota e aba
  profile: 'foot'|'driving' // modo de deslocamento do dia
  stops: Stop[]
}

interface Pool { stops: Stop[] }

interface Itinerary { version: number; days: Day[]; pool: Pool }
```

Adições à spec original, justificadas:
- `Hours` — necessário para a restrição de janela do otimizador (Jardim Botânico
  fecha 17h; Museu do Amanhã abre 10h). Minutos desde meia-noite para comparar fácil.
- `unavailableNote` — para itens do pool indisponíveis nas datas (Feirinha da Glória).
- `lat/lng` opcionais — itens genéricos ("café sem pressa") são só de agenda.
- `Day.profile` — modo a pé/carro por dia (item 4).

## Seed (coordenadas verificadas no build)

Cada lugar com endereço real é resolvido via Nominatim durante o desenvolvimento,
conferido que está no Rio de Janeiro, e a coordenada é gravada fixa em `data/seed.ts`.
Itens genéricos ficam sem coordenada. Nada de coordenada inventada.

Dias: Dia 0 (chegada), Dia 1 (devagar), Dia 2 (Madureira+Centro), Dia 3 (mudança+Zona
Sul), Dia 4 (centro/praia/despedida). Pool com ideias fora dos dias. Cada dia tem cor
própria (paleta quente).

## Módulos (limites testáveis)

- `data/seed.ts` — dados iniciais com coords baked-in.
- `data/palette.ts` — cores dos dias + mapa categoria→emoji default.
- `services/nominatim.ts` — busca com debounce 1s, User-Agent próprio, viewbox do Rio.
  Trata erro/rate-limit. Máx 1 req/s.
- `services/osrm.ts` — `/route` (desenhar) e `/table` (matriz de durações) para foot e
  driving. Fallback haversine (linha reta) em falha/rate-limit. Nunca quebra a tela.
- `lib/geo.ts` — haversine, formatação de distância/tempo.
- `lib/optimizer.ts` — **puro**. Nearest-neighbor + 2-opt sobre matriz de durações.
  Respeita: `locked` (posição e horário fixos), primeira e última parada fixas, janelas
  `hours`. Retorna `{ order, beforeSec, afterSec }` para o diff antes/depois. Testado.
- `store/itinerary.ts` — reducer + persistência localStorage; import/export JSON; reset
  pro seed. Migrações por `version`.
- `components/` — `MapView`, `Drawer`, `DayTabs`, `StopCard`, `SearchPanel`,
  `OptimizeDialog`, `MapPin` (emoji + número + cor do dia).

## Funcionalidades → onde

1. Mapa tela cheia, pins com emoji, cor por dia, número da ordem — `MapView`/`MapPin`.
2. Drawer com abas por dia, cards arrastáveis (dnd-kit); clicar centraliza e abre popup.
3. Filtro "só dia atual" vs "viagem inteira".
4. Rota OSRM entre paradas do dia; tempo/distância totais + tempo de trecho no card;
   alternar foot/driving por dia.
5. Editar tudo: add/remover/renomear/emoji/horário; mover entre dias; enviar/puxar do pool.
6. Busca Nominatim (debounce 1s, User-Agent), resultados com endereço, add com 1 clique.
7. Import/export JSON; reset pro seed.
8. Offline best-effort: PWA (app-shell + runtime cache de tiles). Degrada sem quebrar.

## Otimizador

Botão "otimizar este dia":
- Matriz de durações via OSRM `/table` no perfil do dia; fallback haversine.
- Nearest-neighbor para ordem inicial, 2-opt para melhorar.
- Restrições: `locked` mantém índice e horário; primeira/última fixas; ordem final não
  pode violar janelas `hours` (chegada dentro de [open, close]).
- Mostra diff ("antes: 2h10 em trânsito → depois: 1h25"), aplica ou desfaz.

## Resiliência & licença

- Toda chamada OSRM/Nominatim com try/catch + tratamento de rate-limit → fallback linha
  reta. A tela nunca quebra.
- Atribuição do OpenStreetMap sempre visível no mapa.

## Visual

Paleta quente; tipografia com personalidade (display para títulos + sans limpo p/ UI);
emoji como elemento gráfico principal (pins/cards). Ergonomia de uma mão no sol: alvos
grandes, controles ao alcance do polegar, alto contraste. Interface 100% PT-BR.

## Testes

Vitest no `lib/optimizer.ts`:
- `locked` não muda de posição.
- Primeira/última paradas ficam fixas.
- Janela `hours` respeitada (não agenda chegada depois do fechamento).
- 2-opt reduz (ou mantém) o total vs ordem inicial.
- Fallback haversine quando não há matriz OSRM.

## Entrega

- Repo git desde o início; README com como rodar (`npm run dev`) e usar no celular.
- `npm run build` gera estático pronto para GitHub Pages.
- Criar/push do repositório GitHub só após confirmação (publica o conteúdo).
