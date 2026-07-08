// Nederlandse notatie: bedragen in K, percentages met één decimaal.

const nlNum = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 })
const nlPct = new Intl.NumberFormat('nl-NL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function fmtK(bedrag, { plus = false } = {}) {
  if (bedrag == null || Number.isNaN(bedrag)) return '–'
  const k = bedrag / 1000
  const afgerond = Math.round(k)
  const teken = plus && afgerond > 0 ? '+' : ''
  return `${teken}${nlNum.format(afgerond)}K`
}

export function fmtPct(fractie, { plus = false } = {}) {
  if (fractie == null || Number.isNaN(fractie)) return '–'
  const v = fractie * 100
  const teken = plus && v > 0 ? '+' : ''
  return `${teken}${nlPct.format(v)}%`
}

// Voor delta's in procentpunten (bv. marge% ACT − marge% BUD).
export function fmtPunt(fractie, { plus = true } = {}) {
  if (fractie == null || Number.isNaN(fractie)) return '–'
  const v = fractie * 100
  const teken = plus && v > 0 ? '+' : ''
  return `${teken}${nlPct.format(v)} pt`
}

export function fmtUren(uren, { plus = false } = {}) {
  if (uren == null || Number.isNaN(uren)) return '–'
  const teken = plus && uren > 0 ? '+' : ''
  return `${teken}${new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(uren)} u`
}
