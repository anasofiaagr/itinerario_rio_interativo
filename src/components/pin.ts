import L from 'leaflet'

/** Cria um pin com o emoji da parada, a cor do dia e o número da ordem. */
export function makePinIcon(
  emoji: string,
  color: string,
  order: number | null,
  selected: boolean,
): L.DivIcon {
  const num = order != null ? `<span class="pin__num">${order}</span>` : ''
  return L.divIcon({
    className: 'pin-wrap',
    html: `
      <div class="pin ${selected ? 'pin--selected' : ''}" style="--pin:${color}">
        <span class="pin__emoji">${emoji}</span>
        ${num}
      </div>`,
    iconSize: [42, 50],
    iconAnchor: [21, 48],
    popupAnchor: [0, -46],
  })
}
