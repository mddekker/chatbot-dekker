import { useState } from 'react'
import { fetchStats } from './lib/api.js'

function formatDagNL(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

export default function StatsView() {
  const [wachtwoord, setWachtwoord] = useState('')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function laden(e) {
    if (e) e.preventDefault()
    if (!wachtwoord.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await fetchStats(wachtwoord)
      if (result.error) {
        setError(result.error)
      } else {
        setStats(result)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!stats) {
    return (
      <section className="card">
        <h2>Gebruiksstatistieken</h2>
        <p className="intro">
          Alleen voor de beheerder. Vul het beheerderswachtwoord in om de
          gebruikscijfers te bekijken.
        </p>
        <form onSubmit={laden}>
          <label className="field-label" htmlFor="beheerwachtwoord">Beheerderswachtwoord</label>
          <input
            id="beheerwachtwoord"
            type="password"
            value={wachtwoord}
            autoFocus
            onChange={(e) => setWachtwoord(e.target.value)}
          />
          {error && <p className="error" style={{ marginTop: '0.75rem' }}>{error}</p>}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={!wachtwoord.trim() || busy}
          >
            {busy ? 'Even laden…' : 'Bekijk statistieken'}
          </button>
        </form>
        <a className="stats-terug" href="/">Terug naar de app</a>
      </section>
    )
  }

  const vandaag = new Date()
  const dagen = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(vandaag)
    d.setDate(vandaag.getDate() - i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    dagen.push({ iso, aantal: stats.perDag?.[iso] || 0 })
  }
  const maxDag = Math.max(1, ...dagen.map((d) => d.aantal))

  return (
    <section className="card">
      <h2>Gebruiksstatistieken</h2>
      <p className="hint">
        Er worden uitsluitend aantallen geteld — geen inhoud en geen
        persoonsgegevens.
      </p>

      <div className="stats-totaal">
        <span className="stats-getal">{stats.totaal}</span>
        <span>terugkoppelingen gegenereerd in totaal</span>
      </div>

      <h3>Laatste 14 dagen</h3>
      <div className="stats-dagen">
        {dagen.map((d) => (
          <div className="stats-dag" key={d.iso}>
            <span className="stats-dag-label">{formatDagNL(d.iso)}</span>
            <div className="stats-dag-balk-track">
              <div
                className="stats-dag-balk"
                style={{ width: `${(d.aantal / maxDag) * 100}%` }}
              />
            </div>
            <span className="stats-dag-aantal">{d.aantal}</span>
          </div>
        ))}
      </div>

      <h3>Per taal</h3>
      <ul className="stats-lijst">
        {Object.entries(stats.perTaal || {}).map(([taal, aantal]) => (
          <li key={taal}>{taal}: <strong>{aantal}</strong></li>
        ))}
        {Object.keys(stats.perTaal || {}).length === 0 && <li>Nog geen gegevens</li>}
      </ul>

      <h3>Per type spreekuur</h3>
      <ul className="stats-lijst">
        {Object.entries(stats.perType || {}).map(([type, aantal]) => (
          <li key={type}>{type}: <strong>{aantal}</strong></li>
        ))}
        {Object.keys(stats.perType || {}).length === 0 && <li>Nog geen gegevens</li>}
      </ul>

      <div className="button-row">
        <a className="btn btn-ghost" href="/">Terug naar de app</a>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => laden()}>
          {busy ? 'Even laden…' : 'Vernieuwen'}
        </button>
      </div>
    </section>
  )
}
