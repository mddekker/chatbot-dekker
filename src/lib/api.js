const ENDPOINT = '/.netlify/functions/anthropic'

async function call(payload) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || 'Er ging iets mis. Probeer het opnieuw.')
  }
  return data
}

export function checkAnswer(question, answer) {
  return call({ task: 'check_answer', question, answer })
}

export function generateFeedback({ answers, role, consultType, tone, includeSalutation }) {
  return call({ task: 'generate', answers, role, consultType, tone, includeSalutation })
}

export function privacyCheck(text) {
  return call({ task: 'privacy_check', text })
}
