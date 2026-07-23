# Terugkoppeltool spreekuur

Webapp voor bedrijfsartsen, arboverpleegkundigen en praktijkondersteuners bedrijfsartsen (POB's) van HumanCapitalCare. De tool stelt na een spreekuur gerichte vragen en genereert daaruit een terugkoppeling aan de leidinggevende die:

1. **Juridisch correct** is — geen diagnoses, medische termen of privé-informatie (AVG, beleidsregels AP "De zieke werknemer", NVAB-richtlijnen)
2. **Positief geframed** is — start met wat de werknemer wél kan
3. **Direct bruikbaar** is — begrijpelijke taal en concreet handelingsperspectief

Extra: een automatische privacycheck markeert risicovolle formuleringen met een functioneel alternatief dat met één klik kan worden overgenomen.

## Techniek

- React + Vite, single page, mobile-first
- Anthropic API (model `claude-sonnet-4-6`) via een Netlify Function als proxy — de API-key staat uitsluitend server-side
- Geen database of opslag: alle gegevens blijven in het browsergeheugen en verdwijnen bij verversen
- Geen account of login nodig
- Huisstijlkleuren zijn aanpasbaar via de CSS-variabelen bovenin `src/styles.css`

## Logo

Het officiële HumanCapitalCare-logo staat als `public/logo-humancapitalcare.png` (transparante achtergrond) en verschijnt als subtiel watermerk op de achtergrond en in de voettekst. Een nieuwere versie plaatsen kan door het bestand te overschrijven met dezelfde bestandsnaam.

## Lokaal draaien

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # nooit committen
npx netlify dev                        # draait frontend + functions samen op http://localhost:8888
```

`npm run dev` (alleen Vite) werkt ook, maar dan zijn de AI-functies niet beschikbaar tenzij je daarnaast `netlify functions:serve` draait.

## Deployen naar Netlify

1. Push deze repository naar GitHub en maak op [netlify.com](https://app.netlify.com) een nieuwe site aan via **Add new site → Import an existing project**.
2. Netlify leest de instellingen uit `netlify.toml` (build command `npm run build`, publish directory `dist`, functions in `netlify/functions`). Je hoeft niets aan te passen.
3. Zet de environment variable onder **Site configuration → Environment variables**:

   | Naam | Waarde |
   |---|---|
   | `ANTHROPIC_API_KEY` | Je Anthropic API-key (aan te maken op [platform.claude.com](https://platform.claude.com)) |
   | `SITE_PASSWORD` | Optioneel: gedeeld toegangswachtwoord. Gezet = de app vraagt een wachtwoord vóór gebruik (server-side gecontroleerd, ook voor de AI-aanroepen). Niet gezet = de app is open. |
   | `STATS_PASSWORD` | Optioneel: beheerderswachtwoord voor de gebruiksstatistieken (aantal gegenereerde terugkoppelingen per dag/taal/type — alleen aantallen, geen inhoud). Bereikbaar via `?beheer` achter de URL of door 5x snel op het logo in de voettekst te tikken. |

4. Deploy. De frontend praat via `/.netlify/functions/anthropic` met de proxy; de key is nooit zichtbaar in de browser.

## Structuur

```
netlify/functions/anthropic.mjs   # API-proxy: antwoordcheck, generatie, privacycheck
src/App.jsx                       # flow: context → vragen → resultaat
src/QuestionStep.jsx              # één vraag per scherm, met voortgangsindicator
src/ResultStep.jsx                # resultaat, privacycheck, toon-varianten, kopieerknop
src/lib/questions.js              # vragenset en categorieën
src/styles.css                    # huisstijl via CSS-variabelen
```

## Disclaimer

De professional blijft eindverantwoordelijk voor de inhoud. Controleer de tekst altijd zelf voordat je deze deelt.
