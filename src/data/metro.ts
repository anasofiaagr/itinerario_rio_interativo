// Estações do MetrôRio (Linhas 1, 2 e 4), coordenadas do OpenStreetMap (Overpass),
// gravadas no build. Usadas para mostrar a estação de metrô mais próxima de cada
// parada — funciona offline, sem chamada de rede.
import { haversineMeters, type LatLng } from '../lib/geo'

export interface Station {
  name: string
  lat: number
  lng: number
}

export const METRO_STATIONS: Station[] = [
  { name: 'Acari / Fazenda Botafogo', lat: -22.824997, lng: -43.349302 },
  { name: 'Afonso Pena / Tijuca', lat: -22.918448, lng: -43.217745 },
  { name: 'Antero de Quental / Leblon', lat: -22.984543, lng: -43.223627 },
  { name: 'Botafogo', lat: -22.950365, lng: -43.184201 },
  { name: 'Cantagalo / Copacabana', lat: -22.975488, lng: -43.194457 },
  { name: 'Cardeal Arcoverde / Copacabana', lat: -22.963825, lng: -43.181372 },
  { name: 'Carioca / Centro', lat: -22.907567, lng: -43.178045 },
  { name: 'Catete', lat: -22.925955, lng: -43.17655 },
  { name: 'Central do Brasil / Centro', lat: -22.904611, lng: -43.191057 },
  { name: 'Cidade Nova', lat: -22.908746, lng: -43.206298 },
  { name: 'Cinelândia / Centro', lat: -22.910897, lng: -43.17568 },
  { name: 'Coelho Neto', lat: -22.831874, lng: -43.342919 },
  { name: 'Colégio', lat: -22.84266, lng: -43.334546 },
  { name: 'Del Castilho', lat: -22.879276, lng: -43.271927 },
  { name: 'Engenheiro Rubens Paiva', lat: -22.816296, lng: -43.358482 },
  { name: 'Engenho da Rainha', lat: -22.867924, lng: -43.297376 },
  { name: 'Estácio', lat: -22.913537, lng: -43.206571 },
  { name: 'Flamengo', lat: -22.93718, lng: -43.178539 },
  { name: 'General Osório / Ipanema', lat: -22.982116, lng: -43.196436 },
  { name: 'Glória', lat: -22.920635, lng: -43.176622 },
  { name: 'Gávea', lat: -22.97945, lng: -43.232295 },
  { name: 'Inhaúma', lat: -22.874568, lng: -43.283456 },
  { name: 'Irajá', lat: -22.848023, lng: -43.323265 },
  { name: 'Jardim Oceânico / Barra da Tijuca', lat: -23.006834, lng: -43.310962 },
  { name: 'Jardim de Alah / Leblon', lat: -22.983735, lng: -43.216266 },
  { name: 'Largo do Machado', lat: -22.931135, lng: -43.177677 },
  { name: 'Maracanã', lat: -22.909716, lng: -43.23389 },
  { name: 'Maria da Graça', lat: -22.881494, lng: -43.260188 },
  { name: 'Nossa Senhora da Paz / Ipanema', lat: -22.983721, lng: -43.206023 },
  { name: 'Pavuna', lat: -22.806318, lng: -43.365475 },
  { name: 'Praça Onze', lat: -22.909917, lng: -43.200283 },
  { name: 'Saara / Presidente Vargas', lat: -22.903286, lng: -43.186205 },
  { name: 'Saens Peña / Tijuca', lat: -22.924168, lng: -43.232574 },
  { name: 'Siqueira Campos / Copacabana', lat: -22.967307, lng: -43.187337 },
  { name: 'São Conrado', lat: -22.99123, lng: -43.255027 },
  { name: 'São Cristóvão', lat: -22.909693, lng: -43.220995 },
  { name: 'São Francisco Xavier / Tijuca', lat: -22.920576, lng: -43.223672 },
  { name: 'Thomáz Coelho', lat: -22.8626, lng: -43.306794 },
  { name: 'Triagem', lat: -22.896855, lng: -43.244478 },
  { name: 'Uruguai / Tijuca', lat: -22.930929, lng: -43.238286 },
  { name: 'Uruguaiana / Engenheiro Fernando Mac Dowell', lat: -22.902893, lng: -43.181799 },
  { name: 'Vicente de Carvalho', lat: -22.854041, lng: -43.313154 },
]

/** Estação de metrô mais próxima de um ponto, com a distância em metros. */
export function nearestMetro(point: LatLng): { station: Station; distanceM: number } {
  let best = METRO_STATIONS[0]
  let bestD = Infinity
  for (const s of METRO_STATIONS) {
    const d = haversineMeters(point, s)
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return { station: best, distanceM: bestD }
}
