import type { Category, Day, Stop } from '../types'
import type { Action, Target } from '../store/itinerary'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from '../data/palette'

const CATEGORIES = Object.keys(CATEGORY_EMOJI) as Category[]

interface Props {
  stop: Stop
  container: Target
  days: Day[]
  dispatch: React.Dispatch<Action>
  onClose: () => void
}

export default function EditStopSheet({ stop, container, days, dispatch, onClose }: Props) {
  const set = (patch: Partial<Stop>) => dispatch({ type: 'update', stopId: stop.id, patch })

  return (
    <div className="sheet" role="dialog" aria-label="Editar parada">
      <div className="sheet__head">
        <strong>
          <span className="sheet__emoji">{stop.emoji}</span> Editar
        </strong>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
      </div>

      <div className="edit">
        <label className="edit__field edit__field--emoji">
          <span>Emoji</span>
          <input value={stop.emoji} onChange={(e) => set({ emoji: e.target.value })} maxLength={4} />
        </label>
        <label className="edit__field edit__field--name">
          <span>Nome</span>
          <input value={stop.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="edit__field">
          <span>Horário</span>
          <input
            type="time"
            value={stop.time ?? ''}
            onChange={(e) => set({ time: e.target.value || undefined })}
          />
        </label>
        <label className="edit__field">
          <span>Duração (min)</span>
          <input
            type="number"
            min={0}
            step={15}
            value={stop.durationMin ?? ''}
            onChange={(e) => set({ durationMin: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label className="edit__field edit__field--name">
          <span>Categoria</span>
          <select value={stop.category} onChange={(e) => set({ category: e.target.value as Category })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="edit__field edit__field--name">
          <span>Notas</span>
          <input value={stop.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })} />
        </label>
        <label className="edit__check">
          <input
            type="checkbox"
            checked={Boolean(stop.locked)}
            onChange={(e) => set({ locked: e.target.checked })}
          />
          <span>🔒 Travar (não reordena no otimizador)</span>
        </label>

        <div className="edit__move">
          <span>Mover para</span>
          <select
            value=""
            onChange={(e) => {
              const target = e.target.value as Target
              if (target) {
                dispatch({ type: 'move', stopId: stop.id, target })
                onClose()
              }
            }}
          >
            <option value="">escolher…</option>
            {days
              .filter((d) => d.id !== container)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.emoji} {d.label}
                </option>
              ))}
            {container !== 'pool' && <option value="pool">💡 Banco de ideias</option>}
          </select>
        </div>

        <button
          className="edit__delete"
          onClick={() => {
            dispatch({ type: 'remove', stopId: stop.id })
            onClose()
          }}
        >
          🗑️ Remover parada
        </button>
      </div>
    </div>
  )
}
