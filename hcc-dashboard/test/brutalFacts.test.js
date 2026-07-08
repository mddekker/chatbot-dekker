import { describe, it, expect } from 'vitest'
import { brutalFacts } from '../src/lib/brutalFacts.js'
import { indexeerSnapshots, gewogenProd, kpiTegels } from '../src/lib/kpi.js'

function blok(act, fc = act, bud = act) {
  return { act, bud, dBud: act - bud, fc, dFc: act - fc }
}

function wenvRij(maand, entiteit, mtd) {
  return { maand, entiteit, bron: 'wenv', data: { mtd, ytd: {} } }
}

function prodRij(maand, entiteit, data) {
  return { maand, entiteit, bron: 'productiviteit', data }
}

describe('brutalFacts', () => {
  it('markeert een OR-miss groter dan de omzetmiss als kostenprobleem met de grootste kostenafwijking', () => {
    const idx = indexeerSnapshots([
      wenvRij('2026-06-01', 'MIDDEN', {
        nettoOmzet: blok(1000000, 1010000),
        operationeelResultaat: blok(100000, 200000),
        persKostenIndirect: blok(300000, 240000),
        inkoop: blok(50000, 45000),
      }),
    ])
    const feiten = brutalFacts(idx, 'MIDDEN', '2026-06-01')
    const kosten = feiten.find((f) => f.tekst.includes('Kostenprobleem'))
    expect(kosten).toBeDefined()
    expect(kosten.ernst).toBe('rood')
    expect(kosten.tekst).toContain('Indirecte personeelskosten')
  })

  it('markeert netto productiviteit >5 punt onder norm als rood', () => {
    const idx = indexeerSnapshots([prodRij('2026-06-01', 'ZUID', { nettoProductiviteit: 0.5 })])
    const feiten = brutalFacts(idx, 'ZUID', '2026-06-01')
    expect(feiten.some((f) => f.ernst === 'rood' && f.tekst.includes('onder de norm'))).toBe(true)
  })

  it('markeert bruto boven plan met netto ver onder norm als sturingsprobleem', () => {
    const idx = indexeerSnapshots([
      prodRij('2026-06-01', 'ZUID', { nettoProductiviteit: 0.5, brutoProductiviteit: 0.85 }),
    ])
    const feiten = brutalFacts(idx, 'ZUID', '2026-06-01')
    expect(feiten.some((f) => f.tekst.includes('Sturingsprobleem'))).toBe(true)
  })

  it('herkent drie maanden stijgend verzuim als trend', () => {
    const idx = indexeerSnapshots([
      prodRij('2026-03-01', 'WEST', { verzuimUren: 10 }),
      prodRij('2026-04-01', 'WEST', { verzuimUren: 11 }),
      prodRij('2026-05-01', 'WEST', { verzuimUren: 12 }),
      prodRij('2026-06-01', 'WEST', { verzuimUren: 13 }),
    ])
    const feiten = brutalFacts(idx, 'WEST', '2026-06-01')
    expect(feiten.some((f) => f.tekst.includes('drie maanden op rij'))).toBe(true)
  })

  it('markeert forecast die in de eigen maand al >2% omzet mist', () => {
    const idx = indexeerSnapshots([
      wenvRij('2026-06-01', 'NOORDWEST', {
        nettoOmzet: blok(950000, 1000000),
        operationeelResultaat: blok(100000, 100000),
      }),
    ])
    const feiten = brutalFacts(idx, 'NOORDWEST', '2026-06-01')
    expect(feiten.some((f) => f.tekst.includes('Forecastbetrouwbaarheid'))).toBe(true)
  })

  it('markeert capaciteitsmismatch op HCC-niveau (uitlenen én inhuren)', () => {
    const idx = indexeerSnapshots([
      wenvRij('2026-06-01', 'MIDDEN', {
        persInterneVerrekeningDirect: blok(-50000),
        persInhuurDirect: blok(10000),
      }),
      wenvRij('2026-06-01', 'WEST', {
        persInterneVerrekeningDirect: blok(30000),
        persInhuurDirect: blok(90000),
      }),
    ])
    const feiten = brutalFacts(idx, 'HCC', '2026-06-01')
    const mismatch = feiten.find((f) => f.tekst.includes('Capaciteitsmismatch'))
    expect(mismatch).toBeDefined()
    expect(mismatch.tekst).toContain('Midden')
  })
})

describe('kpi', () => {
  it('weegt HCC-productiviteit op directe eigen personeelskosten', () => {
    const idx = indexeerSnapshots([
      prodRij('2026-06-01', 'MIDDEN', { nettoProductiviteit: 0.6 }),
      prodRij('2026-06-01', 'WEST', { nettoProductiviteit: 0.8 }),
      wenvRij('2026-06-01', 'MIDDEN', { persEigenDirect: blok(300000) }),
      wenvRij('2026-06-01', 'WEST', { persEigenDirect: blok(100000) }),
    ])
    // (0.6*300 + 0.8*100) / 400 = 0.65
    expect(gewogenProd(idx, '2026-06-01', 'nettoProductiviteit')).toBeCloseTo(0.65)
  })

  it('valt terug op ongewogen gemiddelde zonder W&V-gewichten', () => {
    const idx = indexeerSnapshots([
      prodRij('2026-06-01', 'MIDDEN', { nettoProductiviteit: 0.6 }),
      prodRij('2026-06-01', 'WEST', { nettoProductiviteit: 0.8 }),
    ])
    expect(gewogenProd(idx, '2026-06-01', 'nettoProductiviteit')).toBeCloseTo(0.7)
  })

  it('levert alle 9 KPI-tegels met sparklinegegevens', () => {
    const idx = indexeerSnapshots([
      wenvRij('2026-05-01', 'HCC', { nettoOmzet: blok(6000000) }),
      wenvRij('2026-06-01', 'HCC', { nettoOmzet: blok(6800000, 7000000, 6900000) }),
    ])
    const tegels = kpiTegels(idx, 'HCC', '2026-06-01')
    expect(tegels).toHaveLength(9)
    const omzet = tegels.find((t) => t.id === 'omzet')
    expect(omzet.waarde).toBe(6800000)
    expect(omzet.dFc).toBe(-200000)
    expect(omzet.sparkline).toHaveLength(2)
  })
})
