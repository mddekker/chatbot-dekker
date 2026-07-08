import * as XLSX from 'xlsx'
import { herkenEntiteit, MAANDNAMEN } from './entities.js'

export const NORM_NETTO_PRODUCTIVITEIT = 0.64
export const NORM_ALGEMENE_UREN = 34.4
export const PLAN_BRUTO_PRODUCTIVITEIT = 0.8362

// De sheet 'Personeel' bevat persoonsgegevens en mag nooit worden gelezen.
export const VERBODEN_SHEETS = ['Personeel']

export function isProductiviteitSheetNaam(naam) {
  return /^Maand prod/i.test(String(naam).trim())
}

function celWaarde(sheet, r, c) {
  const cel = sheet[XLSX.utils.encode_cell({ r, c })]
  return cel ? cel.v : undefined
}

function numeriek(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// Zoek de rij met maandnamen (Januari..December) en de kolom per maand.
function vindMaandKolommen(sheet, rng) {
  for (let r = rng.s.r; r <= rng.e.r; r++) {
    const kolommen = {}
    for (let c = rng.s.c; c <= rng.e.c; c++) {
      const v = celWaarde(sheet, r, c)
      if (typeof v !== 'string') continue
      const idx = MAANDNAMEN.indexOf(v.trim().toLowerCase())
      if (idx >= 0) kolommen[idx + 1] = c
    }
    if (Object.keys(kolommen).length >= 12) return { rij: r, kolommen }
  }
  return null
}

// Zoek een rij op (getrimd) label, optioneel pas vanaf een bepaalde rij.
function vindRij(sheet, rng, label, vanafRij = rng.s.r) {
  for (let r = vanafRij; r <= rng.e.r; r++) {
    for (let c = rng.s.c; c <= Math.min(rng.e.c, rng.s.c + 3); c++) {
      const v = celWaarde(sheet, r, c)
      if (typeof v === 'string' && v.trim() === label) return r
    }
  }
  return -1
}

// Parseer één productiviteitswerkboek (één regio).
// Resultaat: { entiteit, jaar, maanden: { 1: {...}, 2: {...} },
//             waarschuwingen: [..] }
// Per maand: brutoWerkbareUren, feestdagenUren, vakantieUren, verzuimUren,
//            brutoProductiviteit (berekend en zoals gerapporteerd),
//            algemeneUrenNorm, algemeneUrenBovenNorm, nettoProductiviteit.
export function parseProductiviteit(workbook, { bestandsnaam = '' } = {}) {
  const waarschuwingen = []

  const sheetNaam = workbook.SheetNames.find(isProductiviteitSheetNaam)
  if (!sheetNaam) {
    throw new Error("Geen sheet gevonden die begint met 'Maand prod'.")
  }
  const sheet = workbook.Sheets[sheetNaam]
  if (!sheet || !sheet['!ref']) {
    throw new Error(`Sheet '${sheetNaam}' is leeg of kon niet worden gelezen.`)
  }
  const rng = XLSX.utils.decode_range(sheet['!ref'])

  // Regio primair uit de sheetnaam ('Maand prod Zuid West'), anders bestandsnaam.
  const entiteit =
    herkenEntiteit(sheetNaam.replace(/^Maand prod/i, '')) || herkenEntiteit(bestandsnaam)
  if (!entiteit) {
    waarschuwingen.push('Regio niet herkend uit sheet- of bestandsnaam; wijs handmatig toe.')
  }

  // Jaartal uit de bestandsnaam (bv. 'Juni-4 2026'), zuiver een suggestie.
  const jaarMatch = bestandsnaam.match(/\b(20\d{2})\b/)
  const jaar = jaarMatch ? parseInt(jaarMatch[1], 10) : null

  const maandInfo = vindMaandKolommen(sheet, rng)
  if (!maandInfo) {
    throw new Error(`Sheet '${sheetNaam}': geen rij met maandnamen (januari t/m december) gevonden.`)
  }

  // Het Actuals-blok staat onder het label 'Actuals'; alle rijen daaronder
  // op label zoeken zodat verschuivingen in rijnummers geen probleem zijn.
  const actualsRij = vindRij(sheet, rng, 'Actuals', maandInfo.rij)
  const vanaf = actualsRij >= 0 ? actualsRij : maandInfo.rij
  if (actualsRij < 0) {
    waarschuwingen.push(`Sheet '${sheetNaam}': 'Actuals'-label niet gevonden; rijen onder de maandkoppen gebruikt.`)
  }

  const rijen = {
    brutoWerkbareUren: vindRij(sheet, rng, 'Bruto Werkbare uren', vanaf),
    feestdagenUren: vindRij(sheet, rng, 'Feestdagen', vanaf),
    vakantieUren: vindRij(sheet, rng, 'Vakantie dagen', vanaf),
    verzuimUren: vindRij(sheet, rng, 'Verzuim', vanaf),
    brutoProductiviteit: vindRij(sheet, rng, 'Bruto norm "productiviteit"', vanaf),
    algemeneUrenNorm: vindRij(sheet, rng, 'Alg niet Productief norm', vanaf),
    algemeneUrenBovenNorm: vindRij(sheet, rng, 'Afwijking norm niet prod', vanaf),
    nettoProductiviteit: vindRij(sheet, rng, 'Productief', vanaf),
  }

  for (const [veld, rij] of Object.entries(rijen)) {
    if (rij < 0) waarschuwingen.push(`Sheet '${sheetNaam}': rij '${veld}' niet gevonden.`)
  }

  const maanden = {}
  for (const [maandStr, kolom] of Object.entries(maandInfo.kolommen)) {
    const maand = parseInt(maandStr, 10)
    const lees = (veld) => (rijen[veld] >= 0 ? numeriek(celWaarde(sheet, rijen[veld], kolom)) : null)

    const bruto = lees('brutoWerkbareUren')
    const feest = lees('feestdagenUren')
    const vakantie = lees('vakantieUren')
    const verzuim = lees('verzuimUren')

    // Bruto productiviteit afgeleid: (werkbaar - feest - vakantie - verzuim) / werkbaar.
    let brutoProductiviteit = lees('brutoProductiviteit')
    if (brutoProductiviteit == null && bruto && feest != null && vakantie != null && verzuim != null) {
      brutoProductiviteit = (bruto - feest - vakantie - verzuim) / bruto
    }

    maanden[maand] = {
      brutoWerkbareUren: bruto,
      feestdagenUren: feest,
      vakantieUren: vakantie,
      verzuimUren: verzuim,
      brutoProductiviteit,
      algemeneUrenNorm: lees('algemeneUrenNorm'),
      algemeneUrenBovenNorm: lees('algemeneUrenBovenNorm'),
      nettoProductiviteit: lees('nettoProductiviteit'),
    }
  }

  // Maanden waar de saldering ('Afwijking norm niet prod') is ingevuld zijn de
  // echte actuals; latere maanden bevatten planwaarden. Dit bepaalt de
  // voorgestelde rapportagemaand.
  const actueleMaanden = Object.entries(maanden)
    .filter(([, d]) => d.algemeneUrenBovenNorm != null)
    .map(([m]) => parseInt(m, 10))
  const laatsteActueleMaand = actueleMaanden.length ? Math.max(...actueleMaanden) : null

  return { entiteit, jaar, sheetNaam, maanden, laatsteActueleMaand, waarschuwingen }
}
