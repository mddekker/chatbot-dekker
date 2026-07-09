// Canonieke entiteitsnamen zoals ze in de W&V-headers staan.
export const REGIOS = [
  'MIDDEN',
  'NOORDOOST',
  'NOORDWEST',
  'WEST',
  'ZUID',
  'ZUIDOOST',
  'ZUIDWEST',
]

export const STAF = 'STAF'
export const HCC = 'HCC'

export const ALLE_ENTITEITEN = [...REGIOS, STAF, HCC]

const REGIO_LABELS = {
  MIDDEN: 'Midden',
  NOORDOOST: 'Noordoost',
  NOORDWEST: 'Noordwest',
  WEST: 'West',
  ZUID: 'Zuid',
  ZUIDOOST: 'Zuidoost',
  ZUIDWEST: 'Zuidwest',
  STAF: 'Staf',
  HCC: 'HCC totaal',
}

export function entiteitLabel(ent) {
  return REGIO_LABELS[ent] || ent
}

// Normaliseer een vrije string (bestandsnaam, sheetnaam, kolomkop) naar een
// canonieke entiteit. Samengestelde namen eerst, anders matcht "Zuid" ook
// "Zuid-Oost".
export function herkenEntiteit(str) {
  if (!str) return null
  const s = String(str).toUpperCase().replace(/[^A-Z]/g, '')
  if (s.includes('HUMANCAPITALCARE')) return HCC
  for (const kandidaat of ['NOORDOOST', 'NOORDWEST', 'ZUIDOOST', 'ZUIDWEST']) {
    if (s.includes(kandidaat)) return kandidaat
  }
  for (const kandidaat of ['MIDDEN', 'WEST', 'ZUID', 'STAF']) {
    if (s.includes(kandidaat)) return kandidaat
  }
  return null
}

export const MAANDNAMEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

export function maandLabel(maandIso) {
  // '2026-06-01' of '2026-06' -> 'juni 2026'
  const [jaar, mnd] = String(maandIso).split('-')
  const idx = parseInt(mnd, 10) - 1
  if (idx < 0 || idx > 11) return String(maandIso)
  return `${MAANDNAMEN[idx]} ${jaar}`
}

export function maandIso(jaar, maandNummer) {
  return `${jaar}-${String(maandNummer).padStart(2, '0')}-01`
}
