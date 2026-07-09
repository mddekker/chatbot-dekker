import { fmtK, fmtPct, fmtPunt, fmtUren } from '../lib/format.js'
import { NORM_NETTO_PRODUCTIVITEIT } from '../lib/parseProductiviteit.js'
import { Sparkline } from './Charts.jsx'

function waarde(tegel) {
  if (tegel.waarde == null) return '–'
  if (tegel.soort === 'pct') return fmtPct(tegel.waarde)
  if (tegel.soort === 'uren') return fmtUren(tegel.waarde)
  return fmtK(tegel.waarde)
}

// Bij kosten-KPI's is lager juist beter.
const KOSTEN_TEGELS = new Set(['inhuur', 'verzuim'])

function deltaGoed(tegel, v) {
  return KOSTEN_TEGELS.has(tegel.id) ? v < 0 : v > 0
}

// Statuskleur van de hele tegel: sneller overzicht dan alleen de delta's.
function tegelStatus(t) {
  if (t.id === 'nettoProd') {
    if (t.waarde == null) return 'neutraal'
    const gat = t.waarde - NORM_NETTO_PRODUCTIVITEIT
    return gat >= 0 ? 'goed' : gat > -0.05 ? 'matig' : 'slecht'
  }
  const d = t.dFc ?? t.dBud
  if (d == null || t.waarde == null) return 'neutraal'
  const referentie = t.soort === 'pct' ? 0.005 : Math.abs(t.waarde) * 0.01
  if (Math.abs(d) <= referentie) return 'matig'
  return deltaGoed(t, d) ? 'goed' : 'slecht'
}

function Delta({ tegel, veld, label }) {
  const v = tegel[veld]
  if (v == null) return null
  const tekst = tegel.soort === 'pct' ? fmtPunt(v) : tegel.soort === 'uren' ? fmtUren(v, { plus: true }) : fmtK(v, { plus: true })
  return (
    <span className={`delta-pil ${deltaGoed(tegel, v) ? 'goed' : 'slecht'}`}>
      {label} {tekst}
    </span>
  )
}

export default function KpiTiles({ tegels }) {
  return (
    <div className="kpi-grid">
      {tegels.map((t) => (
        <div className={`kpi-tegel status-${tegelStatus(t)}`} key={t.id}>
          <span className="kpi-titel">{t.titel}</span>
          <span className="kpi-waarde">{waarde(t)}</span>
          <span className="kpi-deltas">
            <Delta tegel={t} veld="dBud" label="BUD" />
            <Delta tegel={t} veld="dFc" label="FC" />
            {t.dBud == null && t.dFc == null && <span className="delta-pil neutraal">geen budget/forecast</span>}
          </span>
          <Sparkline punten={t.sparkline} />
        </div>
      ))}
    </div>
  )
}
