const ENDPOINT = '/.netlify/functions/anthropic'
const PW_STORAGE_KEY = 'tk_toegang'

let password = sessionStorage.getItem(PW_STORAGE_KEY) || ''

async function call(payload) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, password }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || 'Er ging iets mis. Probeer het opnieuw.')
  }
  return data
}

// Controleert het wachtwoord server-side. Bij een site zonder ingesteld
// wachtwoord (SITE_PASSWORD niet gezet) geeft de server altijd ok terug.
export async function verifyPassword(candidate) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'verify_password', password: candidate }),
  })
  const data = await res.json().catch(() => null)
  const ok = Boolean(data?.ok)
  if (ok) {
    password = candidate
    sessionStorage.setItem(PW_STORAGE_KEY, candidate)
  }
  return ok
}

export function storedPassword() {
  return sessionStorage.getItem(PW_STORAGE_KEY) || ''
}

export function checkAnswer(question, answer) {
  return call({ task: 'check_answer', question, answer })
}

export function generateFeedback({ answers, role, consultType, tone, includeSalutation, language }) {
  return call({ task: 'generate', answers, role, consultType, tone, includeSalutation, language })
}

export function privacyCheck(text, language) {
  return call({ task: 'privacy_check', text, language })
}
