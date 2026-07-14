import { useEffect, useRef, useState } from 'react'
import { generateFeedback, privacyCheck } from './lib/api.js'

const TONES = [
  { id: 'neutraler', label: 'Neutraler' },
  { id: 'warmer', label: 'Warmer' },
  { id: 'zakelijker', label: 'Zakelijker' },
]

export default function ResultStep({ input, onRestart }) {
  const [text, setText] = useState('')
  const [findings, setFindings] = useState([])
  const [handled, setHandled] = useState({}) // index -> 'accepted' | 'dismissed'
  const [loading, setLoading] = useState('generate') // 'generate' | 'privacy' | ''
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [includeSalutation, setIncludeSalutation] = useState(false)
  const [language, setLanguage] = useState(input.language || 'nl')
  const started = useRef(false)

  async function runPrivacyCheck(letterText) {
    setLoading('privacy')
    setError('')
    try {
      const result = await privacyCheck(letterText)
      setFindings(result.risicos || [])
      setHandled({})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading('')
    }
  }

  async function runGenerate(tone, salutation = includeSalutation, lang = language) {
    setLoading('generate')
    setError('')
    setFindings([])
    setHandled({})
    try {
      const result = await generateFeedback({
        ...input,
        tone,
        includeSalutation: salutation,
        language: lang,
      })
      setText(result.text)
      await runPrivacyCheck(result.text)
    } catch (err) {
      setError(err.message)
      setLoading('')
    }
  }

  useEffect(() => {
    if (!started.current) {
      started.current = true
      runGenerate('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function acceptFinding(i) {
    const f = findings[i]
    if (!f || !text.includes(f.fragment)) {
      setHandled((prev) => ({ ...prev, [i]: 'dismissed' }))
      return
    }
    setText((prev) => prev.replace(f.fragment, f.alternatief))
    setHandled((prev) => ({ ...prev, [i]: 'accepted' }))
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Kopiëren lukte niet. Selecteer de tekst en kopieer handmatig.')
    }
  }

  const openFindings = findings.filter((_, i) => !handled[i])

  if (loading === 'generate') {
    return (
      <section className="card card-center">
        <div className="spinner" aria-hidden="true" />
        <h2>Terugkoppeling opstellen…</h2>
        <p className="hint">
          De tekst wordt geschreven op basis van jouw antwoorden: functioneel, positief
          geframed en zonder medische informatie.
        </p>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>Terugkoppeling aan de leidinggevende</h2>
      <p className="hint">
        Bewerk de tekst waar nodig en kopieer deze in de terugkoppelingsbrief.
      </p>

      {error && <p className="error">{error}</p>}

      <textarea
        className="result-text"
        rows={16}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Gegenereerde terugkoppeling"
      />
      <p className="word-count">{text.trim() ? text.trim().split(/\s+/).length : 0} woorden</p>

      <div className="privacy-panel">
        <h3>
          Privacycheck{' '}
          {loading === 'privacy' && <span className="checking-inline">bezig…</span>}
        </h3>
        {loading !== 'privacy' && openFindings.length === 0 && (
          <p className="privacy-ok">
            Geen diagnoses, medische termen, privé-informatie of persoonsoordelen gevonden.
          </p>
        )}
        {findings.map((f, i) =>
          handled[i] ? null : (
            <div className="finding" key={`${f.fragment}-${i}`}>
              <p className="finding-fragment">“{f.fragment}”</p>
              <p className="finding-uitleg">{f.uitleg}</p>
              <p className="finding-alt">
                Voorstel: <strong>{f.alternatief}</strong>
              </p>
              <div className="button-row">
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setHandled((prev) => ({ ...prev, [i]: 'dismissed' }))}
                >
                  Behouden
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={() => acceptFinding(i)}
                >
                  Herformulering overnemen
                </button>
              </div>
            </div>
          ),
        )}
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={loading !== '' || !text.trim()}
          onClick={() => runPrivacyCheck(text)}
        >
          Opnieuw controleren
        </button>
      </div>

      <div className="actions">
        <button type="button" className="btn btn-primary btn-block" onClick={copy} disabled={!text.trim()}>
          {copied ? 'Gekopieerd ✓' : 'Kopieer de tekst'}
        </button>

        <div className="tone-row">
          <span className="field-label">Taal van de brief:</span>
          <div className="chip-group">
            {[
              { id: 'nl', label: 'Nederlands' },
              { id: 'en', label: 'Engels' },
            ].map((l) => (
              <button
                key={l.id}
                type="button"
                className={`chip ${language === l.id ? 'chip-active' : ''}`}
                disabled={loading !== '' || language === l.id}
                onClick={() => {
                  setLanguage(l.id)
                  runGenerate('', includeSalutation, l.id)
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tone-row">
          <span className="field-label">Opnieuw genereren met andere toon:</span>
          <div className="chip-group">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="chip"
                disabled={loading !== ''}
                onClick={() => runGenerate(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={includeSalutation}
            disabled={loading !== ''}
            onChange={(e) => {
              setIncludeSalutation(e.target.checked)
              runGenerate('', e.target.checked)
            }}
          />
          <span>
            Aanhef en afsluiting toevoegen (voor wie geen brieftemplate gebruikt)
          </span>
        </label>

        <button type="button" className="btn btn-ghost btn-block" onClick={onRestart}>
          Nieuwe terugkoppeling starten
        </button>
      </div>

      <p className="disclaimer">
        De professional blijft eindverantwoordelijk. Controleer de tekst altijd zelf
        voordat je deze deelt.
      </p>
    </section>
  )
}
