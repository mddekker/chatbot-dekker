# HCC Maandcijfers Dashboard

Webapplicatie voor de Algemeen Directeur van HumanCapitalCare: upload elke maand de W&V-rekening en de zeven regionale productiviteitsbestanden en krijg direct een dashboard met KPI's, trends, een regiovergelijking en een scherpe analyse (regelgebaseerd + AI). Toon van de analyse: face the brutal facts.

## Techniek

- React + Vite, single page, Nederlands, responsive (ook iPad) met print/PDF-export.
- Supabase: e-mail + wachtwoord-login (één gebruiker, signups uit) en opslag van maandsnapshots (Postgres/JSONB, Row Level Security).
- Excel-parsing client-side met SheetJS; de ruwe bestanden worden nooit opgeslagen, alleen geparste regiototalen. De sheet `Personeel` (persoonsgegevens) wordt nooit gelezen.
- AI-analyse via een Supabase Edge Function als proxy naar de Anthropic API (model `claude-sonnet-4-6`); de API-key staat uitsluitend server-side.
- Grafieken met Recharts.

## Snel starten

```bash
npm install
npm run dev        # vereist .env met Supabase-gegevens, zie SETUP.md
npm test           # unit tests voor parsers, KPI's en analyseregels
npm run build      # productie-build in dist/
```

Zonder Supabase alvast kijken: `VITE_DEMO=1 npm run dev` (data blijft in het browsergeheugen).

## Structuur

- `src/lib/parseWenV.js` — parser voor de W&V-rekening (MTD/YTD, 9 entiteiten, 5-koloms blokken ACT/BUD/ΔBUD/FC/ΔFC), incl. aansluitcontrole HCC-totaal vs som regio's + staf.
- `src/lib/parseProductiviteit.js` — parser voor de productiviteitsbestanden (Actuals-blok per maand), incl. normconstanten.
- `src/lib/kpi.js` — KPI-tegels, trendreeksen, productiviteitsbrug, regiovergelijking; HCC-productiviteit gewogen op directe eigen personeelskosten.
- `src/lib/brutalFacts.js` — regelgebaseerde bevindingen (kostenprobleem, sturingsprobleem, verzuimtrend, capaciteitsmismatch, forecastbetrouwbaarheid, mixrisico).
- `supabase/schema.sql` — tabellen + RLS; `supabase/functions/analyse/` — Edge Function voor de AI-analyse.
- `SETUP.md` — stap-voor-stap handleiding vanaf nul (Supabase, Edge Function, Netlify).
