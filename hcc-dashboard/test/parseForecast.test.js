import { describe, it, expect } from 'vitest'
import { parseForecast, isForecastWerkboek } from '../src/lib/parseForecast.js'
import { indexeerSnapshots, trendMetPrognose, jaarProjectie, kpiTegels } from '../src/lib/kpi.js'
import { bepaalRapportagemaand } from '../src/lib/detecteerMaand.js'
import { maakForecastWorkbook } from './fixtures.js'

describe('parseForecast', () => {
  const fc = parseForecast(maakForecastWorkbook())

  it('herkent forecastwerkboeken aan de sheetnamen', () => {
    expect(isForecastWerkboek(['MN', 'FC2', 'B2026'])).toBe(true)
    expect(isForecastWerkboek(['HCC Totaal MTD', 'Per regio MTD'])).toBe(false)
  })

  it('leest versie, jaar en de eerste prognosemaand', () => {
    expect(fc.versie).toBe('FC3')
    expect(fc.jaar).toBe(2026)
    expect(fc.eersteForecastMaand).toBe(9)
  })

  it('kiest per entiteit de hoogste versie en slaat analyse-sheets over', () => {
    expect(Object.keys(fc.entiteiten).sort()).toEqual(['HCC', 'MIDDEN'])
    // De FC2-sheet (zelfde entiteit HCC) is niet als aparte entiteit of versie geland.
    expect(fc.entiteiten.HCC.maanden[6].status).toBe('realisatie') // FC3: forecast pas vanaf sep
  })

  it('leest maandwaarden, status en jaartotalen inclusief budget', () => {
    const m = fc.entiteiten.MIDDEN
    expect(m.maanden[1].nettoOmzet).toBe(1500000)
    expect(m.maanden[12].nettoOmzet).toBe(1511000)
    expect(m.maanden[8].status).toBe('realisatie')
    expect(m.maanden[9].status).toBe('forecast')
    expect(m.jaarTotaal.operationeelResultaat).toBe(300000 * 12 + 66000)
    expect(m.budgetJaar.nettoOmzet).toBe(1500000 * 12 + 100000)
  })
})

describe('forecast in het dashboard', () => {
  const fc = parseForecast(maakForecastWorkbook())
  const rijen = Object.entries(fc.entiteiten).map(([ent, data]) => ({
    maand: '2026-09-01', entiteit: ent, bron: 'forecast',
    data: { versie: fc.versie, jaar: fc.jaar, eersteForecastMaand: 9, ...data },
  }))
  rijen.push({
    maand: '2026-08-01', entiteit: 'HCC', bron: 'wenv',
    data: { mtd: { nettoOmzet: { act: 1507000, bud: 1, dBud: 1, fc: 1, dFc: 1 } }, ytd: {} },
  })
  const idx = indexeerSnapshots(rijen)

  it('telt forecastmaanden niet mee in de maandkiezer', () => {
    expect(idx.maanden).toEqual(['2026-08-01'])
  })

  it('trekt de prognoselijn door tot december met een verbindingspunt', () => {
    const { reeks, versie } = trendMetPrognose(idx, 'HCC', '2026-08-01')
    expect(versie).toBe('FC3')
    expect(reeks[reeks.length - 1].maand).toBe('2026-12-01')
    expect(reeks[reeks.length - 1].omzetPrognose).toBe(1511000)
    const verbinding = reeks.find((p) => p.maand === '2026-08-01')
    expect(verbinding.omzetPrognose).toBe(verbinding.omzetAct)
  })

  it('maakt jaarprojectietegels met delta t.o.v. jaarbudget', () => {
    const proj = jaarProjectie(idx, 'HCC')
    expect(proj.versie).toBe('FC3')
    expect(proj.omzetDBud).toBe(66000 - 100000)
    const tegels = kpiTegels(idx, 'HCC', '2026-08-01')
    const jaarOmzet = tegels.find((t) => t.id === 'jaarOmzet')
    expect(jaarOmzet.titel).toContain('FC3')
    expect(jaarOmzet.dBud).toBe(-34000)
  })

  it('stelt de laatste realisatiemaand voor als rapportagemaand', () => {
    expect(bepaalRapportagemaand({ forecast: [fc] })).toMatchObject({ maand: 8, jaar: 2026 })
  })
})
