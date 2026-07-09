import { useState } from 'react'
import { kpiTegels, trendReeksen, productiviteitsBrug } from '../lib/kpi.js'
import { REGIOS, STAF, entiteitLabel } from '../lib/entities.js'
import KpiTiles from './KpiTiles.jsx'
import AnalyseBlok from './AnalyseBlok.jsx'
import {
  ActBudFcChart, ProductiviteitChart, VerzuimChart, OmzetMixChart,
  AlgemeneUrenChart, IkvChart, BrugChart,
} from './Charts.jsx'

export default function DashboardRegio({ idx, maand }) {
  const [regio, setRegio] = useState(REGIOS[0])
  const tegels = kpiTegels(idx, regio, maand)
  const trend = trendReeksen(idx, regio, maand)
  const brug = productiviteitsBrug(idx, regio, maand)
  const isStaf = regio === STAF

  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Regio</h2>
        <select className="regio-select" value={regio} onChange={(e) => setRegio(e.target.value)}>
          {[...REGIOS, STAF].map((r) => (
            <option key={r} value={r}>{entiteitLabel(r)}</option>
          ))}
        </select>
      </div>

      <h2>KPI's — {entiteitLabel(regio)}</h2>
      <KpiTiles tegels={tegels} />

      <h2>Trends</h2>
      <div className="grafiek-grid">
        <ActBudFcChart data={trend} veldPrefix="omzet" titel="Omzet: ACT vs BUD vs FC" />
        <ActBudFcChart data={trend} veldPrefix="or" titel="Operationeel resultaat: ACT vs BUD vs FC" />
        {!isStaf && <ProductiviteitChart data={trend} />}
        {!isStaf && <VerzuimChart data={trend} />}
        <OmzetMixChart data={trend} />
        {!isStaf && brug && <BrugChart brug={brug} />}
        {!isStaf && <AlgemeneUrenChart data={trend} />}
        <IkvChart data={trend} />
      </div>

      <h2>Analyse</h2>
      <AnalyseBlok idx={idx} ent={regio} maand={maand} />
    </>
  )
}
