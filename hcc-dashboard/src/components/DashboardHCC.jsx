import { kpiTegels, trendReeksen, regioVergelijking } from '../lib/kpi.js'
import { HCC } from '../lib/entities.js'
import KpiTiles from './KpiTiles.jsx'
import RegioTabel from './RegioTabel.jsx'
import AnalyseBlok from './AnalyseBlok.jsx'
import { ActBudFcChart, ProductiviteitChart, VerzuimChart, OmzetMixChart } from './Charts.jsx'

export default function DashboardHCC({ idx, maand }) {
  const tegels = kpiTegels(idx, HCC, maand)
  const trend = trendReeksen(idx, HCC, maand)
  const vergelijking = regioVergelijking(idx, maand)

  return (
    <>
      <h2>KPI's — HCC totaal</h2>
      <KpiTiles tegels={tegels} />

      <h2>Trends</h2>
      <div className="grafiek-grid">
        <ActBudFcChart data={trend} veldPrefix="omzet" titel="Omzet: ACT vs BUD vs FC" />
        <ActBudFcChart data={trend} veldPrefix="or" titel="Operationeel resultaat: ACT vs BUD vs FC" />
        <ProductiviteitChart data={trend} />
        <VerzuimChart data={trend} />
        <OmzetMixChart data={trend} />
      </div>

      <h2>Regiovergelijking</h2>
      <RegioTabel rijen={vergelijking} />

      <h2>Analyse</h2>
      <AnalyseBlok idx={idx} ent={HCC} maand={maand} />
    </>
  )
}
