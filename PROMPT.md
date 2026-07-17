# Prompt: Terugkoppeltool spreekuur → werkgever

> Dit is de totaalprompt die tot deze webapp leidt. De tool is in stappen gebouwd met
> AI-ondersteuning (Claude Code); dit document voegt de oorspronkelijke opdracht en
> alle latere uitbreidingen samen tot één prompt. Een AI-codeertool bouwt hiermee een
> functioneel gelijkwaardige app — niet tot op de pixel identiek.

---

Bouw een webapp voor bedrijfsartsen, arboverpleegkundigen en praktijkondersteuners
bedrijfsartsen (POB's) van arbodienst HumanCapitalCare. De tool helpt hen om na een
spreekuur met een werknemer snel een
kwalitatief goede, positief geframede terugkoppeling aan de leidinggevende van de
werkgever op te stellen.

## Doel

De terugkoppeling naar de leidinggevende is nu vaak te medisch, te vaag of te negatief
geframed ("kan niet werken") in plaats van gericht op benutbare mogelijkheden ("kan
2x4 uur aangepast werk doen"). De tool stelt de professional gerichte vragen en
genereert daaruit een terugkoppeling die:

1. **Juridisch correct** is: géén diagnose, géén medische termen, géén
   privé-informatie. Alleen functionele beperkingen, belastbaarheid, benutbare
   mogelijkheden, prognose in tijd, en advies aan de leidinggevende. Dit is een harde
   eis (AVG, beleidsregels Autoriteit Persoonsgegevens "De zieke werknemer",
   NVAB-richtlijnen).
2. **Positief geframed** is: start altijd met wat de werknemer wél kan, daarna de
   beperkingen in functionele termen.
3. **Direct bruikbaar** is voor een leidinggevende zonder medische achtergrond:
   begrijpelijke taal, concreet handelingsperspectief.

## Toegang

De app zit achter een gedeeld wachtwoord. Het wachtwoord staat uitsluitend in de
environment variable `SITE_PASSWORD` op de server en wordt server-side gecontroleerd:
álle AI-aanroepen weigeren (401) zonder juist wachtwoord, zodat de proxy niet te
omzeilen is. Is `SITE_PASSWORD` niet gezet, dan is de app open. Het ingevoerde
wachtwoord wordt per browsertabblad onthouden (sessionStorage). Toon een net
inlogscherm ("Toegang") in de huisstijl.

## Flow van de app

**Stap 1: Rol en context.** De gebruiker kiest zijn rol (bedrijfsarts /
arboverpleegkundige / POB) en het type spreekuur (verzuimspreekuur, vervolgconsult,
preventief consult, arbeidsomstandighedenspreekuur). Op ditzelfde scherm: datum
spreekuur (vooringevuld op vandaag), optionele functie-aanduiding van de werknemer en
optionele aanduiding/naam (leeg = "de werknemer"; een naam wordt alleen lokaal
gebruikt). Let op: alleen de bedrijfsarts mag zelfstandig een oordeel over
belastbaarheid terugkoppelen; bij arboverpleegkundige of POB voegt de tool automatisch
de formulering toe dat de terugkoppeling plaatsvindt onder verantwoordelijkheid van en
na afstemming met de bedrijfsarts.

**Stap 2: Vragenflow.** Eén vraag per scherm, met voortgangsindicator. De vragenset
hangt af van het type spreekuur: verzuimspreekuur en vervolgconsult krijgen de
verzuimgerichte set hieronder; preventief consult en arbeidsomstandighedenspreekuur
krijgen een eigen, kortere set (verderop beschreven), omdat de werknemer dan niet
(per se) ziek is.

De kernvragen (verzuimspreekuur en vervolgconsult):

1. Wat was de aanleiding van dit spreekuur? (vrije tekst met suggestiechips)
2. Wat kan de werknemer op dit moment wél? Denk aan taken, uren per dag/week, eigen
   werk of aangepast werk.
3. Welke beperkingen zijn er, in functionele termen? Bied deze categorieën aan als
   aanklikbare chips met een vrij tekstveld: energie en duurbelasting, concentratie en
   aandacht, fysieke belasting, emotionele belasting, werken onder tijdsdruk,
   samenwerken en sociale interactie.
4. Is het verzuim (mede) werkgerelateerd? (Ja / Gedeeltelijk / Nee / Nog onduidelijk)
   → Bij Ja of Gedeeltelijk volgt automatisch een vervolgvraag: "Welke werkgerelateerde
   factoren spelen een rol?" met aanklikbare chips (werkdruk en tempo, werkinhoud en
   taken, samenwerking en werksfeer, spanning met leidinggevende of collega, fysieke
   arbeidsomstandigheden, werktijden en roosters) plus vrij tekstveld. Alleen
   functionele factoren, geen medische oorzaken. Wijzigt de gebruiker het antwoord
   later naar Nee, dan verdwijnt de vervolgvraag weer inclusief antwoord.
5. Wat is de verwachting voor de komende periode? (opbouw / stabiel / nog onduidelijk;
   termijn in weken, optioneel)
6. Welk concreet advies geef je de leidinggevende? (met suggestiechips zoals
   opbouwschema afspreken, werkaanpassing regelen, regelmatig gesprek voeren, taken
   tijdelijk herverdelen)
7. Welke afspraken zijn met de werknemer gemaakt? (optioneel)
8. Wanneer is het vervolgcontact en met wie? (optioneel)
9. Loopt er een interventie of vervolgstap die relevant is voor de werkgever?
   (optioneel; alleen functioneel benoemen, bijv. "er is een traject gestart gericht
   op herstel van belastbaarheid")
10. Heeft de werknemer toestemming gegeven om eventuele aanvullende informatie te
    delen? (standaard nee: dan blijft alles strikt functioneel)
11. Slotvraag (optioneel, overslaanbaar): "Zijn er nog aandachtspunten voor deze
    terugkoppelingsbrief?" — open veld voor alles waarmee de brief rekening moet
    houden of wat erin moet worden opgenomen (iets dat zeker benoemd moet worden, iets
    dat juist niet in de brief hoort, een gevoeligheid in de relatie met de
    leidinggevende, een gewenst accent).

**Vragenset preventief consult en arbeidsomstandighedenspreekuur** (de werknemer is
niet ziek gemeld, dus geen verzuim- of belastbaarheidsvragen):

1. Heeft de werknemer ingestemd met een terugkoppeling aan de leidinggevende?
   (Ja / Nee). Instemming is bij deze spreekuren voorwaarde: bij Nee toont de app een
   duidelijke melding dat het spreekuurbezoek vertrouwelijk blijft en wordt er géén
   terugkoppeling opgesteld (met de tip dat niet-herleidbare signalen op groepsniveau
   buiten de tool om gedeeld kunnen worden).
2. Wat was de aanleiding van dit spreekuur? (met suggestiechips zoals eigen vraag van
   de werknemer, vraag over werkomstandigheden, signalen van werkdruk, duurzame
   inzetbaarheid)
3. Wat speelt er, in functionele en werkgerichte termen?
4. Welke werkfactoren zijn relevant? (zelfde chips als de werkgerelateerd-vervolgvraag)
5. Welk concreet advies geef je de leidinggevende? (preventief en actiegericht)
6. Welke afspraken zijn met de werknemer gemaakt? (optioneel)
7. Is er een vervolgcontact afgesproken, en met wie? (optioneel)
8. Zijn er nog aandachtspunten voor deze terugkoppelingsbrief? (optioneel)

De brief krijgt bij deze spreekuren een passende structuur zonder verzuimtaal:
Aanleiding en datum spreekuur / Situatie en relevante werkfactoren / Advies aan
leidinggevende / Afspraken en vervolg — met de expliciete vermelding dat de werknemer
heeft ingestemd met de terugkoppeling. Gebruik hiervoor een eigen systeemprompt
(Nederlands én Engels) met dezelfde harde privacyregels, zonder herstel- of
re-integratieframing, lengte 120-200 woorden.

**Adaptief:** gebruik de Anthropic API om bij de belangrijkste open antwoorden (wat kan
wél, beperkingen, advies) te beoordelen of het antwoord concreet genoeg is. Is een
antwoord te vaag (bijv. "gaat wel"), stel dan maximaal één gerichte vervolgvraag per
vraag. Totaal nooit meer dan 13 vragen. De vervolgvraag mag nooit naar medische of
privé-informatie vragen.

**Stap 3: Genereren.** De app genereert een kant-en-klare tekst die zonder bewerking in
de terugkoppelingsbrief kan: platte tekst zonder markdown-symbolen, geen placeholders,
geen open zinnen, geen AI-toelichtingen. Wat de gebruiker leeg laat, blijft weg. Zonder
adressering en ondertekening (die zitten in het brieftemplate); via een schakelaar op
het resultaatscherm zijn een aanhef ("Geachte heer, mevrouw,") en afsluiting ("Met
vriendelijke groet,") toe te voegen, zonder namen of placeholders. Bouw server-side een
vangnet in dat markdown-tekens en AI-inleidingen ("Hier is de terugkoppeling:") uit de
output verwijdert.

Vaste structuur met korte kopjes in gewone tekst:

- Aanleiding en datum spreekuur
- Benutbare mogelijkheden (eerst!)
- Belastbaarheid en functionele beperkingen
- Verwachting en tijdspad
- Advies aan leidinggevende (concreet, actiegericht)
- Afspraken en vervolg

Toon: zakelijk, warm, actief, korte alinea's, geen jargon. Lengte: 150-250 woorden.

De aandachtspunten uit vraag 11 gaan als dwingende instructie mee in de
generatie-opdracht, geplaatst aan het EINDE van de opdracht (daar weegt het voor het
model het zwaarst): punten die genoemd moeten worden daadwerkelijk opnemen, weglaten
wat weggelaten moet worden, toon en accent aanpassen zoals gevraagd. Alleen als een
aanwijzing strijdig is met de harde privacyregels gaan die regels voor.

**Stap 4: Privacycheck.** Laat de gegenereerde tekst door een tweede API-call
controleren op: diagnoses en ziektebeelden (ook verhullend, zoals "burn-outklachten",
"rugklachten", "stressklachten"), medische termen/behandelingen/zorgverleners,
privé-omstandigheden (zoals "thuissituatie") en oordelen over de persoon. Gevonden
risico's worden getoond met het letterlijke fragment, uitleg en een functioneel
alternatief dat met één klik het fragment in de tekst vervangt. Toon alleen risico's
waarvan het fragment letterlijk in de tekst staat. Voeg een knop "Opnieuw controleren"
toe voor handmatig bewerkte tekst.

**Stap 5: Resultaat.** Bewerkbaar tekstveld met woordenteller, kopieerknop, knop
"opnieuw genereren met andere toon" (neutraler / warmer / zakelijker), de
aanhef-schakelaar en een knop om een nieuwe terugkoppeling te starten. Vaste
disclaimer: "De professional blijft eindverantwoordelijk. Controleer de tekst altijd
zelf voordat je deze deelt."

## Huisstijl

- Rustig en professioneel; kleuren afgestemd op HumanCapitalCare:
  donkerblauw/navy (`#1b3e8e`) als primaire kleur, teal (`#1c9ca6`) als accentkleur,
  veel wit. Eenvoudig aanpasbaar via CSS-variabelen.
- Het officiële HumanCapitalCare-logo op twee subtiele plekken: als heel licht
  watermerk (± 5% dekking) rechtsonder op de paginaachtergrond, en in de voettekst.
  Zet het logobestand in `public/` met een vaste bestandsnaam zodat het eenvoudig te
  vervangen is.

## Techniek

- React + Vite, single page, mobile-first (gebruik op tablet/telefoon tussen
  spreekuren door)
- Deploy-ready voor Netlify; Anthropic API-calls via een Netlify Function als proxy;
  API-key uitsluitend in de environment variable `ANTHROPIC_API_KEY`, nooit in de
  frontend; nette Nederlandse foutmeldingen bij storingen
- Model: `claude-sonnet-4-6`
- Geen database, geen opslag, geen account of login (behalve het gedeelde wachtwoord):
  alle data alleen in browsergeheugen, verdwijnt bij verversen
- Duidelijke laadstatus bij het genereren

## Systeemprompt voor de generatie-API-call (neem letterlijk op in de code)

"Je schrijft een terugkoppeling van een spreekuur bij de arbodienst aan de
leidinggevende van de werkgever. Harde regels: noem nooit een diagnose, ziektebeeld,
behandeling, medicatie of medische term. Beschrijf uitsluitend belastbaarheid,
functionele beperkingen en benutbare mogelijkheden. Start met wat de werknemer wél
kan. Schrijf in begrijpelijk Nederlands voor iemand zonder medische achtergrond. Wees
concreet: uren, taken, termijnen. Geef de leidinggevende een duidelijk
handelingsperspectief. Toon: professioneel, warm, actief. Lengte: 150-250 woorden.
Lever platte tekst zonder markdown-opmaak, zonder placeholders en zonder aanvullende
toelichting: alleen de brieftekst zelf, direct te kopiëren in de terugkoppelingsbrief."

## Kwaliteitseisen

- De gegenereerde tekst moet 1-op-1 plakbaar zijn: nooit markdown-tekens, placeholders
  of AI-toelichtingen in de output (test dit)
- Test de privacycheck met valkuilen: "werknemer heeft last van stressklachten door
  thuissituatie" moet worden afgevangen en herschreven naar functionele termen
- Test de wachtwoordbeveiliging: zonder juist wachtwoord geen toegang tot de app én
  geen werkende AI-aanroepen
- Lever een korte README met deploy-instructies voor Netlify en de benodigde
  environment variables (`ANTHROPIC_API_KEY`, `SITE_PASSWORD`)
