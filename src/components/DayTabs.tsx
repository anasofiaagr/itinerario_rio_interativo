import type { Bank, Day } from '../types'
import type { Target } from '../store/itinerary'

interface Props {
  days: Day[]
  banks: Bank[]
  active: Target
  onSelect: (t: Target) => void
}

const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${wd} ${d}/${m}`
}

export default function DayTabs({ days, banks, active, onSelect }: Props) {
  return (
    <div className="tabs" role="tablist">
      {days.map((d) => {
        const on = active === d.id
        return (
          <button
            key={d.id}
            role="tab"
            aria-selected={on}
            className={`tab ${on ? 'tab--on' : ''}`}
            style={{ '--tab': d.color } as React.CSSProperties}
            onClick={() => onSelect(d.id)}
          >
            <span className="tab__emoji">{d.emoji}</span>
            <span className="tab__label">{d.label}</span>
            <span className="tab__date">{shortDate(d.date)}</span>
          </button>
        )
      })}
      {banks.map((b) => {
        const on = active === b.id
        return (
          <button
            key={b.id}
            role="tab"
            aria-selected={on}
            className={`tab ${on ? 'tab--on' : ''}`}
            style={{ '--tab': b.color } as React.CSSProperties}
            onClick={() => onSelect(b.id)}
          >
            <span className="tab__emoji">{b.emoji}</span>
            <span className="tab__label">{b.label}</span>
            <span className="tab__date">{b.stops.length} lugares</span>
          </button>
        )
      })}
    </div>
  )
}
