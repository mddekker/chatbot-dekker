import { useState } from 'react'

export default function QuestionStep({
  question,
  number,
  total,
  initialValue,
  checking,
  onSubmit,
  onBack,
}) {
  const [text, setText] = useState(
    typeof initialValue === 'string' ? initialValue : initialValue?.text || '',
  )
  const [chips, setChips] = useState(initialValue?.chips || [])
  const [keuze, setKeuze] = useState(initialValue?.keuze || '')
  const [weken, setWeken] = useState(initialValue?.weken || '')
  const [consent, setConsent] = useState(
    typeof initialValue === 'string' && initialValue ? initialValue : 'nee',
  )

  function toggleChip(chip) {
    setChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
    )
  }

  function currentValue() {
    switch (question.type) {
      case 'chips-text':
        return { chips, text }
      case 'expectation':
        return { keuze, weken }
      case 'consent':
        return consent
      default:
        return text
    }
  }

  function isEmpty() {
    switch (question.type) {
      case 'chips-text':
        return chips.length === 0 && text.trim().length === 0
      case 'expectation':
        return !keuze
      case 'consent':
        return !consent
      default:
        return text.trim().length === 0
    }
  }

  function isValid() {
    if (!question.required) return true
    switch (question.type) {
      case 'chips-text':
        return chips.length > 0 || text.trim().length > 0
      case 'expectation':
        return Boolean(keuze)
      case 'consent':
        return Boolean(consent)
      default:
        return text.trim().length > 0
    }
  }

  const progress = Math.round((number / total) * 100)

  return (
    <section className="card">
      <div className="progress-row" aria-hidden="true">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-label">
          Vraag {number} van {total}
        </span>
      </div>

      <h2 className={question.isFollowUp ? 'followup-title' : ''}>
        {question.isFollowUp && <span className="followup-tag">Vervolgvraag</span>}
        {question.label}
      </h2>
      {question.hint && <p className="hint">{question.hint}</p>}

      {question.type === 'chips-text' && (
        <div className="chip-group">
          {question.chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`chip ${chips.includes(chip) ? 'chip-active' : ''}`}
              onClick={() => toggleChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {question.type === 'expectation' && (
        <>
          <div className="chip-group" role="radiogroup" aria-label={question.label}>
            {question.options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`chip ${keuze === opt ? 'chip-active' : ''}`}
                onClick={() => setKeuze(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="weken">
            Termijn in weken <span className="optional">(optioneel)</span>
          </label>
          <input
            id="weken"
            type="number"
            min="1"
            max="104"
            inputMode="numeric"
            value={weken}
            placeholder="Bijvoorbeeld: 6"
            onChange={(e) => setWeken(e.target.value)}
          />
        </>
      )}

      {question.type === 'consent' && (
        <div className="chip-group" role="radiogroup" aria-label={question.label}>
          {['nee', 'ja'].map((opt) => (
            <button
              key={opt}
              type="button"
              className={`chip ${consent === opt ? 'chip-active' : ''}`}
              onClick={() => setConsent(opt)}
            >
              {opt === 'ja' ? 'Ja, toestemming gegeven' : 'Nee (standaard)'}
            </button>
          ))}
        </div>
      )}

      {(question.type === 'text' ||
        question.type === 'textarea' ||
        question.type === 'chips-text') && (
        <>
          {question.suggestions && (
            <div className="chip-group">
              {question.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip chip-suggestion"
                  onClick={() =>
                    setText((prev) => (prev.trim() ? `${prev.trim()}. ${s}` : s))
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {question.type === 'text' ? (
            <input
              type="text"
              value={text}
              autoFocus
              onChange={(e) => setText(e.target.value)}
            />
          ) : (
            <textarea
              rows={4}
              value={text}
              autoFocus={question.type === 'textarea' && !question.chips}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </>
      )}

      <div className="button-row">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={checking}>
          Terug
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!isValid() || checking}
          onClick={() => onSubmit(question, currentValue())}
        >
          {checking ? 'Even controleren…' : !question.required && isEmpty() ? 'Overslaan' : 'Volgende'}
        </button>
      </div>
    </section>
  )
}
