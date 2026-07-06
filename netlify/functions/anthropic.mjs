import Anthropic from '@anthropic-ai/sdk'

// De API-key komt uitsluitend uit de environment variable ANTHROPIC_API_KEY
// (in te stellen in de Netlify site settings). Nooit in de frontend.
let client
function getClient() {
  if (!client) client = new Anthropic()
  return client
}

const MODEL = 'claude-sonnet-4-6'

// Systeemprompt voor de generatie-call — letterlijk conform specificatie.
const GENERATION_SYSTEM_PROMPT =
  'Je schrijft een terugkoppeling van een spreekuur bij de arbodienst aan de leidinggevende van de werkgever. Harde regels: noem nooit een diagnose, ziektebeeld, behandeling, medicatie of medische term. Beschrijf uitsluitend belastbaarheid, functionele beperkingen en benutbare mogelijkheden. Start met wat de werknemer wél kan. Schrijf in begrijpelijk Nederlands voor iemand zonder medische achtergrond. Wees concreet: uren, taken, termijnen. Geef de leidinggevende een duidelijk handelingsperspectief. Toon: professioneel, warm, actief. Lengte: 150-250 woorden. Lever platte tekst zonder markdown-opmaak, zonder placeholders en zonder aanvullende toelichting: alleen de brieftekst zelf, direct te kopiëren in de terugkoppelingsbrief.'

const CHECK_ANSWER_SYSTEM_PROMPT = `Je beoordeelt of het antwoord van een arboprofessional op een vraag over een spreekuur concreet genoeg is om een terugkoppeling aan een leidinggevende op te stellen. Concreet betekent: bruikbare details zoals taken, uren, termijnen of duidelijke afspraken. Vaag betekent: nietszeggende antwoorden zoals "gaat wel", "redelijk" of "we zien het aan".

Antwoord uitsluitend met JSON in precies dit formaat, zonder verdere tekst:
{"concreet": true} of {"concreet": false, "vervolgvraag": "één korte, gerichte vervolgvraag in het Nederlands"}

Wees mild: een kort maar informatief antwoord is concreet. Stel alleen een vervolgvraag als het antwoord echt onbruikbaar vaag is. De vervolgvraag mag nooit naar medische informatie, diagnoses of privéomstandigheden vragen; alleen naar functionele, werkgerichte details.`

const PRIVACY_CHECK_SYSTEM_PROMPT = `Je controleert een terugkoppeling van de arbodienst aan een leidinggevende op privacyrisico's volgens de AVG, de beleidsregels "De zieke werknemer" van de Autoriteit Persoonsgegevens en de NVAB-richtlijnen.

Zoek naar:
1. Diagnoses en ziektebeelden, ook verhullend geformuleerd (zoals "burn-outklachten", "rugklachten", "stressklachten", "griep")
2. Medische termen, behandelingen, medicatie en zorgverleners (zoals "behandeling bij psycholoog", "fysiotherapie", "medicijnen")
3. Privéomstandigheden (zoals "thuissituatie", "scheiding", "mantelzorg", "financiële problemen")
4. Oordelen over de persoon (zoals "niet gemotiveerd", "klaagt veel", "moeilijke werknemer")

Antwoord uitsluitend met JSON in precies dit formaat, zonder verdere tekst:
{"risicos": [{"fragment": "letterlijk tekstfragment uit de terugkoppeling", "uitleg": "korte uitleg waarom dit niet mag", "alternatief": "functionele herformulering die het fragment kan vervangen"}]}

Het veld "fragment" moet letterlijk en exact zo in de tekst voorkomen. Het "alternatief" beschrijft uitsluitend belastbaarheid, functionele beperkingen of benutbare mogelijkheden en past grammaticaal op de plek van het fragment. Als er geen risico's zijn: {"risicos": []}`

function extractText(response) {
  const block = response.content.find((b) => b.type === 'text')
  return block ? block.text : ''
}

// Verwijder markdown-tekens en AI-toelichtingen die ondanks de prompt in de
// output terecht kunnen komen, zodat de tekst 1-op-1 plakbaar is.
export function sanitizeLetterText(text) {
  let out = text.trim()
  // AI-inleidingen zoals "Hier is de terugkoppeling:" op de eerste regel
  out = out.replace(/^(hier (is|volgt)|onderstaand|bij deze)[^\n]*:\s*\n+/i, '')
  out = out
    .split('\n')
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, '')
        .replace(/^\s*[-*•]\s+/, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/`([^`]+)`/g, '$1'),
    )
    .join('\n')
  return out.trim()
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

async function checkAnswer({ question, answer }) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 300,
    output_config: { effort: 'low' },
    system: CHECK_ANSWER_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Vraag aan de professional: ${question}\n\nAntwoord van de professional: ${answer}`,
      },
    ],
  })
  const parsed = parseJson(extractText(response))
  if (!parsed || typeof parsed.concreet !== 'boolean') {
    // Bij twijfel niet blokkeren: behandel het antwoord als concreet.
    return { concreet: true }
  }
  return parsed
}

async function generate({ answers, role, consultType, tone, includeSalutation }) {
  const roleInstruction =
    role === 'bedrijfsarts'
      ? 'De terugkoppeling is opgesteld door de bedrijfsarts, die zelfstandig over belastbaarheid mag terugkoppelen.'
      : role === 'arboverpleegkundige'
        ? 'De terugkoppeling is opgesteld door een arboverpleegkundige. Vermeld in de tekst expliciet dat deze terugkoppeling plaatsvindt onder verantwoordelijkheid van en na afstemming met de bedrijfsarts. Formuleer uitspraken over belastbaarheid nooit als zelfstandig oordeel van de arboverpleegkundige.'
        : 'De terugkoppeling is opgesteld door een praktijkondersteuner bedrijfsarts (POB). Vermeld in de tekst expliciet dat deze terugkoppeling plaatsvindt onder verantwoordelijkheid van en na afstemming met de bedrijfsarts. Formuleer uitspraken over belastbaarheid nooit als zelfstandig oordeel van de POB.'

  const toneInstruction =
    tone === 'neutraler'
      ? 'Schrijf de tekst in een neutrale, feitelijke toon.'
      : tone === 'warmer'
        ? 'Schrijf de tekst in een warme, betrokken toon, maar blijf professioneel.'
        : tone === 'zakelijker'
          ? 'Schrijf de tekst in een zakelijke, bondige toon.'
          : ''

  const salutationInstruction = includeSalutation
    ? 'Begin de tekst met de aanhef "Geachte heer, mevrouw," op een eigen regel en sluit af met "Met vriendelijke groet," op een eigen regel als laatste regel. Gebruik geen namen of placeholders in aanhef of afsluiting.'
    : 'Schrijf alleen de inhoud van de brief, zonder aanhef, adressering, afsluiting of ondertekening; die staan al in het brieftemplate van de arbodienst.'

  const structure = `Gebruik deze vaste structuur met korte kopjes in gewone tekst (geen opsommingstekens, geen markdown), elk kopje op een eigen regel gevolgd door een korte alinea:
Aanleiding en datum spreekuur
Benutbare mogelijkheden
Belastbaarheid en functionele beperkingen
Verwachting en tijdspad
Advies aan leidinggevende
Afspraken en vervolg`

  const lines = []
  lines.push(`Type spreekuur: ${consultType}`)
  if (answers.datum) lines.push(`Datum spreekuur: ${answers.datum}`)
  if (answers.functie) lines.push(`Functie van de werknemer: ${answers.functie}`)
  if (answers.naam) lines.push(`Aanduiding van de werknemer in de tekst: ${answers.naam}`)
  for (const item of answers.vragen || []) {
    lines.push(`${item.vraag}\n${item.antwoord}`)
  }
  lines.push(
    answers.toestemming === 'ja'
      ? 'De werknemer heeft toestemming gegeven om de eventueel hierboven genoemde aanvullende informatie te delen, mits functioneel geformuleerd.'
      : 'De werknemer heeft géén toestemming gegeven voor het delen van aanvullende informatie: houd alles strikt functioneel.',
  )

  const userMessage = `${roleInstruction}\n\n${salutationInstruction}\n\n${structure}\n\n${toneInstruction}\n\nGegevens uit het spreekuur (alleen ingevulde onderdelen; wat ontbreekt laat je weg uit de tekst, zonder placeholders of open zinnen):\n\n${lines.join('\n\n')}`

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })
  return { text: sanitizeLetterText(extractText(response)) }
}

async function privacyCheck({ text }) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: PRIVACY_CHECK_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })
  const parsed = parseJson(extractText(response))
  if (!parsed || !Array.isArray(parsed.risicos)) {
    return { risicos: [] }
  }
  // Alleen risico's waarvan het fragment echt in de tekst staat zijn bruikbaar
  // voor één-klik-vervangen.
  return { risicos: parsed.risicos.filter((r) => r && r.fragment && text.includes(r.fragment)) }
}

export default async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY ontbreekt in de server-omgeving.' },
      { status: 500 },
    )
  }

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Ongeldige JSON.' }, { status: 400 })
  }

  try {
    switch (body.task) {
      case 'check_answer':
        return Response.json(await checkAnswer(body))
      case 'generate':
        return Response.json(await generate(body))
      case 'privacy_check':
        return Response.json(await privacyCheck(body))
      default:
        return Response.json({ error: 'Onbekende taak.' }, { status: 400 })
    }
  } catch (err) {
    console.error('Anthropic API error:', err)
    const status = err?.status >= 400 && err?.status < 600 ? 502 : 500
    return Response.json(
      { error: 'De AI-dienst is tijdelijk niet bereikbaar. Probeer het opnieuw.' },
      { status },
    )
  }
}
