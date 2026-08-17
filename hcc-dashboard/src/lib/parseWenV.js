import * as XLSX from 'xlsx'
import { herkenEntiteit, HCC } from './entities.js'

// Mapping van exacte rijlabels (getrimd) naar veldnamen in de snapshot-data.
// Volgorde en duplicaten worden apart afgehandeld (zie hieronder).
const LABEL_VELDEN = {
  'Omzet preventie': 'omzetPreventie',
  'Omzet verzuimbegeleiding': 'omzetVerzuim',
  'Omzet arbeidsinterventie & re-integratie': 'omzetInterventie',
  'Omzet overige': 'omzetOverige',
  'Netto omzet': 'nettoOmzet',
  'Inkoop': 'inkoop',
  'Personeel - eigen (D)': 'persEigenDirect',
  'Personeel - interne verrekening (D)': 'persInterneVerrekeningDirect',
  'Personeel - inhuur (D)': 'persInhuurDirect',
  'Personeel - mobiliteit (D)': 'persMobiliteitDirect',
  'Personeel - overig (D)': 'persOverigDirect',
  'Personeelskosten - direct': 'persKostenDirect',
  'Bruto marge': 'brutoMarge',
  'Bruto marge %': 'brutoMargePct',
  'Personeel - eigen': 'persEigenIndirect',
  'Personeel - interne verrekening': 'persInterneVerrekeningIndirect',
  'Personeel - inhuur': 'persInhuurIndirect',
  'Personeel - mobiliteit': 'persMobiliteitIndirect',
  'Personeel - overig': 'persOverigIndirect',
  'Personeelskosten - indirect': 'persKostenIndirect',
  'Contributiemarge': 'contributieMarge',
  'Contributie marge %': 'contributieMargePct',
  'Huisvestingskosten': 'huisvesting',
  'Automatiseringskosten': 'automatisering',
  'Verkoopkosten': 'verkoop',
  // 'Algemene kosten' komt twee keer voor: eerste = subregel, laatste = totaal.
  'Operationeel resultaat': 'operationeelResultaat',
  'Operationeel resultaat %': 'operationeelResultaatPct',
}

function celWaarde(sheet, r, c) {
  const cel = sheet[XLSX.utils.encode_cell({ r, c })]
  return cel ? cel.v : undefined
}

function bereik(sheet) {
  return sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null
}

// Zoek de headerrij met entiteitsnamen en geef per entiteit de startkolom
// van het 5-koloms blok (ACT, BUD, ΔBUD, FC, ΔFC). Alleen cellen die exact
// een entiteitsnaam zijn tellen mee, zodat titels als 'HCC P6 MTD' of
// regels als 'Midden indirect' geen valse kolomkoppen opleveren.
const EXACTE_KOLOMNAMEN = new Set([
  'MIDDEN', 'NOORDOOST', 'NOORDWEST', 'WEST', 'ZUID', 'ZUIDOOST', 'ZUIDWEST',
  'STAF', 'HCC', 'HCCTOTAAL', 'HUMANCAPITALCARE',
])

function vindEntiteitBlokken(sheet) {
  const rng = bereik(sheet)
  if (!rng) return { blokken: [], headerRij: -1 }
  const maxRij = Math.min(rng.e.r, 9)
  for (let r = rng.s.r; r <= maxRij; r++) {
    const blokken = []
    for (let c = rng.s.c; c <= rng.e.c; c++) {
      const v = celWaarde(sheet, r, c)
      if (typeof v !== 'string') continue
      const kaal = v.toUpperCase().replace(/[^A-Z]/g, '')
      if (!EXACTE_KOLOMNAMEN.has(kaal)) continue
      const ent = herkenEntiteit(v)
      if (ent) blokken.push({ entiteit: ent, kolom: c })
    }
    if (blokken.length > 0) return { blokken, headerRij: r }
  }
  return { blokken: [], headerRij: -1 }
}

// Zoek de kolom waarin de rijlabels staan (de kolom met 'Netto omzet').
function vindLabelKolom(sheet) {
  const rng = bereik(sheet)
  if (!rng) return -1
  for (let c = rng.s.c; c <= rng.e.c; c++) {
    for (let r = rng.s.r; r <= rng.e.r; r++) {
      const v = celWaarde(sheet, r, c)
      if (typeof v === 'string' && v.trim() === 'Netto omzet') return c
    }
  }
  return -1
}

// Periode uit een cel als 'HCC P6 MTD' -> { periode: 6, soort: 'MTD' }.
function vindPeriode(sheet) {
  const rng = bereik(sheet)
  if (!rng) return null
  const maxRij = Math.min(rng.e.r, 4)
  for (let r = rng.s.r; r <= maxRij; r++) {
    for (let c = rng.s.c; c <= rng.e.c; c++) {
      const v = celWaarde(sheet, r, c)
      if (typeof v !== 'string') continue
      const m = v.match(/P(\d{1,2})\s+(MTD|YTD)/i)
      if (m) return { periode: parseInt(m[1], 10), soort: m[2].toUpperCase() }
    }
  }
  return null
}

function numeriek(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// Parseer één sheet: per entiteit een object { veld: {act,bud,dBud,fc,dFc} }.
function parseSheet(sheet) {
  const { blokken } = vindEntiteitBlokken(sheet)
  const labelKolom = vindLabelKolom(sheet)
  const rng = bereik(sheet)
  if (!blokken.length || labelKolom < 0 || !rng) return null

  const perEntiteit = {}
  for (const { entiteit } of blokken) perEntiteit[entiteit] = {}

  // Verzamel alle rijen met een bekend label; 'Algemene kosten' twee keer.
  const algemeneKostenRijen = []
  for (let r = rng.s.r; r <= rng.e.r; r++) {
    const label = celWaarde(sheet, r, labelKolom)
    if (typeof label !== 'string') continue
    const key = label.trim()
    if (key === 'Algemene kosten') {
      algemeneKostenRijen.push(r)
      continue
    }
    const veld = LABEL_VELDEN[key]
    if (!veld) continue
    for (const { entiteit, kolom } of blokken) {
      // Sla niet over als het veld al bestaat: labels als 'Personeel - eigen'
      // zijn uniek zolang de (D)-variant exact gematcht wordt.
      if (perEntiteit[entiteit][veld] !== undefined) continue
      perEntiteit[entiteit][veld] = leesBlok(sheet, r, kolom)
    }
  }

  // Subregel = eerste occurrence, totaal = laatste occurrence.
  if (algemeneKostenRijen.length) {
    const subRij = algemeneKostenRijen[0]
    const totaalRij = algemeneKostenRijen[algemeneKostenRijen.length - 1]
    for (const { entiteit, kolom } of blokken) {
      if (algemeneKostenRijen.length > 1) {
        perEntiteit[entiteit].algemeneKostenSub = leesBlok(sheet, subRij, kolom)
      }
      perEntiteit[entiteit].algemeneKosten = leesBlok(sheet, totaalRij, kolom)
    }
  }

  return { perEntiteit, periode: vindPeriode(sheet) }
}

function leesBlok(sheet, rij, startKolom) {
  return {
    act: numeriek(celWaarde(sheet, rij, startKolom)),
    bud: numeriek(celWaarde(sheet, rij, startKolom + 1)),
    dBud: numeriek(celWaarde(sheet, rij, startKolom + 2)),
    fc: numeriek(celWaarde(sheet, rij, startKolom + 3)),
    dFc: numeriek(celWaarde(sheet, rij, startKolom + 4)),
  }
}

// ── Nieuw rapportageformat (bv. 'HCC Cijfers P7-2026.xlsx') ──────────────────
// Zelfde 5-kolomsblokken per entiteit (Actuals, Budget, ∆, Forecast, ∆), maar:
// bedragen in duizenden, kosten als negatieve getallen, labels in kolom B/C en
// percentages op de regel ónder de marge. Alles wordt hier omgerekend naar het
// bestaande datamodel (euro's, kosten positief).

const EN_MAANDEN = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }

// [veld, isKostenregel]
const NIEUW_LABELS = {
  'Omzet preventie': ['omzetPreventie', false],
  'Omzet verzuimbegeleiding': ['omzetVerzuim', false],
  'Omzet arbeidsinterventie & re-integratie': ['omzetInterventie', false],
  'Omzet overige': ['omzetOverige', false],
  'Totale omzet': ['nettoOmzet', false],
  'Inkoop': ['inkoop', true],
  'Personeel - eigen - DIRECT': ['persEigenDirect', true],
  'Personeel - interne verrekening - DIRECT': ['persInterneVerrekeningDirect', true],
  'Personeel - inhuur - DIRECT': ['persInhuurDirect', true],
  'Personeel - mobiliteit - DIRECT': ['persMobiliteitDirect', true],
  'Personeel - overig - DIRECT': ['persOverigDirect', true],
  'Totale personeelskn direct': ['persKostenDirect', true],
  'Bruto marge': ['brutoMarge', false],
  'Personeel - eigen - INDIRECT': ['persEigenIndirect', true],
  'Personeel - interne verrekening - INDIRECT': ['persInterneVerrekeningIndirect', true],
  'Personeel - inhuur - INDIRECT': ['persInhuurIndirect', true],
  'Personeel - mobiliteit - INDIRECT': ['persMobiliteitIndirect', true],
  'Personeel - overig - INDIRECT': ['persOverigIndirect', true],
  'Totale personeelskn indirect': ['persKostenIndirect', true],
  'Contributiemarge': ['contributieMarge', false],
  'Huisvestingskosten': ['huisvesting', true],
  'Automatiseringskosten': ['automatisering', true],
  'Verkoopkosten': ['verkoop', true],
  'Algemene kosten': ['algemeneKostenSub', true],
  'Totaal algemene kosten': ['algemeneKosten', true],
  'Operationeel resultaat': ['operationeelResultaat', false],
}

// Marges hebben op de regel eronder hun percentage (als fractie).
const NIEUW_PCT_VELDEN = {
  brutoMarge: 'brutoMargePct',
  contributieMarge: 'contributieMargePct',
  operationeelResultaat: 'operationeelResultaatPct',
}

// Titel als 'Actuals-Jul-2026' of 'Actuals YtD-Jul-2026'.
function vindNieuweTitel(sheet) {
  const rng = bereik(sheet)
  if (!rng) return null
  for (let r = rng.s.r; r <= Math.min(rng.e.r, 4); r++) {
    for (let c = rng.s.c; c <= Math.min(rng.e.c, 6); c++) {
      const v = celWaarde(sheet, r, c)
      if (typeof v !== 'string') continue
      const m = v.match(/Actuals\s*(YtD)?\s*-\s*([A-Za-z]{3})[a-z]*\s*-\s*(20\d{2})/i)
      if (m) {
        return {
          soort: m[1] ? 'YTD' : 'MTD',
          periode: EN_MAANDEN[m[2].toLowerCase()] ?? null,
          jaar: parseInt(m[3], 10),
        }
      }
    }
  }
  return null
}

function parseSheetNieuw(sheet) {
  const { blokken } = vindEntiteitBlokken(sheet)
  const rng = bereik(sheet)
  if (!blokken.length || !rng) return null

  const perEntiteit = {}
  for (const { entiteit } of blokken) perEntiteit[entiteit] = {}

  const transformeer = (blok, kosten) => {
    const f = (v) => (v == null ? null : (kosten ? -v : v) * 1000)
    return { act: f(blok.act), bud: f(blok.bud), dBud: f(blok.dBud), fc: f(blok.fc), dFc: f(blok.dFc) }
  }

  let gevonden = 0
  for (let r = rng.s.r; r <= rng.e.r; r++) {
    // Detailregels hebben het label in kolom C, totaalregels in kolom B.
    const labelC = celWaarde(sheet, r, 2)
    const labelB = celWaarde(sheet, r, 1)
    const label = typeof labelC === 'string' ? labelC.trim() : typeof labelB === 'string' ? labelB.trim() : null
    if (!label || !NIEUW_LABELS[label]) continue
    const [veld, kosten] = NIEUW_LABELS[label]
    for (const { entiteit, kolom } of blokken) {
      if (perEntiteit[entiteit][veld] !== undefined) continue
      perEntiteit[entiteit][veld] = transformeer(leesBlok(sheet, r, kolom), kosten)
      const pctVeld = NIEUW_PCT_VELDEN[veld]
      if (pctVeld) {
        // Percentages staan één regel lager, als fractie en zonder schaal;
        // de ∆-kolommen zijn daar leeg, dus die rekenen we zelf uit.
        const pct = leesBlok(sheet, r + 1, kolom)
        if (pct.dBud == null && pct.act != null && pct.bud != null) pct.dBud = pct.act - pct.bud
        if (pct.dFc == null && pct.act != null && pct.fc != null) pct.dFc = pct.act - pct.fc
        perEntiteit[entiteit][pctVeld] = pct
      }
    }
    gevonden++
  }
  if (!gevonden) return null

  const titel = vindNieuweTitel(sheet)
  return {
    perEntiteit,
    periode: titel ? { periode: titel.periode, soort: titel.soort } : vindPeriode(sheet),
    jaar: titel?.jaar ?? null,
  }
}

// Hoofd-ingang: parseer een compleet W&V-werkboek.
// Resultaat: { periode, entiteiten: { MIDDEN: {mtd:{...}, ytd:{...}}, ... },
//             waarschuwingen: [..] }
export function parseWenV(workbook) {
  const waarschuwingen = []
  const entiteiten = {}
  let periode = null
  let jaar = null

  for (const naam of workbook.SheetNames) {
    const sheet = workbook.Sheets[naam]
    if (!sheet) continue
    // Eerst het oorspronkelijke format proberen, daarna het nieuwe.
    const res = parseSheet(sheet) ?? parseSheetNieuw(sheet)
    if (!res) continue
    if (res.jaar) jaar = res.jaar
    const soort = res.periode?.soort || (/(YTD)/i.test(naam) ? 'YTD' : /(MTD)/i.test(naam) ? 'MTD' : null)
    if (!soort) {
      waarschuwingen.push(`Sheet '${naam}': MTD/YTD niet herkend, overgeslagen.`)
      continue
    }
    if (res.periode?.periode) periode = res.periode.periode
    const sleutel = soort.toLowerCase()
    for (const [ent, velden] of Object.entries(res.perEntiteit)) {
      if (!Object.keys(velden).length) continue
      entiteiten[ent] = entiteiten[ent] || {}
      // Een sheet met méér entiteiten (per-regio) wint van een totaalsheet
      // met alleen HCC; anders eerste resultaat laten staan.
      if (!entiteiten[ent][sleutel]) entiteiten[ent][sleutel] = velden
    }
  }

  if (!Object.keys(entiteiten).length) {
    throw new Error('Geen W&V-structuur herkend: geen entiteitsblokken of rijlabels gevonden.')
  }
  if (!entiteiten[HCC]) {
    waarschuwingen.push('HCC-totaal niet gevonden in het bestand.')
  }
  if (!periode) {
    waarschuwingen.push("Periode (bv. 'P6') niet gevonden in de sheetkoppen; kies de maand handmatig.")
  }

  return { periode, jaar, entiteiten, waarschuwingen }
}

// Aansluitcontrole: HCC-totaal versus som regio's + STAF, tolerantie in euro's.
export function controleerAansluiting(entiteiten, { tolerantie = 1000 } = {}) {
  const meldingen = []
  const hcc = entiteiten[HCC]
  if (!hcc) return meldingen
  for (const soort of ['mtd', 'ytd']) {
    for (const veld of ['nettoOmzet', 'operationeelResultaat']) {
      const totaal = hcc[soort]?.[veld]?.act
      if (totaal == null) continue
      let som = 0
      let n = 0
      for (const [ent, data] of Object.entries(entiteiten)) {
        if (ent === HCC) continue
        const v = data[soort]?.[veld]?.act
        if (v != null) {
          som += v
          n++
        }
      }
      if (!n) continue
      const verschil = totaal - som
      if (Math.abs(verschil) > tolerantie) {
        meldingen.push(
          `${soort.toUpperCase()} ${veld === 'nettoOmzet' ? 'Netto omzet' : 'Operationeel resultaat'}: ` +
          `HCC-totaal wijkt ${Math.round(verschil / 1000)}K af van de som van regio's + staf.`
        )
      }
    }
  }
  return meldingen
}
