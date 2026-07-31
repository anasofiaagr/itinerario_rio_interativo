import type { Day } from '../types'
import { POOL_COLOR } from '../data/palette'
import type { Target } from '../store/itinerary'

interface Props {
  days: Day[]
  poolCount: number
  active: Target
  onSelect: (t: Target) => void
}

const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${wd} ${d}/${m}`
}

export default function DayTabs({ days, poolCount, active, onSelect }: Props) {
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
      <button
        role="tab"
        aria-selected={active === 'pool'}
        className={`tab ${active === 'pool' ? 'tab--on' : ''}`}
        style={{ '--tab': POOL_COLOR } as React.CSSProperties}
        onClick={() => onSelect('pool')}
      >
        <span className="tab__emoji">💡</span>
        <span className="tab__label">Banco de ideias</span>
        <span className="tab__date">{poolCount} lugares</span>
      </button>
    </div>
  )
}
