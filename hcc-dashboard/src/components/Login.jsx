import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  async function inloggen(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord })
    if (error) {
      setFout(
        error.message === 'Invalid login credentials'
          ? 'Onjuist e-mailadres of wachtwoord.'
          : `Inloggen mislukt: ${error.message}`
      )
    }
    setBezig(false)
  }

  return (
    <div className="centreer">
      <form className="paneel" onSubmit={inloggen}>
        <h1>HCC Maandcijfers</h1>
        <label htmlFor="email">E-mailadres</label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="wachtwoord">Wachtwoord</label>
        <input id="wachtwoord" type="password" autoComplete="current-password" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)} required />
        <button className="knop primair" type="submit" disabled={bezig}>
          {bezig ? 'Bezig…' : 'Inloggen'}
        </button>
        {fout && <div className="fout-melding">{fout}</div>}
      </form>
    </div>
  )
}
