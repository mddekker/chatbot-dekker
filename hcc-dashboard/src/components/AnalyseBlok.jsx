import { useEffect, useState } from 'react'
import { brutalFacts } from '../lib/brutalFacts.js'
import { genereerAnalyse } from '../lib/analyseApi.js'
import { haalAnalyseOp, bewaarAnalyse } from '../lib/store.js'
import { maandLabel, entiteitLabel } from '../lib/entities.js'

export default function AnalyseBlok({ idx, ent, maand }) {
  const bevindingen = brutalFacts(idx, ent, maand)
  const [analyse, setAnalyse] = useState(null)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  useEffect(() => {
    setAnalyse(null)
    setFout(null)
    haalAnalyseOp(maand).then(setAnalyse).catch(() => {})
  }, [maand])

  async function genereer() {
    setBezig(true)
    setFout(null)
    try {
      const tekst = await genereerAnalyse(idx, maand)
      await bewaarAnalyse(maand, tekst)
      setAnalyse({ maand, inhoud: tekst, created_at: new Date().toISOString() })
    } catch (e) {
      setFout(e.message)
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="analyse-blok">
      <h2 style={{ marginTop: 0 }}>Analyse — {entiteitLabel(ent)}, {maandLabel(maand)}</h2>
      {bevindingen.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>Geen automatische bevindingen boven de drempels voor deze maand.</p>
      )}
      {bevindingen.map((b, i) => (
        <div className="bevinding" key={i}>
          <span className={`stip ${b.ernst}`} />
          <span>{b.tekst}</span>
        </div>
      ))}

      <div className="geen-print" style={{ marginTop: 14 }}>
        <button className="knop primair" onClick={genereer} disabled={bezig}>
          {bezig ? 'Bezig met genereren…' : 'Genereer analyse'}
        </button>
        {fout && <div className="fout-melding">{fout}</div>}
      </div>

      {analyse && (
        <div className="ai-analyse">
          <div className="meta">
            AI-analyse van {maandLabel(analyse.maand || maand)} · gegenereerd op{' '}
            {new Date(analyse.created_at).toLocaleString('nl-NL')}
          </div>
          {analyse.inhoud}
        </div>
      )}
    </div>
  )
}
