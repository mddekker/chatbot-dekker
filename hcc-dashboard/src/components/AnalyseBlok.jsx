import { useEffect, useState } from 'react'
import { brutalFacts } from '../lib/brutalFacts.js'
import { reviewVragen } from '../lib/reviewVragen.js'
import { genereerAnalyse } from '../lib/analyseApi.js'
import { haalAnalyseOp, bewaarAnalyse } from '../lib/store.js'
import { maandLabel, entiteitLabel, REGIOS } from '../lib/entities.js'
import { contextDocs } from '../lib/kpi.js'
import Markdown from '../lib/markdown.jsx'

export default function AnalyseBlok({ idx, ent, maand }) {
  const bevindingen = brutalFacts(idx, ent, maand)
  const context = contextDocs(idx, maand)
  const vragen = REGIOS.includes(ent) ? reviewVragen(idx, ent, maand) : []
  const [analyse, setAnalyse] = useState(null)
  const [bezig, setBezig] = useState(false)
  const [liveTekst, setLiveTekst] = useState(null) // analyse die nu geschreven wordt
  const [fout, setFout] = useState(null)

  useEffect(() => {
    setAnalyse(null)
    setFout(null)
    haalAnalyseOp(maand).then(setAnalyse).catch(() => {})
  }, [maand])

  async function genereer() {
    setBezig(true)
    setFout(null)
    setLiveTekst('')
    try {
      const tekst = await genereerAnalyse(idx, maand, { onVoortgang: setLiveTekst })
      await bewaarAnalyse(maand, tekst)
      setAnalyse({ maand, inhoud: tekst, created_at: new Date().toISOString() })
    } catch (e) {
      setFout(e.message)
    } finally {
      setBezig(false)
      setLiveTekst(null)
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

      {vragen.length > 0 && (
        <div className="review-blok">
          <h3>Reviewgesprek {entiteitLabel(ent)} — stel deze vragen</h3>
          <ol>
            {vragen.map((v, i) => (
              <li key={i}>
                <span className="review-thema">{v.thema}</span>
                {v.vraag}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="geen-print" style={{ marginTop: 14 }}>
        <button className="knop primair" onClick={genereer} disabled={bezig}>
          {bezig ? 'Bezig met schrijven…' : 'Genereer analyse'}
        </button>
        {context.length > 0 && (
          <span className="context-hint">
            {context.length} contextdocument{context.length === 1 ? '' : 'en'} gaat mee in de analyse
          </span>
        )}
        {context.length === 0 && (
          <span className="context-hint">
            Tip: upload rapportages (Word/PowerPoint/Excel) bij Upload voor een scherpere analyse
          </span>
        )}
        {fout && <div className="fout-melding">{fout}</div>}
      </div>

      {liveTekst !== null && (
        <div className="ai-analyse">
          <div className="meta">AI-analyse van {maandLabel(maand)} · wordt nu geschreven…</div>
          {liveTekst ? <Markdown tekst={liveTekst} /> : <p style={{ color: 'var(--muted)' }}>Verbinden met het model…</p>}
        </div>
      )}
      {liveTekst === null && analyse && (
        <div className="ai-analyse">
          <div className="meta">
            AI-analyse van {maandLabel(analyse.maand || maand)} · gegenereerd op{' '}
            {new Date(analyse.created_at).toLocaleString('nl-NL')}
          </div>
          <Markdown tekst={analyse.inhoud} />
        </div>
      )}
    </div>
  )
}
