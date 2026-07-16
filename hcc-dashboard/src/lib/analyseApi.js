import { supabase, demoModus, supabaseUrl, supabaseAnonKey } from './supabase.js'
import { ALLE_ENTITEITEN, REGIOS } from './entities.js'
import { trendReeksen, kpiTegels, contextDocs } from './kpi.js'
import { brutalFacts } from './brutalFacts.js'
import { reviewVragen } from './reviewVragen.js'

// Totaalbudget voor contextteksten in de payload (tekens).
const MAX_CONTEXT_TOTAAL = 60000

// Bouw een compacte payload: geselecteerde maand volledig + 6 maanden trend
// + eventuele contextdocumenten van die maand.
export function bouwAnalysePayload(idx, maand) {
  const entiteiten = {}
  for (const ent of ALLE_ENTITEITEN) {
    const heeftData = idx.wenv[ent]?.[maand] || idx.prod[ent]?.[maand]
    if (!heeftData && ent !== 'HCC') continue
    entiteiten[ent] = {
      kpis: kpiTegels(idx, ent, maand).map(({ sparkline, ...t }) => t),
      trend6m: trendReeksen(idx, ent, maand).slice(-6),
      bevindingen: brutalFacts(idx, ent, maand).map((b) => b.tekst),
      conceptReviewvragen: REGIOS.includes(ent) ? reviewVragen(idx, ent, maand).map((v) => v.vraag) : undefined,
    }
  }

  let budget = MAX_CONTEXT_TOTAAL
  const context = []
  for (const doc of contextDocs(idx, maand)) {
    if (budget <= 0) break
    const tekst = doc.tekst.slice(0, budget)
    budget -= tekst.length
    context.push({ bestandsnaam: doc.bestandsnaam, soort: doc.soort, entiteit: doc.entiteit, tekst })
  }

  return {
    maand,
    // Het model leest deze instructie mee met de data; zo krijgt de analyse
    // een nette Markdown-structuur zonder dat de Edge Function hoeft te wijzigen.
    outputInstructie:
      'Structureer je antwoord in Markdown: begin met "## Conclusie", daarna per entiteit een kopje ' +
      '"## <naam>" met maximaal drie kernpunten als opsomming (kerncijfers **vet**). Sluit elke regio af met ' +
      '"### Reviewgesprek": drie tot vijf scherpe vragen die de Algemeen Directeur deze maand aan de ' +
      'regiodirecteur moet stellen. Bouw voort op de meegeleverde conceptReviewvragen: scherp ze aan met de ' +
      'trend en de contextdocumenten, schrap wat dubbel is en voeg toe wat ontbreekt. Vragen moeten cijfers ' +
      'bevatten en om een besluit of actie vragen, niet om uitleg alleen. Eindig met "## Aanbevelingen" als ' +
      'genummerde lijst. Betrek de contextdocumenten expliciet waar ze de cijfers verklaren of tegenspreken, ' +
      'met bronvermelding (bestandsnaam).',
    entiteiten,
    contextDocumenten: context,
  }
}

// Roept de Edge Function rechtstreeks aan zodat het antwoord gestreamd kan
// worden: de tekst komt woord voor woord binnen (onVoortgang) en de verbinding
// valt niet meer stil (voorkomt de idle timeout van 150 seconden bij lange
// analyses). Een oudere, niet-streamende functie (JSON-antwoord) werkt ook nog.
export async function genereerAnalyse(idx, maand, { onVoortgang } = {}) {
  if (demoModus) {
    throw new Error('AI-analyse is niet beschikbaar in demomodus (vereist de Supabase Edge Function).')
  }
  const payload = bouwAnalysePayload(idx, maand)

  const { data: sessieData } = await supabase.auth.getSession()
  const token = sessieData?.session?.access_token
  if (!token) throw new Error('Analyse mislukt: niet ingelogd. Log opnieuw in en probeer het nogmaals.')

  const res = await fetch(`${supabaseUrl}/functions/v1/analyse`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.text()
      try {
        detail = JSON.parse(body).error || body.slice(0, 300)
      } catch {
        detail = body.slice(0, 300)
      }
    } catch { /* body niet leesbaar */ }
    if (res.status === 401) {
      detail += " — controleer in Supabase of 'Verify JWT with legacy secret' UIT staat bij de functie-instellingen, en log opnieuw in."
    }
    throw new Error(`Analyse mislukt (status ${res.status}): ${detail}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    // Oudere functieversie zonder streaming.
    const data = await res.json()
    if (!data?.analyse) throw new Error('Analyse mislukt: leeg antwoord van de server.')
    return data.analyse
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let tekst = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    tekst += decoder.decode(value, { stream: true })
    onVoortgang?.(tekst)
  }
  tekst += decoder.decode()
  if (!tekst.trim()) throw new Error('Analyse mislukt: leeg antwoord van de server.')
  return tekst
}
