import { HCC, REGIOS, entiteitLabel } from './entities.js'
import { NORM_NETTO_PRODUCTIVITEIT, PLAN_BRUTO_PRODUCTIVITEIT } from './parseProductiviteit.js'
import { gewogenProd } from './kpi.js'
import { fmtK, fmtPct, fmtPunt, fmtUren } from './format.js'

// Regelgebaseerde bevindingen: korte, harde bullets met cijfers, per entiteit.
// ernst: 'rood' | 'oranje' | 'info'
export function brutalFacts(idx, ent, maand) {
  const bevindingen = []
  const wenv = idx.wenv[ent]?.[maand]?.mtd
  const prod = ent === HCC ? null : idx.prod[ent]?.[maand]
  const maanden = idx.maanden.filter((m) => m <= maand)

  const nettoProd = ent === HCC ? gewogenProd(idx, maand, 'nettoProductiviteit') : prod?.nettoProductiviteit
  const brutoProd = ent === HCC ? gewogenProd(idx, maand, 'brutoProductiviteit') : prod?.brutoProductiviteit

  // 1. OR-miss vs FC groter dan omzetmiss: kostenprobleem.
  if (wenv) {
    const omzetMiss = wenv.nettoOmzet?.dFc
    const orMiss = wenv.operationeelResultaat?.dFc
    if (omzetMiss != null && orMiss != null && orMiss < 0 && orMiss < omzetMiss) {
      const kosten = grootsteKostenAfwijking(wenv)
      bevindingen.push({
        ernst: 'rood',
        tekst:
          `Kostenprobleem: OR mist forecast met ${fmtK(orMiss)} terwijl omzet ${omzetMiss < 0 ? `slechts ${fmtK(omzetMiss)}` : `${fmtK(omzetMiss, { plus: true })}`} afwijkt. ` +
          (kosten ? `Grootste kostenafwijking: ${kosten.naam} ${fmtK(kosten.dFc, { plus: true })} vs FC.` : ''),
      })
    }

    // 6. Forecastbetrouwbaarheid: omzet-FC in de maand zelf al > 2% gemist.
    if (wenv.nettoOmzet?.dFc != null && wenv.nettoOmzet?.fc) {
      const missPct = wenv.nettoOmzet.dFc / wenv.nettoOmzet.fc
      if (missPct < -0.02) {
        bevindingen.push({
          ernst: 'oranje',
          tekst: `Forecastbetrouwbaarheid: omzetforecast in de eigen maand al met ${fmtPct(missPct)} gemist (${fmtK(wenv.nettoOmzet.dFc)}). Forecast is hiermee geen stuurinstrument.`,
        })
      }
    }

    // 7. Mixrisico: groei komt uit één productlijn terwijl preventie daalt.
    const vorige = vorigeMaandMet(idx, ent, maanden)
    if (vorige) {
      const nu = wenv
      const vo = idx.wenv[ent][vorige].mtd
      const dPrev = delta(nu.omzetPreventie?.act, vo.omzetPreventie?.act)
      const dVerz = delta(nu.omzetVerzuim?.act, vo.omzetVerzuim?.act)
      const dInt = delta(nu.omzetInterventie?.act, vo.omzetInterventie?.act)
      const dTotaal = delta(nu.nettoOmzet?.act, vo.nettoOmzet?.act)
      if (dTotaal != null && dTotaal > 0 && dPrev != null && dPrev < 0) {
        const groei = [
          ['verzuimbegeleiding', dVerz],
          ['arbeidsinterventie & re-integratie', dInt],
        ].filter(([, d]) => d != null && d > 0)
        if (groei.length === 1) {
          bevindingen.push({
            ernst: 'oranje',
            tekst: `Mixrisico: omzetgroei (${fmtK(dTotaal, { plus: true })} m-o-m) komt volledig uit ${groei[0][0]} terwijl preventie daalt (${fmtK(dPrev)}). Eenzijdige afhankelijkheid.`,
          })
        }
      }
    }
  }

  // 2. Netto productiviteit meer dan 5 punt onder norm: rood.
  if (nettoProd != null) {
    const gat = nettoProd - NORM_NETTO_PRODUCTIVITEIT
    if (gat < -0.05) {
      bevindingen.push({
        ernst: 'rood',
        tekst: `Netto productiviteit ${fmtPct(nettoProd)} ligt ${fmtPunt(Math.abs(gat), { plus: false })} onder de norm van ${fmtPct(NORM_NETTO_PRODUCTIVITEIT)}.`,
      })
    }

    // 3. Bruto boven plan maar netto ver onder norm: sturingsprobleem.
    if (brutoProd != null && brutoProd >= PLAN_BRUTO_PRODUCTIVITEIT && gat < -0.05) {
      bevindingen.push({
        ernst: 'rood',
        tekst:
          `Sturingsprobleem: bruto productiviteit ${fmtPct(brutoProd)} is op of boven plan (${fmtPct(PLAN_BRUTO_PRODUCTIVITEIT)}), maar netto blijft op ${fmtPct(nettoProd)} steken. ` +
          `De capaciteit is er, maar wordt niet productief gemaakt.`,
      })
    }
  }

  // 4. Verzuim 3 maanden op rij stijgend: trend, geen incident.
  const verzuimReeks = maanden
    .map((m) => ({
      maand: m,
      v: ent === HCC ? gewogenProd(idx, m, 'verzuimUren') : idx.prod[ent]?.[m]?.verzuimUren,
    }))
    .filter((p) => p.v != null)
  if (verzuimReeks.length >= 4) {
    const laatste4 = verzuimReeks.slice(-4)
    const stijgend = laatste4.every((p, i) => i === 0 || p.v > laatste4[i - 1].v)
    if (stijgend) {
      bevindingen.push({
        ernst: 'rood',
        tekst: `Verzuim stijgt drie maanden op rij: ${laatste4.map((p) => fmtUren(p.v)).join(' → ')} per FTE. Dit is een trend, geen incident.`,
      })
    }
  }

  // 5. Capaciteitsmismatch op HCC-niveau: regio leent uit terwijl elders wordt ingehuurd.
  if (ent === HCC && idx.wenv) {
    const uitleners = []
    let inhuurTotaal = 0
    for (const regio of REGIOS) {
      const m = idx.wenv[regio]?.[maand]?.mtd
      if (!m) continue
      const ikv = (m.persInterneVerrekeningDirect?.act ?? 0) + (m.persInterneVerrekeningIndirect?.act ?? 0)
      if (ikv < -10000) uitleners.push({ regio, ikv })
      inhuurTotaal += (m.persInhuurDirect?.act ?? 0) + (m.persInhuurIndirect?.act ?? 0)
    }
    if (uitleners.length && inhuurTotaal > 50000) {
      bevindingen.push({
        ernst: 'oranje',
        tekst:
          `Capaciteitsmismatch: ${uitleners.map((u) => `${entiteitLabel(u.regio)} leent uit (IKV ${fmtK(u.ikv)})`).join(', ')} ` +
          `terwijl de regio's samen ${fmtK(inhuurTotaal)} aan externe inhuur betalen. Eerst intern matchen, dan pas inhuren.`,
      })
    }
  }

  return bevindingen
}

function delta(a, b) {
  return a != null && b != null ? a - b : null
}

function vorigeMaandMet(idx, ent, maanden) {
  for (let i = maanden.length - 2; i >= 0; i--) {
    if (idx.wenv[ent]?.[maanden[i]]?.mtd) return maanden[i]
  }
  return null
}

const KOSTEN_VELDEN = [
  ['Inkoop', 'inkoop'],
  ['Directe personeelskosten', 'persKostenDirect'],
  ['Indirecte personeelskosten', 'persKostenIndirect'],
  ['Inhuur (direct)', 'persInhuurDirect'],
  ['Mobiliteit (direct)', 'persMobiliteitDirect'],
  ['Huisvesting', 'huisvesting'],
  ['Automatisering', 'automatisering'],
  ['Verkoopkosten', 'verkoop'],
  ['Algemene kosten', 'algemeneKosten'],
]

function grootsteKostenAfwijking(mtdData) {
  let slechtste = null
  for (const [naam, veld] of KOSTEN_VELDEN) {
    const dFc = mtdData[veld]?.dFc
    // Kosten: positieve afwijking = duurder dan forecast.
    if (dFc != null && dFc > 0 && (!slechtste || dFc > slechtste.dFc)) {
      slechtste = { naam, dFc }
    }
  }
  return slechtste
}
