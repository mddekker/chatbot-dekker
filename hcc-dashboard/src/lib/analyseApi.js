import { supabase, demoModus } from './supabase.js'
import { ALLE_ENTITEITEN } from './entities.js'
import { trendReeksen, kpiTegels } from './kpi.js'
import { brutalFacts } from './brutalFacts.js'

// Bouw een compacte payload: geselecteerde maand volledig + 6 maanden trend.
export function bouwAnalysePayload(idx, maand) {
  const entiteiten = {}
  for (const ent of ALLE_ENTITEITEN) {
    const heeftData = idx.wenv[ent]?.[maand] || idx.prod[ent]?.[maand]
    if (!heeftData && ent !== 'HCC') continue
    entiteiten[ent] = {
      kpis: kpiTegels(idx, ent, maand).map(({ sparkline, ...t }) => t),
      trend6m: trendReeksen(idx, ent, maand).slice(-6),
      bevindingen: brutalFacts(idx, ent, maand).map((b) => b.tekst),
    }
  }
  return { maand, entiteiten }
}

export async function genereerAnalyse(idx, maand) {
  if (demoModus) {
    throw new Error('AI-analyse is niet beschikbaar in demomodus (vereist de Supabase Edge Function).')
  }
  const payload = bouwAnalysePayload(idx, maand)
  const { data, error } = await supabase.functions.invoke('analyse', {
    body: payload,
  })
  if (error) {
    let detail = error.message
    try {
      const ctx = await error.context?.json()
      if (ctx?.error) detail = ctx.error
    } catch { /* geen JSON-body */ }
    throw new Error(`Analyse mislukt: ${detail}`)
  }
  if (!data?.analyse) throw new Error('Analyse mislukt: leeg antwoord van de server.')
  return data.analyse
}
