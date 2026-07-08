import { fmtK, fmtPct, fmtPunt, fmtUren } from '../lib/format.js'
import { Sparkline } from './Charts.jsx'

function waarde(tegel) {
  if (tegel.waarde == null) return '–'
  if (tegel.soort === 'pct') return fmtPct(tegel.waarde)
  if (tegel.soort === 'uren') return fmtUren(tegel.waarde)
  return fmtK(tegel.waarde)
}

function delta(tegel, veld) {
  const v = tegel[veld]
  if (v == null) return null
  const tekst = tegel.soort === 'pct' ? fmtPunt(v) : tegel.soort === 'uren' ? fmtUren(v, { plus: true }) : fmtK(v, { plus: true })
  // Voor kosten-KPI's is hoger niet beter, maar de delta zelf blijft feitelijk;
  // kleuring: positief = groen behalve bij kosten-tegels.
  const kostenTegel = tegel.id === 'inhuur' || tegel.id === 'verzuim'
  const goed = kostenTegel ? v < 0 : v > 0
  return <b className={goed ? 'delta-goed' : 'delta-slecht'}>{tekst}</b>
}

export default function KpiTiles({ tegels }) {
  return (
    <div className="kpi-grid">
      {tegels.map((t) => (
        <div className="kpi-tegel" key={t.id}>
          <span className="kpi-titel">{t.titel}</span>
          <span className="kpi-waarde">{waarde(t)}</span>
          <span className="kpi-deltas">
            {t.dBud != null && <span>vs BUD {delta(t, 'dBud')}</span>}
            {t.dFc != null && <span>vs FC {delta(t, 'dFc')}</span>}
            {t.dBud == null && t.dFc == null && <span>geen budget/forecast</span>}
          </span>
          <Sparkline punten={t.sparkline} />
        </div>
      ))}
    </div>
  )
}
