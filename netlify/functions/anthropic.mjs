import Anthropic from '@anthropic-ai/sdk'

// De API-key komt uitsluitend uit de environment variable ANTHROPIC_API_KEY
// (in te stellen in de Netlify site settings). Nooit in de frontend.
let client
function getClient() {
  if (!client) client = new Anthropic()
  return client
}

const MODEL = 'claude-sonnet-4-6'

// Optionele toegangsbeveiliging: zet SITE_PASSWORD als environment variable in
// Netlify om de app achter een gedeeld wachtwoord te zetten. Niet gezet = open.
function passwordOk(body) {
  const sitePassword = process.env.SITE_PASSWORD || ''
  if (!sitePassword) return true
  return typeof body.password === 'string' && body.password === sitePassword
}

// Systeemprompt voor de generatie-call — letterlijk conform specificatie.
const GENERATION_SYSTEM_PROMPT =
  'Je schrijft een terugkoppeling van een spreekuur bij de arbodienst aan de leidinggevende van de werkgever. Harde regels: noem nooit een diagnose, ziektebeeld, behandeling, medicatie of medische term. Beschrijf uitsluitend belastbaarheid, functionele beperkingen en benutbare mogelijkheden. Start met wat de werknemer wél kan. Schrijf in begrijpelijk Nederlands voor iemand zonder medische achtergrond. Wees concreet: uren, taken, termijnen. Geef de leidinggevende een duidelijk handelingsperspectief. Toon: professioneel, warm, actief. Lengte: 150-250 woorden. Lever platte tekst zonder markdown-opmaak, zonder placeholders en zonder aanvullende toelichting: alleen de brieftekst zelf, direct te kopiëren in de terugkoppelingsbrief.'

// Engelse spiegel van de systeemprompt, voor terugkoppelingen in het Engels.
// De antwoorden van de professional zijn Nederlands; de vertaling moet zeer
// secuur zijn, met correcte Engelse arbo-terminologie.
const GENERATION_SYSTEM_PROMPT_EN =
  'You are writing the feedback report of an occupational health consultation, addressed to the employee’s manager at the employer, on behalf of a Dutch occupational health service. Hard rules: never mention a diagnosis, illness, treatment, medication or any medical term. Describe only work capacity, functional limitations and what the employee is able to do. Start with what the employee CAN do. Write in clear, natural, professional English for a manager without a medical background. Be specific: hours, tasks, timeframes. Give the manager a clear course of action. Tone: professional, warm, active. Length: 150-250 words. The consultation data you receive is in Dutch: translate its content faithfully and precisely, without adding or omitting information. Use correct occupational health terminology: bedrijfsarts = occupational physician, arboverpleegkundige = occupational health nurse, praktijkondersteuner bedrijfsarts (POB) = occupational physician’s assistant, belastbaarheid = work capacity, benutbare mogelijkheden = what the employee can currently do. Deliver plain text without markdown formatting, without placeholders and without any additional commentary: only the letter text itself, ready to paste into the feedback letter.'

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

De terugkoppeling kan in het Nederlands of in het Engels zijn geschreven; controleer op dezelfde risico's ongeacht de taal (denk in het Engels aan termen als "burnout", "back problems", "treatment by a psychologist", "situation at home").

Antwoord uitsluitend met JSON in precies dit formaat, zonder verdere tekst:
{"risicos": [{"fragment": "letterlijk tekstfragment uit de terugkoppeling", "uitleg": "korte uitleg waarom dit niet mag", "alternatief": "functionele herformulering die het fragment kan vervangen"}]}

Het veld "fragment" moet letterlijk en exact zo in de tekst voorkomen. De "uitleg" is altijd in het Nederlands (voor de professional). Het "alternatief" is in dezelfde taal als de gecontroleerde tekst, beschrijft uitsluitend belastbaarheid, functionele beperkingen of benutbare mogelijkheden en past grammaticaal op de plek van het fragment. Als er geen risico's zijn: {"risicos": []}`

function extractText(response) {
  const block = response.content.find((b) => b.type === 'text')
  return block ? block.text : ''
}

// Verwijder markdown-tekens en AI-toelichtingen die ondanks de prompt in de
// output terecht kunnen komen, zodat de tekst 1-op-1 plakbaar is.
export function sanitizeLetterText(text) {
  let out = text.trim()
  // AI-inleidingen zoals "Hier is de terugkoppeling:" of "Here is the letter:"
  out = out.replace(/^(hier (is|volgt)|onderstaand|bij deze|here (is|follows)|below is)[^\n]*:\s*\n+/i, '')
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

async function generate({ answers, role, consultType, tone, includeSalutation, language }) {
  const en = language === 'en'

  const roleInstruction = en
    ? role === 'bedrijfsarts'
      ? 'The report is written by the occupational physician, who may independently report on work capacity.'
      : role === 'arboverpleegkundige'
        ? 'The report is written by an occupational health nurse. State explicitly in the text that this feedback is provided under the responsibility of, and in consultation with, the occupational physician. Never phrase statements about work capacity as the nurse’s independent judgement.'
        : 'The report is written by an occupational physician’s assistant (POB). State explicitly in the text that this feedback is provided under the responsibility of, and in consultation with, the occupational physician. Never phrase statements about work capacity as the assistant’s independent judgement.'
    : role === 'bedrijfsarts'
      ? 'De terugkoppeling is opgesteld door de bedrijfsarts, die zelfstandig over belastbaarheid mag terugkoppelen.'
      : role === 'arboverpleegkundige'
        ? 'De terugkoppeling is opgesteld door een arboverpleegkundige. Vermeld in de tekst expliciet dat deze terugkoppeling plaatsvindt onder verantwoordelijkheid van en na afstemming met de bedrijfsarts. Formuleer uitspraken over belastbaarheid nooit als zelfstandig oordeel van de arboverpleegkundige.'
        : 'De terugkoppeling is opgesteld door een praktijkondersteuner bedrijfsarts (POB). Vermeld in de tekst expliciet dat deze terugkoppeling plaatsvindt onder verantwoordelijkheid van en na afstemming met de bedrijfsarts. Formuleer uitspraken over belastbaarheid nooit als zelfstandig oordeel van de POB.'

  const toneInstruction = en
    ? tone === 'neutraler'
      ? 'Write the text in a neutral, factual tone.'
      : tone === 'warmer'
        ? 'Write the text in a warm, engaged tone, while remaining professional.'
        : tone === 'zakelijker'
          ? 'Write the text in a businesslike, concise tone.'
          : ''
    : tone === 'neutraler'
      ? 'Schrijf de tekst in een neutrale, feitelijke toon.'
      : tone === 'warmer'
        ? 'Schrijf de tekst in een warme, betrokken toon, maar blijf professioneel.'
        : tone === 'zakelijker'
          ? 'Schrijf de tekst in een zakelijke, bondige toon.'
          : ''

  const salutationInstruction = en
    ? includeSalutation
      ? 'Start the text with the salutation "Dear Sir or Madam," on its own line and end with "Kind regards," on its own line as the very last line. Do not use names or placeholders in the salutation or closing.'
      : 'Write only the body of the letter, without salutation, address block, closing or signature; those are part of the occupational health service’s letter template.'
    : includeSalutation
      ? 'Begin de tekst met de aanhef "Geachte heer, mevrouw," op een eigen regel en sluit af met "Met vriendelijke groet," op een eigen regel als laatste regel. Gebruik geen namen of placeholders in aanhef of afsluiting.'
      : 'Schrijf alleen de inhoud van de brief, zonder aanhef, adressering, afsluiting of ondertekening; die staan al in het brieftemplate van de arbodienst.'

  const structure = en
    ? `Use this fixed structure with short plain-text headings (no bullet points, no markdown), each heading on its own line followed by a short paragraph:
Reason for and date of the consultation
What the employee can currently do
Work capacity and functional limitations
Outlook and timeline
Advice to the manager
Agreements and follow-up`
    : `Gebruik deze vaste structuur met korte kopjes in gewone tekst (geen opsommingstekens, geen markdown), elk kopje op een eigen regel gevolgd door een korte alinea:
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

  // Aan het einde van de opdracht, dwingend geformuleerd: daar weegt het het
  // zwaarst voor het model. De harde privacyregels blijven altijd voorgaan.
  const aandachtspuntenInstruction = answers.aandachtspunten
    ? en
      ? `\n\nIMPORTANT INSTRUCTIONS FROM THE PROFESSIONAL FOR THIS LETTER (written in Dutch)\nFollow these instructions precisely: actually include points that must be mentioned, leave out what must be left out, and adjust tone or emphasis as requested. Only if an instruction conflicts with the hard rules (no diagnoses, medical terms or private information) do those rules prevail.\n\nInstructions: ${answers.aandachtspunten}`
      : `\n\nBELANGRIJKE AANWIJZINGEN VAN DE PROFESSIONAL VOOR DEZE BRIEF\nDe professional heeft de volgende aanwijzingen meegegeven. Volg ze nauwkeurig op: neem punten die genoemd moeten worden daadwerkelijk op in de brief, laat weg wat weggelaten moet worden, en pas toon of accent aan zoals gevraagd. Alleen als een aanwijzing strijdig is met de harde regels (geen diagnoses, medische termen of privé-informatie) gaan die regels voor.\n\nAanwijzingen: ${answers.aandachtspunten}`
    : ''

  const dataIntro = en
    ? 'Consultation data, in Dutch (only the completed items; leave out anything missing, without placeholders or unfinished sentences — translate the content faithfully and precisely into natural, professional English):'
    : 'Gegevens uit het spreekuur (alleen ingevulde onderdelen; wat ontbreekt laat je weg uit de tekst, zonder placeholders of open zinnen):'

  const userMessage = `${roleInstruction}\n\n${salutationInstruction}\n\n${structure}\n\n${toneInstruction}\n\n${dataIntro}\n\n${lines.join('\n\n')}${aandachtspuntenInstruction}`

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: en ? GENERATION_SYSTEM_PROMPT_EN : GENERATION_SYSTEM_PROMPT,
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

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Ongeldige JSON.' }, { status: 400 })
  }

  // Wachtwoordcontrole vóór alles: verify_password meldt alleen of het klopt,
  // alle andere taken worden geweigerd zonder juist wachtwoord.
  if (body.task === 'verify_password') {
    return Response.json({ ok: passwordOk(body) })
  }
  if (!passwordOk(body)) {
    return Response.json(
      { error: 'Onjuist of ontbrekend wachtwoord. Ververs de pagina en log opnieuw in.' },
      { status: 401 },
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY ontbreekt in de server-omgeving.' },
      { status: 500 },
    )
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
