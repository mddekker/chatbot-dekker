import { useMemo, useState } from 'react'
import { ROLES, CONSULT_TYPES, QUESTIONS, MAX_QUESTIONS } from './lib/questions.js'
import { checkAnswer } from './lib/api.js'
import QuestionStep from './QuestionStep.jsx'
import ResultStep from './ResultStep.jsx'

function todayISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function formatDateNL(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

export default function App() {
  const [phase, setPhase] = useState('context') // context | questions | result
  const [role, setRole] = useState('')
  const [consultType, setConsultType] = useState('')
  const [datum, setDatum] = useState(todayISO())
  const [functie, setFunctie] = useState('')
  const [naam, setNaam] = useState('')

  const [queue, setQueue] = useState(QUESTIONS)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [checking, setChecking] = useState(false)

  const followUpBudget = MAX_QUESTIONS - QUESTIONS.length

  const generationInput = useMemo(() => {
    if (phase !== 'result') return null
    const vragen = []
    for (const q of queue) {
      const value = answers[q.id]
      if (q.id === 'toestemming') continue
      const text = answerToText(q, value)
      if (!text) continue
      if (q.isFollowUp) {
        const parent = vragen.find((v) => v.id === q.parentId)
        if (parent) {
          parent.antwoord += `\nAanvulling (${q.label}): ${text}`
          continue
        }
      }
      vragen.push({ id: q.id, vraag: q.label, antwoord: text })
    }
    return {
      role,
      consultType,
      answers: {
        datum: formatDateNL(datum),
        functie: functie.trim(),
        naam: naam.trim(),
        toestemming: answers.toestemming || 'nee',
        vragen: vragen.map(({ vraag, antwoord }) => ({ vraag, antwoord })),
      },
    }
  }, [phase, queue, answers, role, consultType, datum, functie, naam])

  function startQuestions() {
    setQueue(QUESTIONS)
    setIndex(0)
    setAnswers({})
    setPhase('questions')
  }

  async function submitAnswer(question, value) {
    const nextAnswers = { ...answers, [question.id]: value }
    setAnswers(nextAnswers)

    let nextQueue = queue
    const freeText = adaptiveText(question, value)
    const followUpsUsed = queue.length - QUESTIONS.length
    if (
      question.adaptiveCheck &&
      !question.isFollowUp &&
      freeText &&
      followUpsUsed < followUpBudget
    ) {
      setChecking(true)
      try {
        const result = await checkAnswer(question.label, freeText)
        if (result && result.concreet === false && result.vervolgvraag) {
          const followUp = {
            id: `${question.id}_vervolg`,
            parentId: question.id,
            label: result.vervolgvraag,
            hint: 'Vervolgvraag om de terugkoppeling concreter te maken.',
            type: 'textarea',
            required: false,
            adaptiveCheck: false,
            isFollowUp: true,
          }
          nextQueue = [...queue.slice(0, index + 1), followUp, ...queue.slice(index + 1)]
          setQueue(nextQueue)
        }
      } catch {
        // Als de check faalt, gewoon door naar de volgende vraag.
      } finally {
        setChecking(false)
      }
    }

    if (index + 1 < nextQueue.length) {
      setIndex(index + 1)
    } else {
      setPhase('result')
    }
  }

  function goBack() {
    if (index > 0) {
      setIndex(index - 1)
    } else {
      setPhase('context')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Terugkoppeltool spreekuur</h1>
            <p>HumanCapitalCare · terugkoppeling aan de leidinggevende</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        {phase === 'context' && (
          <section className="card">
            <h2>Rol en context</h2>
            <p className="intro">
              Beantwoord enkele vragen over het spreekuur. De tool stelt daarna een
              terugkoppeling op die functioneel, positief geframed en privacyproof is.
              Er wordt niets opgeslagen: alle gegevens verdwijnen bij het verversen van
              de pagina.
            </p>

            <label className="field-label">Jouw rol</label>
            <div className="chip-group" role="radiogroup" aria-label="Jouw rol">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`chip ${role === r.id ? 'chip-active' : ''}`}
                  onClick={() => setRole(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {role && role !== 'bedrijfsarts' && (
              <p className="note">
                Alleen de bedrijfsarts koppelt zelfstandig een oordeel over belastbaarheid
                terug. De tool voegt automatisch toe dat deze terugkoppeling plaatsvindt
                onder verantwoordelijkheid van en na afstemming met de bedrijfsarts.
              </p>
            )}

            <label className="field-label">Type spreekuur</label>
            <div className="chip-group" role="radiogroup" aria-label="Type spreekuur">
              {CONSULT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip ${consultType === t.id ? 'chip-active' : ''}`}
                  onClick={() => setConsultType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <label className="field-label" htmlFor="datum">Datum spreekuur</label>
            <input
              id="datum"
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />

            <label className="field-label" htmlFor="functie">
              Functie-aanduiding werknemer <span className="optional">(optioneel)</span>
            </label>
            <input
              id="functie"
              type="text"
              value={functie}
              placeholder="Bijvoorbeeld: administratief medewerker"
              onChange={(e) => setFunctie(e.target.value)}
            />

            <label className="field-label" htmlFor="naam">
              Aanduiding werknemer in de tekst <span className="optional">(optioneel)</span>
            </label>
            <input
              id="naam"
              type="text"
              value={naam}
              placeholder='Leeg = "de werknemer"'
              onChange={(e) => setNaam(e.target.value)}
            />
            <p className="note">
              Een naam is niet nodig en wordt alleen lokaal gebruikt in de gegenereerde tekst.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!role || !consultType || !datum}
              onClick={startQuestions}
            >
              Start de vragen
            </button>
          </section>
        )}

        {phase === 'questions' && (
          <QuestionStep
            key={queue[index].id}
            question={queue[index]}
            number={index + 1}
            total={queue.length}
            initialValue={answers[queue[index].id]}
            checking={checking}
            onSubmit={submitAnswer}
            onBack={goBack}
          />
        )}

        {phase === 'result' && generationInput && (
          <ResultStep
            input={generationInput}
            onRestart={() => {
              setPhase('context')
              setAnswers({})
              setQueue(QUESTIONS)
              setIndex(0)
            }}
          />
        )}
      </main>

      <footer className="app-footer">
        Controleer de tekst altijd zelf voordat je deze deelt.
      </footer>
    </div>
  )
}

function adaptiveText(question, value) {
  if (question.type === 'chips-text') return (value?.text || '').trim()
  if (typeof value === 'string') return value.trim()
  return ''
}

function answerToText(question, value) {
  if (value == null) return ''
  switch (question.type) {
    case 'chips-text': {
      const parts = []
      if (value.chips?.length) parts.push(value.chips.join(', '))
      if (value.text?.trim()) parts.push(value.text.trim())
      return parts.join('. ')
    }
    case 'expectation': {
      if (!value.keuze) return ''
      const termijn = value.weken?.trim()
        ? `, verwachte termijn: ${value.weken.trim()} weken`
        : ''
      return `${value.keuze}${termijn}`
    }
    default:
      return typeof value === 'string' ? value.trim() : ''
  }
}
