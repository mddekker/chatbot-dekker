# SETUP — HCC Maandcijfers Dashboard

Deze handleiding begint bij nul en veronderstelt niets als bekend. Doorloop de stappen in volgorde; na stap 7 draait het dashboard live op een eigen url.

**Wat je nodig hebt:** een e-mailadres, een creditcard is NIET nodig (alles kan op gratis tiers), en een Anthropic API-key voor de AI-analyse (aan te maken op https://console.anthropic.com).

**Overzicht van de onderdelen:**
- **Supabase** = de database + het inlogsysteem. Draait in de cloud, gratis tier is ruim voldoende (de app slaat alleen kleine maandsnapshots op, geen Excel-bestanden).
- **Netlify** = de hosting van de website zelf.
- **Edge Function** = een klein stukje servercode bij Supabase dat de AI-analyse opvraagt bij Anthropic, zodat de API-key nooit in de browser terechtkomt.

---

## Stap 1: Supabase-account en project aanmaken

1. Ga naar https://supabase.com en klik rechtsboven op **Start your project**.
2. Maak een account (inloggen met GitHub kan, e-mail + wachtwoord ook).
3. Je komt in het dashboard. Klik op **New project**.
4. Vul in:
   - **Name**: bijv. `hcc-maandcijfers`.
   - **Database Password**: klik op **Generate a password** en bewaar dit wachtwoord in je wachtwoordmanager. Je hebt het zelden nodig, maar raak het niet kwijt.
   - **Region**: kies **West EU (Ireland)** of **Central EU (Frankfurt)** — data blijft dan binnen de EU (relevant voor een arbodienst).
   - **Pricing plan**: Free.
5. Klik **Create new project** en wacht een minuut tot het project klaarstaat.

## Stap 2: Project URL en anon key vinden

1. Klik in het Supabase-dashboard links onderin op het tandwiel (**Project Settings**).
2. Klik op **API** (soms heet dit menu **Data API** / **API Keys**).
3. Je ziet daar twee dingen die we nodig hebben:
   - **Project URL** — ziet eruit als `https://abcdefgh.supabase.co`
   - **anon / public key** — een lange tekenreeks die begint met `eyJ...`
4. Maak lokaal in de map `hcc-dashboard` een bestand `.env` (kopieer `.env.example`) en vul in:

   ```
   VITE_SUPABASE_URL=https://JOUWPROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

**Waarom dit veilig is en de andere keys niet.** De anon key is ontworpen om in de browser te staan; hij geeft alleen toegang tot wat de Row Level Security-regels (stap 3) toestaan — en die eisen dat je bent ingelogd. Op dezelfde API-pagina staat ook een **service_role key**: die omzeilt ALLE beveiliging en mag dus nooit in de frontend, in git of op Netlify staan. Hetzelfde geldt voor de **Anthropic API-key**: wie die heeft kan op jouw kosten AI-verzoeken doen. Die twee horen uitsluitend server-side thuis (de Anthropic-key zetten we in stap 6 als secret op de Edge Function).

## Stap 3: Databasetabellen en Row Level Security aanmaken

1. Klik in het Supabase-dashboard in het linkermenu op **SQL Editor** (icoon met `>_`).
2. Klik op **New query** (of het plusje linksboven).
3. Open het bestand `supabase/schema.sql` uit dit project, kopieer de volledige inhoud en plak die in het grote tekstvak.
4. Klik rechtsonder op de groene knop **Run** (of druk Ctrl+Enter).
5. Onderin verschijnt `Success. No rows returned` — dat is goed.
6. Controle: klik links op **Table Editor**; je ziet nu de tabellen `snapshots` en `analyses`, beide met een schildje/label **RLS enabled**.

Wat je zojuist aanzette: Row Level Security zorgt dat de tabellen alleen leesbaar en schrijfbaar zijn voor ingelogde gebruikers. Zonder login geeft de database niets terug, ook al staat de anon key in de browser.

## Stap 4: Signups uitzetten en je eigen account aanmaken

Er is precies één gebruiker: jij. Publieke registratie gaat uit, het account maken we handmatig aan.

**Signups uitzetten:**
1. Klik links op **Authentication** en dan op **Sign In / Providers** (bij oudere versies: **Providers**).
2. Klik op **Email**.
3. Zet de schakelaar **Allow new users to sign up** UIT (bij sommige versies staat deze onder Authentication > Settings > User Signups).
4. Zet ook **Confirm email** UIT — je maakt je account handmatig aan, er hoeft geen bevestigingsmail verstuurd te worden.
5. Klik **Save**.

**Je account aanmaken:**
1. Klik links op **Authentication** > **Users**.
2. Klik rechtsboven op **Add user** > **Create new user**.
3. Vul je e-mailadres en een sterk wachtwoord in.
4. Vink **Auto Confirm User** aan (anders blijft het account op "waiting for verification" staan).
5. Klik **Create user**.

Met dit e-mailadres en wachtwoord log je straks in op het dashboard.

## Stap 5: Lokaal testen (optioneel maar aan te raden)

Vereist: Node.js 18 of hoger (https://nodejs.org, kies de LTS-versie).

```bash
cd hcc-dashboard
npm install
npm run dev
```

Open http://localhost:5173, log in met het account uit stap 4 en upload een testmaand. (Snel de app bekijken zonder Supabase kan ook: start met `VITE_DEMO=1 npm run dev` — data blijft dan alleen in het browsergeheugen.)

## Stap 6: Edge Function deployen voor de AI-analyse

Hiervoor gebruik je de Supabase CLI, eenmalig te installeren.

**CLI installeren:**
- Mac: `brew install supabase/tap/supabase`
- Windows (PowerShell): `scoop install supabase` (Scoop eerst installeren via https://scoop.sh) — of download de installer van https://github.com/supabase/cli/releases
- Alternatief zonder installatie: overal waar hieronder `supabase` staat werkt ook `npx supabase`

**Deployen** (uitvoeren in de map `hcc-dashboard`):

```bash
# 1. Inloggen — opent de browser voor een eenmalige koppeling
supabase login

# 2. Dit project koppelen aan je Supabase-project.
#    De project-ref is het deel vóór .supabase.co in je Project URL
#    (bij https://abcdefgh.supabase.co is dat abcdefgh)
supabase link --project-ref JOUW_PROJECT_REF

# 3. De Anthropic API-key als secret zetten (alleen server-side!)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-JOUW_KEY

# 4. De functie deployen
supabase functions deploy analyse
```

Controle: in het Supabase-dashboard onder **Edge Functions** staat nu `analyse`. De knop "Genereer analyse" in het dashboard werkt vanaf nu.

## Stap 7: Deploy naar Netlify

1. Zet dit project in een GitHub-repository (als dat nog niet zo is).
2. Ga naar https://app.netlify.com, maak een account (inloggen met GitHub is het makkelijkst).
3. Klik **Add new site** > **Import an existing project** > **GitHub** en kies je repository.
4. Instellingen:
   - **Base directory**: `hcc-dashboard` (alleen nodig als het dashboard in een submap van de repo staat; staat het in de root, laat dan leeg)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist` (Netlify maakt hier automatisch `hcc-dashboard/dist` van als base directory gezet is)
5. Klik vóór het deployen op **Add environment variables** en voeg toe:
   - `VITE_SUPABASE_URL` = je Project URL
   - `VITE_SUPABASE_ANON_KEY` = je anon key
   (Dus NIET de service role key en NIET de Anthropic-key — die laatste staat al veilig als secret bij Supabase.)
6. Klik **Deploy site**. Na een paar minuten heb je een url als `https://willekeurige-naam.netlify.app` — via **Site configuration > Change site name** kun je die aanpassen.

## Stap 8: Testchecklist

Doorloop dit lijstje op de live url:

- [ ] De site laadt en toont het loginscherm (geen registratieknop).
- [ ] Inloggen met een fout wachtwoord geeft een nette foutmelding.
- [ ] Inloggen met het account uit stap 4 lukt.
- [ ] Bij eerste gebruik verschijnt de lege-staat met uitleg over de twee bestandstypen.
- [ ] Upload de W&V-rekening: het bestand wordt herkend als "W&V-rekening", periode (bijv. P6) wordt gedetecteerd, 9 entiteiten.
- [ ] Upload de zeven productiviteitsbestanden: elke regio wordt herkend; het validatiescherm toont welke regio's binnen zijn.
- [ ] Opslaan als de juiste maand; het HCC-dashboard toont KPI-tegels, trends en de regiovergelijking.
- [ ] Dezelfde maand nogmaals opslaan vraagt eerst om bevestiging (overschrijven).
- [ ] "Genereer analyse" levert binnen ±30 seconden een Nederlandse analyse op; na herladen van de pagina is die er nog (opgeslagen).
- [ ] "Exporteer / print" geeft een nette printweergave (opslaan als PDF kan via het printdialoog).
- [ ] Uitloggen en de pagina herladen: je komt weer op het loginscherm en ziet geen data.

## Veelvoorkomende fouten

**"Invalid API key" of "Configuratie ontbreekt" na deploy**
De environment variables op Netlify ontbreken of bevatten een typfout. Controleer op Netlify onder **Site configuration > Environment variables** of `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` exact kloppen (geen aanhalingstekens, geen spaties). Na aanpassen: **Deploys > Trigger deploy > Clear cache and deploy site** — environment variables worden alleen bij de build ingebakken.

**Inloggen lukt, maar het dashboard blijft leeg of "Data laden mislukt" / opslaan geeft een RLS-fout ("new row violates row-level security policy")**
De RLS-policies uit stap 3 ontbreken of zijn half uitgevoerd. Voer `supabase/schema.sql` nogmaals volledig uit in de SQL Editor (het script is herhaalbaar; bestaande data blijft staan).

**"Genereer analyse" geeft "Niet ingelogd" of een 401**
De Edge Function controleert je login. Log uit en weer in (de sessie kan verlopen zijn). Blijft het misgaan, controleer dan of de functie in hetzelfde Supabase-project is gedeployed als waar de app naartoe wijst.

**"Genereer analyse" geeft "ANTHROPIC_API_KEY is niet gezet als secret"**
Stap 6.3 is overgeslagen of de deploy gebeurde vóór het zetten van de secret. Voer `supabase secrets set ANTHROPIC_API_KEY=...` uit en daarna opnieuw `supabase functions deploy analyse`.

**CORS-fout in de browserconsole bij "Genereer analyse"**
Meestal betekent dit dat de functie een fout gaf vóór de CORS-headers gezet werden (bijv. crash bij opstarten). Bekijk de logs: Supabase-dashboard > **Edge Functions** > `analyse` > **Logs**. De echte foutmelding staat daar.

**Inloggen geeft "Email not confirmed"**
Het account is aangemaakt zonder **Auto Confirm User**. Ga naar Authentication > Users, klik op de gebruiker en bevestig het e-mailadres handmatig (of verwijder de gebruiker en maak hem opnieuw aan met het vinkje aan).

**Een productiviteitsbestand wordt als "regio onbekend" gemarkeerd**
De regionaam wordt uit de sheetnaam (`Maand prod <regio>`) of de bestandsnaam gehaald. Controleer of een van beide de regionaam bevat (spaties/streepjes maken niet uit: "Zuid-West", "Zuid West" en "ZuidWest" werken allemaal).
