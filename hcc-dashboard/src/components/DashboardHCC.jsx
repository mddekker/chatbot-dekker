import { kpiTegels, trendReeksen, trendMetPrognose, regioVergelijking } from '../lib/kpi.js'
import { HCC } from '../lib/entities.js'
import KpiTiles from './KpiTiles.jsx'
import RegioTabel from './RegioTabel.jsx'
import AnalyseBlok from './AnalyseBlok.jsx'
import OverzichtStrip from './OverzichtStrip.jsx'
import { ActBudFcChart, ProductiviteitChart, VerzuimChart, OmzetMixChart } from './Charts.jsx'

export default function DashboardHCC({ idx, maand }) {
  const tegels = kpiTegels(idx, HCC, maand)
  const trend = trendReeksen(idx, HCC, maand)
  const prognose = trendMetPrognose(idx, HCC, maand)
  const vergelijking = regioVergelijking(idx, maand)

  return (
    <>
      <OverzichtStrip idx={idx} maand={maand} />
      <h2>KPI's — HCC totaal</h2>
      <KpiTiles tegels={tegels} />

      <h2>Trends</h2>
      <div className="grafiek-grid">
        <ActBudFcChart data={prognose.reeks} veldPrefix="omzet" titel="Omzet: ACT vs BUD vs FC" prognoseVersie={prognose.versie} />
        <ActBudFcChart data={prognose.reeks} veldPrefix="or" titel="Operationeel resultaat: ACT vs BUD vs FC" prognoseVersie={prognose.versie} />
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
