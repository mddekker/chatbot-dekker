import { NORM_NETTO_PRODUCTIVITEIT, NORM_ALGEMENE_UREN, PLAN_BRUTO_PRODUCTIVITEIT } from './parseProductiviteit.js'
import { fmtK, fmtPct, fmtUren } from './format.js'

// Genereert per regio en maand de vragen voor het maandelijkse reviewgesprek
// met de regiodirecteur. Zelfde toon als de bevindingen: direct, met cijfers,
// gericht op sturing. Volgorde = prioriteit; maximaal 6 vragen.

const KOSTEN_VELDEN = [
  ['inkoop', 'inkoop'],
  ['directe personeelskosten', 'persKostenDirect'],
  ['indirecte personeelskosten', 'persKostenIndirect'],
  ['externe inhuur', 'persInhuurDirect'],
  ['mobiliteit', 'persMobiliteitDirect'],
  ['huisvesting', 'huisvesting'],
  ['automatisering', 'automatisering'],
  ['verkoopkosten', 'verkoop'],
  ['algemene kosten', 'algemeneKosten'],
]

function grootsteKostenOverschrijding(mtd) {
  let slechtste = null
  for (const [naam, veld] of KOSTEN_VELDEN) {
    const dFc = mtd[veld]?.dFc
    if (dFc != null && dFc > 0 && (!slechtste || dFc > slechtste.dFc)) slechtste = { naam, dFc }
  }
  return slechtste
}

export function reviewVragen(idx, regio, maand) {
  const vragen = []
  const wenv = idx.wenv[regio]?.[maand]?.mtd
  const prod = idx.prod[regio]?.[maand]

  const maanden = idx.maanden.filter((m) => m < maand)
  const vorigeMaand = maanden[maanden.length - 1] || null
  const prodVorig = vorigeMaand ? idx.prod[regio]?.[vorigeMaand] : null

  // 1. Herhaald probleem eerst: productiviteit vorige maand óók onder norm.
  const nettoProd = prod?.nettoProductiviteit
  const nettoProdVorig = prodVorig?.nettoProductiviteit
  if (
    nettoProd != null && nettoProdVorig != null &&
    nettoProd < NORM_NETTO_PRODUCTIVITEIT - 0.02 && nettoProdVorig < NORM_NETTO_PRODUCTIVITEIT - 0.02
  ) {
    vragen.push({
      thema: 'Herhaald signaal',
      vraag:
        `Vorige maand stond de netto productiviteit ook al onder de norm (${fmtPct(nettoProdVorig)}, nu ${fmtPct(nettoProd)}). ` +
        `Welke actie is er sindsdien concreet uitgevoerd, en waarom zie ik het effect nog niet in de cijfers?`,
    })
  }

  // 2. Eigen forecast gemist.
  const omzet = wenv?.nettoOmzet
  if (omzet?.dFc != null && omzet.fc && omzet.dFc < 0) {
    vragen.push({
      thema: 'Forecast',
      vraag:
        `Je zat ${fmtK(omzet.dFc)} (${fmtPct(omzet.dFc / omzet.fc)}) onder je eigen forecast. ` +
        `Wat wist je bij het afgeven niet dat je nu wel weet, en wat betekent dat voor de forecast van komende maand?`,
    })
  }

  // 3. Kostenprobleem: OR-miss groter dan omzetmiss.
  const or = wenv?.operationeelResultaat
  if (or?.dFc != null && omzet?.dFc != null && or.dFc < 0 && or.dFc < omzet.dFc) {
    const kosten = grootsteKostenOverschrijding(wenv)
    vragen.push({
      thema: 'Kosten',
      vraag:
        `Het resultaat mist ${fmtK(or.dFc)} terwijl de omzet ${fmtK(omzet.dFc, { plus: true })} afwijkt; het verschil zit in de kosten` +
        (kosten ? `, vooral ${kosten.naam} (${fmtK(kosten.dFc, { plus: true })} vs forecast)` : '') +
        `. Welke beslissing zit daarachter en wat schrap of stop je deze maand?`,
    })
  }

  // 4. Capaciteit aanwezig maar niet productief.
  const brutoProd = prod?.brutoProductiviteit
  if (nettoProd != null && nettoProd < NORM_NETTO_PRODUCTIVITEIT - 0.02) {
    if (brutoProd != null && brutoProd >= PLAN_BRUTO_PRODUCTIVITEIT) {
      vragen.push({
        thema: 'Productiviteit',
        vraag:
          `De capaciteit is er (bruto ${fmtPct(brutoProd)}, op of boven plan), maar netto blijft steken op ${fmtPct(nettoProd)} ` +
          `tegen een norm van ${fmtPct(NORM_NETTO_PRODUCTIVITEIT)}. Waar lekken de uren weg, en welke afspraak maak je hierover met je teams?`,
      })
    } else {
      vragen.push({
        thema: 'Productiviteit',
        vraag:
          `Netto productiviteit ${fmtPct(nettoProd)} tegen norm ${fmtPct(NORM_NETTO_PRODUCTIVITEIT)}. ` +
          `Hoeveel daarvan is capaciteit (verzuim, vakantie) en hoeveel is sturing? Wat is jouw plan per component?`,
      })
    }
  }

  // 5. Algemene uren boven norm.
  const bovenNorm = prod?.algemeneUrenBovenNorm
  if (bovenNorm != null && bovenNorm > 4) {
    vragen.push({
      thema: 'Algemene uren',
      vraag:
        `Je team zit ${fmtUren(bovenNorm, { plus: true })} per FTE boven de norm van ${fmtUren(NORM_ALGEMENE_UREN)} aan algemene, ` +
        `niet-productieve uren. Welke overleggen, projecten of taken stop of halveer je per direct?`,
    })
  }

  // 6. Verzuim: stijgend of hoog.
  const verzuim = prod?.verzuimUren
  const verzuimVorig = prodVorig?.verzuimUren
  if (verzuim != null && verzuimVorig != null && verzuim > verzuimVorig * 1.1) {
    vragen.push({
      thema: 'Verzuim',
      vraag:
        `Het verzuim steeg van ${fmtUren(verzuimVorig)} naar ${fmtUren(verzuim)} per FTE. ` +
        `Hoeveel dossiers zitten hierachter, welk deel is beïnvloedbaar, en waar wacht de aanpak op?`,
    })
  }

  // 7. Interne verrekening: fors uitlenen of afnemen.
  if (wenv) {
    const ikv = (wenv.persInterneVerrekeningDirect?.act ?? 0) + (wenv.persInterneVerrekeningIndirect?.act ?? 0)
    if (ikv < -25000) {
      vragen.push({
        thema: 'Capaciteit',
        vraag:
          `Je leent voor ${fmtK(-ikv)} aan capaciteit uit aan andere regio's. Is dat overschot structureel, ` +
          `en waarom zet je het niet in op eigen omzet${omzet?.dFc != null && omzet.dFc < 0 ? ' nu je je forecast mist' : ''}?`,
      })
    } else if (ikv > 25000) {
      const inhuur = (wenv.persInhuurDirect?.act ?? 0) + (wenv.persInhuurIndirect?.act ?? 0)
      vragen.push({
        thema: 'Capaciteit',
        vraag:
          `Je neemt voor ${fmtK(ikv)} aan capaciteit af van andere regio's` +
          (inhuur > 10000 ? ` en huurt daarnaast ${fmtK(inhuur)} extern in` : '') +
          `. Is dit overbrugging of verhult het een structureel gat in je eigen formatie?`,
      })
    }
  }

  // 8. Preventie blijft achter (mixrisico).
  const preventie = wenv?.omzetPreventie
  if (preventie?.dBud != null && preventie.bud && preventie.dBud < -0.1 * Math.abs(preventie.bud)) {
    vragen.push({
      thema: 'Omzetmix',
      vraag:
        `Preventie-omzet blijft ${fmtK(preventie.dBud)} (${fmtPct(preventie.dBud / preventie.bud)}) achter op budget. ` +
        `Wat zit er in de pipeline voor komend kwartaal, en wie stuurt daarop?`,
    })
  }

  return vragen.slice(0, 6)
}
