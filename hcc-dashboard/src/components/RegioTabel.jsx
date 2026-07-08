import { useMemo, useState } from 'react'
import { entiteitLabel } from '../lib/entities.js'
import { fmtK, fmtPct, fmtUren } from '../lib/format.js'
import { NORM_NETTO_PRODUCTIVITEIT } from '../lib/parseProductiviteit.js'

const KOLOMMEN = [
  { key: 'omzetDFc', label: 'Omzet ΔFC', fmt: (v) => fmtK(v, { plus: true }) },
  { key: 'orDFc', label: 'OR ΔFC', fmt: (v) => fmtK(v, { plus: true }) },
  { key: 'nettoProd', label: 'Netto prod.', fmt: fmtPct },
  { key: 'algemeneUrenBovenNorm', label: 'Alg. uren > norm', fmt: (v) => fmtUren(v, { plus: true }) },
  { key: 'verzuimUren', label: 'Verzuim p/FTE', fmt: fmtUren },
]

// Conditionele opmaak per kolom: groen / oranje / rood.
function celKlasse(key, v, rijen) {
  if (v == null) return ''
  switch (key) {
    case 'omzetDFc':
    case 'orDFc': {
      // Relatief aan de spreiding: >0 groen, lichte miss oranje, grote miss rood.
      const ergste = Math.min(...rijen.map((r) => r[key]).filter((x) => x != null))
      if (v >= 0) return 'cel-goed'
      return ergste < 0 && v <= ergste * 0.5 ? 'cel-rood' : 'cel-oranje'
    }
    case 'nettoProd': {
      const gat = v - NORM_NETTO_PRODUCTIVITEIT
      if (gat >= 0) return 'cel-goed'
      return gat < -0.05 ? 'cel-rood' : 'cel-oranje'
    }
    case 'algemeneUrenBovenNorm':
      if (v <= 0) return 'cel-goed'
      return v > 8 ? 'cel-rood' : 'cel-oranje'
    case 'verzuimUren': {
      const waarden = rijen.map((r) => r.verzuimUren).filter((x) => x != null)
      const gem = waarden.reduce((a, b) => a + b, 0) / (waarden.length || 1)
      if (v <= gem) return 'cel-goed'
      return v > gem * 1.25 ? 'cel-rood' : 'cel-oranje'
    }
    default:
      return ''
  }
}

export default function RegioTabel({ rijen }) {
  const [sortering, setSortering] = useState({ key: 'orDFc', richting: 1 })

  const gesorteerd = useMemo(() => {
    const kopie = [...rijen]
    kopie.sort((a, b) => {
      const va = a[sortering.key]
      const vb = b[sortering.key]
      if (va == null) return 1
      if (vb == null) return -1
      return (va - vb) * sortering.richting
    })
    return kopie
  }, [rijen, sortering])

  const sorteer = (key) =>
    setSortering((s) => ({ key, richting: s.key === key ? -s.richting : 1 }))

  return (
    <div className="tabel-kaart">
      <table className="vergelijk">
        <thead>
          <tr>
            <th onClick={() => sorteer('regio')}>Regio</th>
            {KOLOMMEN.map((k) => (
              <th key={k.key} onClick={() => sorteer(k.key)}>
                {k.label}{sortering.key === k.key ? (sortering.richting === 1 ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gesorteerd.map((rij) => (
            <tr key={rij.regio}>
              <td>{entiteitLabel(rij.regio)}</td>
              {KOLOMMEN.map((k) => (
                <td key={k.key} className={celKlasse(k.key, rij[k.key], rijen)}>
                  {rij[k.key] == null ? '–' : k.fmt(rij[k.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
