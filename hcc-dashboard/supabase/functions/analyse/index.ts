// Supabase Edge Function: proxy naar de Anthropic API voor de maandanalyse.
// De Anthropic API-key staat uitsluitend hier (als secret), nooit in de client.
// Deploy: supabase functions deploy analyse
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SYSTEEM_INSTRUCTIE =
  'Je bent financieel analist voor de Algemeen Directeur van HumanCapitalCare. ' +
  'Analyseer de maandcijfers per regio en voor HCC totaal. Wees eerlijk en scherp: face the brutal facts. ' +
  'Conclusie eerst, daarna maximaal drie kernpunten per entiteit, daarna concrete aanbevelingen gericht op sturing ' +
  '(wat moet de regiodirecteur of directie deze maand anders doen). ' +
  'Onderscheid incidenten van structurele patronen op basis van de trenddata. ' +
  "Corrigeer regiovergelijkingen voor interne verrekening (IKV) voordat je regio's als goed of slecht bestempelt. " +
  'Markeer aannames expliciet als [Afleiding] en meld het als data ontbreekt in plaats van gaten op te vullen. ' +
  'Geen jargon, geen wolligheid, Nederlands, geen em dashes. ' +
  'Als er contextdocumenten zijn meegeleverd (rapportages in tekstvorm): gebruik ze om de cijfers te verklaren ' +
  'of te ontkrachten en verwijs dan naar de bestandsnaam. ' +
  'Structureer je antwoord in Markdown: begin met "## Conclusie", daarna per entiteit "## <naam>" met maximaal ' +
  'drie kernpunten als opsomming (kerncijfers vet), sluit af met "## Aanbevelingen" als genummerde lijst.'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function antwoord(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return antwoord({ error: 'Alleen POST' }, 405)

  // Alleen ingelogde gebruikers mogen analyses genereren.
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData?.user) {
    return antwoord({ error: 'Niet ingelogd' }, 401)
  }

  // In een gedeeld Supabase-project: beperk de functie tot het dashboard-account.
  // Zet hiervoor het secret DASHBOARD_EMAIL (supabase secrets set DASHBOARD_EMAIL=...).
  const toegestaanEmail = Deno.env.get('DASHBOARD_EMAIL')
  if (toegestaanEmail && userData.user.email?.toLowerCase() !== toegestaanEmail.toLowerCase()) {
    return antwoord({ error: 'Geen toegang met dit account' }, 403)
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return antwoord({ error: 'ANTHROPIC_API_KEY is niet gezet als secret' }, 500)

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return antwoord({ error: 'Ongeldige JSON' }, 400)
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEEM_INSTRUCTIE,
      messages: [
        {
          role: 'user',
          content:
            'Hieronder de maandcijfers (bedragen in euro, percentages als fractie) inclusief 6 maanden trend ' +
            'en de al gesignaleerde regelgebaseerde bevindingen. Schrijf de analyse.\n\n' +
            JSON.stringify(payload),
        },
      ],
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    return antwoord({ error: `Anthropic API-fout (${res.status}): ${detail.slice(0, 500)}` }, 502)
  }

  const data = await res.json()
  const tekst = (data.content ?? [])
    .filter((blok: { type: string }) => blok.type === 'text')
    .map((blok: { text: string }) => blok.text)
    .join('\n')

  return antwoord({ analyse: tekst })
})
