import { useState } from 'react'
import { verifyPassword } from './lib/api.js'

export default function PasswordGate({ onUnlocked }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const ok = await verifyPassword(value)
      if (ok) {
        onUnlocked()
      } else {
        setError('Onjuist wachtwoord. Probeer het opnieuw.')
      }
    } catch {
      setError('De controle lukte niet. Controleer je verbinding en probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2>Toegang</h2>
      <p className="intro">
        Deze tool is alleen bedoeld voor professionals van HumanCapitalCare en ArboNed.
        Vul het wachtwoord in dat je hebt ontvangen.
      </p>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="wachtwoord">Wachtwoord</label>
        <input
          id="wachtwoord"
          type="password"
          value={value}
          autoFocus
          autoComplete="current-password"
          onChange={(e) => setValue(e.target.value)}
        />
        {error && <p className="error" style={{ marginTop: '0.75rem' }}>{error}</p>}
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={!value.trim() || busy}
        >
          {busy ? 'Even controleren…' : 'Inloggen'}
        </button>
      </form>
    </section>
  )
}
