import { HCC, REGIOS } from './entities.js'

// Bouw uit de platte snapshotlijst een index:
// { wenv: { ENT: { '2026-06-01': {mtd,ytd} } },
//   prod: { ENT: { '2026-06-01': {...} } },
//   maanden: ['2026-01-01', ...] } (gesorteerd, unie van beide bronnen)
export function indexeerSnapshots(rijen) {
  const idx = { wenv: {}, prod: {}, maanden: [] }
  const maanden = new Set()
  for (const rij of rijen || []) {
    const maand = String(rij.maand).slice(0, 10)
    maanden.add(maand)
    const doel = rij.bron === 'wenv' ? idx.wenv : idx.prod
    doel[rij.entiteit] = doel[rij.entiteit] || {}
    doel[rij.entiteit][maand] = rij.data
  }
  idx.maanden = [...maanden].sort()
  return idx
}

export function laatsteMaand(idx) {
  return idx.maanden[idx.maanden.length - 1] || null
}

function mtd(idx, ent, maand, veld) {
  return idx.wenv[ent]?.[maand]?.mtd?.[veld] || null
}

function prodVeld(idx, ent, maand, veld) {
  const v = idx.prod[ent]?.[maand]?.[veld]
  return v == null ? null : v
}

function som(blokken) {
  const aanwezig = blokken.filter(Boolean)
  if (!aanwezig.length) return null
  const s = (k) => {
    const vals = aanwezig.map((b) => b[k]).filter((v) => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null
  }
  return { act: s('act'), bud: s('bud'), dBud: s('dBud'), fc: s('fc'), dFc: s('dFc') }
}

// Gewogen gemiddelde over regio's voor productiviteitsmaten op HCC-niveau.
// Weging op directe eigen personeelskosten uit de W&V van dezelfde maand
// (beste beschikbare capaciteitsproxy; er zijn geen FTE-aantallen in de
// bronbestanden). Zonder W&V-data: ongewogen gemiddelde.
export function gewogenProd(idx, maand, veld) {
  const punten = []
  for (const regio of REGIOS) {
    const waarde = prodVeld(idx, regio, maand, veld)
    if (waarde == null) continue
    const gewicht = mtd(idx, regio, maand, 'persEigenDirect')?.act
    punten.push({ waarde, gewicht: gewicht && gewicht > 0 ? gewicht : null })
  }
  if (!punten.length) return null
  const alleGewogen = punten.every((p) => p.gewicht != null)
  if (alleGewogen) {
    const totGewicht = punten.reduce((a, p) => a + p.gewicht, 0)
    return punten.reduce((a, p) => a + p.waarde * p.gewicht, 0) / totGewicht
  }
  return punten.reduce((a, p) => a + p.waarde, 0) / punten.length
}

function prodWaarde(idx, ent, maand, veld) {
  if (ent === HCC) return gewogenProd(idx, maand, veld)
  return prodVeld(idx, ent, maand, veld)
}

// KPI-tegels voor een entiteit en maand. Elke tegel: { id, titel, soort,
// waarde, dBud, dFc, sparkline: [{maand, waarde}] }.
// soort: 'bedrag' | 'pct' | 'punt' | 'uren'
export function kpiTegels(idx, ent, maand) {
  const laatste12 = idx.maanden.filter((m) => m <= maand).slice(-12)

  const bedragTegel = (id, titel, veld) => {
    const blok = mtd(idx, ent, maand, veld)
    return {
      id, titel, soort: 'bedrag',
      waarde: blok?.act ?? null, dBud: blok?.dBud ?? null, dFc: blok?.dFc ?? null,
      sparkline: laatste12.map((m) => ({ maand: m, waarde: mtd(idx, ent, m, veld)?.act ?? null })),
    }
  }
  const pctTegel = (id, titel, veld) => {
    const blok = mtd(idx, ent, maand, veld)
    return {
      id, titel, soort: 'pct',
      waarde: blok?.act ?? null, dBud: blok?.dBud ?? null, dFc: blok?.dFc ?? null,
      sparkline: laatste12.map((m) => ({ maand: m, waarde: mtd(idx, ent, m, veld)?.act ?? null })),
    }
  }
  const somTegel = (id, titel, velden) => {
    const blok = som(velden.map((v) => mtd(idx, ent, maand, v)))
    return {
      id, titel, soort: 'bedrag',
      waarde: blok?.act ?? null, dBud: blok?.dBud ?? null, dFc: blok?.dFc ?? null,
      sparkline: laatste12.map((m) => ({
        maand: m,
        waarde: som(velden.map((v) => mtd(idx, ent, m, v)))?.act ?? null,
      })),
    }
  }
  const prodTegel = (id, titel, veld, soort) => ({
    id, titel, soort,
    waarde: prodWaarde(idx, ent, maand, veld), dBud: null, dFc: null,
    sparkline: laatste12.map((m) => ({ maand: m, waarde: prodWaarde(idx, ent, m, veld) })),
  })

  return [
    bedragTegel('omzet', 'Netto omzet', 'nettoOmzet'),
    bedragTegel('or', 'Operationeel resultaat', 'operationeelResultaat'),
    pctTegel('orPct', 'OR %', 'operationeelResultaatPct'),
    pctTegel('bmPct', 'Bruto marge %', 'brutoMargePct'),
    pctTegel('cmPct', 'Contributiemarge %', 'contributieMargePct'),
    prodTegel('nettoProd', ent === HCC ? 'Netto productiviteit (gewogen)' : 'Netto productiviteit', 'nettoProductiviteit', 'pct'),
    prodTegel('verzuim', 'Verzuimuren per FTE', 'verzuimUren', 'uren'),
    somTegel('inhuur', 'Inhuurkosten', ['persInhuurDirect', 'persInhuurIndirect']),
    somTegel('ikv', 'Interne verrekening saldo', ['persInterneVerrekeningDirect', 'persInterneVerrekeningIndirect']),
  ]
}

// Trendreeksen (max 12 maanden t/m de geselecteerde maand).
export function trendReeksen(idx, ent, maand) {
  const maanden = idx.maanden.filter((m) => m <= maand).slice(-12)
  return maanden.map((m) => {
    const g = (veld) => mtd(idx, ent, m, veld)
    const omzet = g('nettoOmzet')
    const or = g('operationeelResultaat')
    const ikvD = g('persInterneVerrekeningDirect')
    return {
      maand: m,
      omzetAct: omzet?.act ?? null, omzetBud: omzet?.bud ?? null, omzetFc: omzet?.fc ?? null,
      orAct: or?.act ?? null, orBud: or?.bud ?? null, orFc: or?.fc ?? null,
      omzetPreventie: g('omzetPreventie')?.act ?? null,
      omzetVerzuim: g('omzetVerzuim')?.act ?? null,
      omzetInterventie: g('omzetInterventie')?.act ?? null,
      nettoProd: prodWaarde(idx, ent, m, 'nettoProductiviteit'),
      brutoProd: prodWaarde(idx, ent, m, 'brutoProductiviteit'),
      verzuimUren: prodWaarde(idx, ent, m, 'verzuimUren'),
      algemeneUren:
        prodWaarde(idx, ent, m, 'algemeneUrenNorm') != null || prodWaarde(idx, ent, m, 'algemeneUrenBovenNorm') != null
          ? (prodWaarde(idx, ent, m, 'algemeneUrenNorm') ?? 0) + (prodWaarde(idx, ent, m, 'algemeneUrenBovenNorm') ?? 0)
          : null,
      ikvDirect: ikvD?.act ?? null,
    }
  })
}

// Productiviteitsbrug (waterval) voor één regio en maand.
export function productiviteitsBrug(idx, ent, maand) {
  const d = idx.prod[ent]?.[maand]
  if (!d || d.brutoWerkbareUren == null) return null
  const algemeen = (d.algemeneUrenNorm ?? 0) + (d.algemeneUrenBovenNorm ?? 0)
  const productief =
    d.brutoWerkbareUren - (d.feestdagenUren ?? 0) - (d.vakantieUren ?? 0) - (d.verzuimUren ?? 0) - algemeen
  return [
    { naam: 'Bruto', waarde: d.brutoWerkbareUren, type: 'start' },
    { naam: 'Feest', waarde: -(d.feestdagenUren ?? 0), type: 'af' },
    { naam: 'Vakantie', waarde: -(d.vakantieUren ?? 0), type: 'af' },
    { naam: 'Verzuim', waarde: -(d.verzuimUren ?? 0), type: 'af' },
    { naam: 'Alg. norm', waarde: -(d.algemeneUrenNorm ?? 0), type: 'af' },
    { naam: '> norm', waarde: -(d.algemeneUrenBovenNorm ?? 0), type: (d.algemeneUrenBovenNorm ?? 0) > 0 ? 'afRood' : 'af' },
    { naam: 'Productief', waarde: productief, type: 'eind' },
  ]
}

// Regiovergelijking voor de HCC-pagina.
export function regioVergelijking(idx, maand) {
  return REGIOS.map((regio) => {
    const omzet = mtd(idx, regio, maand, 'nettoOmzet')
    const or = mtd(idx, regio, maand, 'operationeelResultaat')
    return {
      regio,
      omzetDFc: omzet?.dFc ?? null,
      omzetDFcPct: omzet?.dFc != null && omzet?.fc ? omzet.dFc / omzet.fc : null,
      orDFc: or?.dFc ?? null,
      nettoProd: prodVeld(idx, regio, maand, 'nettoProductiviteit'),
      algemeneUrenBovenNorm: prodVeld(idx, regio, maand, 'algemeneUrenBovenNorm'),
      verzuimUren: prodVeld(idx, regio, maand, 'verzuimUren'),
    }
  })
}
