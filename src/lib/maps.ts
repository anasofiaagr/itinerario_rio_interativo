import type { LatLng } from './geo'

/**
 * URL do Google Maps com a rota de **transporte público** até um destino.
 * Se `origin` for omitido, o Google usa a localização atual do aparelho.
 * Abre no app do Google Maps no celular (ou no site), com tempos e linhas reais.
 */
export function googleMapsTransitUrl(dest: LatLng, origin?: LatLng): string {
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'transit',
    destination: `${dest.lat},${dest.lng}`,
  })
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
