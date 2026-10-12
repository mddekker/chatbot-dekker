import * as XLSX from 'xlsx'
import { herkenEntiteit } from './entities.js'

// Parser voor de forecastbestanden (bv. 'HCC Forecast 3 definitief.xlsx').
// Per entiteit een sheet met 12 maandkolommen (status 'Realisatie' of
// 'Forecast' per maand), een FC-jaartotaal en vergelijkingskolommen met
// eerdere forecastversies en het jaarbudget (B2026). Bedragen in euro's,
// kosten positief — zelfde conventies als de oorspronkelijke W&V.

const NL_MAAND_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

const FORECAST_VELDEN = {
  'Netto omzet': 'nettoOmzet',
  'Bruto marge': 'brutoMarge',
  'Contributiemarge': 'contributieMarge',
  'Operationeel resultaat': 'operationeelResultaat',
}

function celWaarde(sheet, r, c) {
  const cel = sheet[XLSX.utils.encode_cell({ r, c })]
  return cel ? cel.v : undefined
}

function numeriek(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// Herkent een forecastbestand aan de sheetnamen (FC2, FC3, 'FC3 analyse', ...).
export function isForecastWerkboek(sheetNamen) {
  return sheetNamen.some((n) => /\bFC\s*\d\b/i.test(n) || /^B20\d{2}$/i.test(n.trim()))
}

function parseForecastSheet(sheet) {
  if (!sheet || !sheet['!ref']) return null
  const rng = XLSX.utils.decode_range(sheet['!ref'])
  const maxKopRij = Math.min(rng.e.r, 14)

  // Maandkolommen (Jan..Dec, Nederlandse afkortingen).
  let maandRij = -1
  let maandKolommen = null
  for (let r = rng.s.r; r <= maxKopRij; r++) {
    const kolommen = {}
    for (let c = rng.s.c; c <= rng.e.c; c++) {
      const v = celWaarde(sheet, r, c)
      if (typeof v !== 'string') continue
      const idx = NL_MAAND_KORT.indexOf(v.trim().toLowerCase())
      if (idx >= 0) kolommen[idx + 1] = c
    }
    if (Object.keys(kolommen).length >= 12) {
      maandRij = r
      maandKolommen = kolommen
      break
    }
  }
  if (!maandKolommen) return null

  // Versie ('FC3') en de totaal-/budgetkolommen staan op de rij erboven.
  const versieRij = maandRij - 1
  let versie = null
  let jaarTotaalKolom = -1
  let budgetKolom = -1
  for (let c = rng.s.c; c <= rng.e.c; c++) {
    const v = celWaarde(sheet, versieRij, c)
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (/^FC\d$/i.test(t)) {
      if (c <= maandKolommen[1]) versie = t.toUpperCase()
      else if (versie && t.toUpperCase() === versie) jaarTotaalKolom = c
    } else if (/^B20\d{2}$/i.test(t)) {
      budgetKolom = c
    }
  }
  if (!versie) return null

  // Status per maand (Realisatie/Forecast) staat in dezelfde versierij.
  const statusPerMaand = {}
  for (const [m, c] of Object.entries(maandKolommen)) {
    const v = celWaarde(sheet, versieRij, c)
    statusPerMaand[m] = typeof v === 'string' && /forecast/i.test(v) ? 'forecast' : 'realisatie'
  }

  // Jaar uit de maandrij (bv. '2026' links van Jan).
  let jaar = null
  for (let c = rng.s.c; c < maandKolommen[1]; c++) {
    const v = celWaarde(sheet, maandRij, c)
    const m = String(v ?? '').match(/^(20\d{2})$/)
    if (m) jaar = parseInt(m[1], 10)
  }

  // Entiteit uit de koptekst met kostenplaatscode, bv. '(6.N2.MIDDEN) MIDDEN'.
  let entiteit = null
  for (let r = rng.s.r; r <= maxKopRij && !entiteit; r++) {
    for (let c = rng.s.c; c <= Math.min(rng.e.c, 6); c++) {
      const v = celWaarde(sheet, r, c)
      if (typeof v === 'string' && /^\(6\./.test(v.trim())) {
        entiteit = herkenEntiteit(v)
        break
      }
    }
  }

  // Labelkolom: de kolom met 'Netto omzet'.
  let labelKolom = -1
  for (let c = rng.s.c; c < maandKolommen[1] && labelKolom < 0; c++) {
    for (let r = maandRij; r <= rng.e.r; r++) {
      const v = celWaarde(sheet, r, c)
      if (typeof v === 'string' && v.trim() === 'Netto omzet') {
        labelKolom = c
        break
      }
    }
  }
  if (labelKolom < 0) return null

  const maanden = {}
  for (const [m] of Object.entries(maandKolommen)) {
    maanden[m] = { status: statusPerMaand[m] }
  }
  const jaarTotaal = {}
  const budgetJaar = {}
  for (let r = maandRij; r <= rng.e.r; r++) {
    const label = celWaarde(sheet, r, labelKolom)
    if (typeof label !== 'string') continue
    const veld = FORECAST_VELDEN[label.trim()]
    if (!veld) continue
    for (const [m, c] of Object.entries(maandKolommen)) {
      if (maanden[m][veld] === undefined) maanden[m][veld] = numeriek(celWaarde(sheet, r, c))
    }
    if (jaarTotaalKolom >= 0 && jaarTotaal[veld] === undefined) {
      jaarTotaal[veld] = numeriek(celWaarde(sheet, r, jaarTotaalKolom))
    }
    if (budgetKolom >= 0 && budgetJaar[veld] === undefined) {
      budgetJaar[veld] = numeriek(celWaarde(sheet, r, budgetKolom))
    }
  }

  const forecastMaanden = Object.entries(statusPerMaand)
    .filter(([, s]) => s === 'forecast')
    .map(([m]) => parseInt(m, 10))

  return {
    versie,
    jaar,
    entiteit,
    eersteForecastMaand: forecastMaanden.length ? Math.min(...forecastMaanden) : null,
    maanden,
    jaarTotaal,
    budgetJaar,
  }
}

// Hoofd-ingang: parseer een forecastwerkboek. Per entiteit wordt de hoogste
// FC-versie gebruikt (het bestand bevat vaak ook de vorige versie als sheet);
// 'analyse'-sheets met toelichting worden overgeslagen.
export function parseForecast(workbook) {
  const waarschuwingen = []
  const perEntiteit = {}
  let hoofdversie = null
  let jaar = null
  let eersteForecastMaand = null

  for (const naam of workbook.SheetNames) {
    if (/analyse/i.test(naam)) continue
    const res = parseForecastSheet(workbook.Sheets[naam])
    if (!res) continue
    if (!res.entiteit) {
      waarschuwingen.push(`Sheet '${naam}': entiteit niet herkend, overgeslagen.`)
      continue
    }
    const bestaand = perEntiteit[res.entiteit]
    if (!bestaand || res.versie > bestaand.versie) {
      perEntiteit[res.entiteit] = res
    }
  }

  if (!Object.keys(perEntiteit).length) {
    throw new Error('Geen forecaststructuur herkend (geen sheets met maandkolommen en een FC-versie).')
  }

  for (const res of Object.values(perEntiteit)) {
    if (!hoofdversie || res.versie > hoofdversie) hoofdversie = res.versie
    if (res.jaar) jaar = res.jaar
    if (res.eersteForecastMaand) eersteForecastMaand = res.eersteForecastMaand
  }
  // Alleen de sheets van de hoofdversie meenemen (FC2-totaalsheet valt af).
  const entiteiten = {}
  for (const [ent, res] of Object.entries(perEntiteit)) {
    if (res.versie === hoofdversie) {
      entiteiten[ent] = {
        maanden: res.maanden,
        jaarTotaal: res.jaarTotaal,
        budgetJaar: res.budgetJaar,
      }
    }
  }

  if (!eersteForecastMaand) {
    waarschuwingen.push('Geen maanden met status Forecast gevonden; is dit een afgerond jaar?')
  }

  return { versie: hoofdversie, jaar, eersteForecastMaand, entiteiten, waarschuwingen }
}
