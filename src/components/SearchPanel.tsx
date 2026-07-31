import { useEffect, useRef, useState } from 'react'
import type { Day, Stop } from '../types'
import type { Action, Target } from '../store/itinerary'
import { newId } from '../store/itinerary'
import { searchRio, RateLimitError, type NomResult } from '../services/nominatim'

interface Props {
  days: Day[]
  defaultTarget: Target
  dispatch: React.Dispatch<Action>
  onClose: () => void
}

type Status = 'idle' | 'loading' | 'ok' | 'empty' | 'error' | 'rate'

export default function SearchPanel({ days, defaultTarget, dispatch, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NomResult[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [target, setTarget] = useState<Target>(defaultTarget)
  const abortRef = useRef<AbortController | null>(null)

  // Debounce de 1s — a API do Nominatim pede no máx. 1 requisição por segundo.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setStatus('idle')
      setResults([])
      return
    }
    setStatus('loading')
    const t = window.setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const res = await searchRio(q, ctrl.signal)
        setResults(res)
        setStatus(res.length ? 'ok' : 'empty')
      } catch (err) {
        setStatus(err instanceof RateLimitError ? 'rate' : 'error')
      }
    }, 1000)
    return () => window.clearTimeout(t)
  }, [query])

  function add(r: NomResult) {
    const stop: Stop = {
      id: newId(),
      name: r.name,
      emoji: '📍',
      lat: r.lat,
      lng: r.lng,
      category: 'natureza',
      notes: r.displayName,
    }
    dispatch({ type: 'add', target, stop })
    onClose()
  }

  return (
    <div className="sheet" role="dialog" aria-label="Buscar lugar">
      <div className="sheet__head">
        <strong>🔎 Buscar lugar no Rio</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
      </div>

      <input
        className="search__input"
        autoFocus
        placeholder="Ex.: Feira de São Cristóvão"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <label className="search__target">
        Adicionar em
        <select value={target} onChange={(e) => setTarget(e.target.value as Target)}>
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {d.emoji} {d.label}
            </option>
          ))}
          <option value="pool">💡 Banco de ideias</option>
        </select>
      </label>

      <div className="search__results">
        {status === 'loading' && <div className="search__hint">Buscando…</div>}
        {status === 'empty' && <div className="search__hint">Nada encontrado no Rio.</div>}
        {status === 'error' && (
          <div className="search__hint">Sem conexão com a busca. Tente de novo.</div>
        )}
        {status === 'rate' && (
          <div className="search__hint">Muitas buscas seguidas — espere um segundo.</div>
        )}
        {status === 'idle' && <div className="search__hint">Digite ao menos 3 letras.</div>}
        {status === 'ok' &&
          results.map((r, i) => (
            <button key={i} className="result" onClick={() => add(r)}>
              <div className="result__name">📍 {r.name}</div>
              <div className="result__addr">{r.displayName}</div>
            </button>
          ))}
      </div>
    </div>
  )
}
