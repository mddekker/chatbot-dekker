import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseProductiviteit } from '../src/lib/parseProductiviteit.js'
import { maakProductiviteitWorkbook } from './fixtures.js'

describe('parseProductiviteit', () => {
  const wb = maakProductiviteitWorkbook({ regio: 'Zuid West', actueleMaanden: 6 })
  const res = parseProductiviteit(wb, { bestandsnaam: 'Berekening Productiviteits% Juni-4 2026 HCC Zuid-West.xlsx' })

  it('herkent de regio uit de sheetnaam (samengestelde naam vóór enkelvoudige)', () => {
    expect(res.entiteit).toBe('ZUIDWEST')
  })

  it('haalt het jaartal uit de bestandsnaam', () => {
    expect(res.jaar).toBe(2026)
  })

  it('parseert alle 12 maanden uit het Actuals-blok', () => {
    expect(Object.keys(res.maanden)).toHaveLength(12)
    const jan = res.maanden[1]
    expect(jan.brutoWerkbareUren).toBe(176)
    expect(jan.feestdagenUren).toBe(8) // label met voorloopspatie
    expect(jan.vakantieUren).toBeCloseTo(12.66)
    expect(jan.verzuimUren).toBeCloseTo(12.32)
    expect(jan.nettoProductiviteit).toBeCloseTo(0.58)
    expect(jan.algemeneUrenNorm).toBeCloseTo(34.39)
    expect(jan.algemeneUrenBovenNorm).toBeCloseTo(6.3)
  })

  it('leest de bruto productiviteit uit het Actuals-blok (niet de normregel)', () => {
    expect(res.maanden[1].brutoProductiviteit).toBeCloseTo(0.81)
    expect(res.maanden[6].brutoProductiviteit).toBeCloseTo(0.79)
  })

  it('bepaalt de laatste actuele maand op basis van de salderingsregel', () => {
    expect(res.laatsteActueleMaand).toBe(6)
  })

  it('leest de Personeel-sheet nooit mee', () => {
    const dump = JSON.stringify(res)
    expect(dump).not.toContain('Jansen')
  })

  it('herkent regio uit bestandsnaam als de sheetnaam geen regio bevat', () => {
    const wb2 = maakProductiviteitWorkbook({ regio: '' })
    const res2 = parseProductiviteit(wb2, { bestandsnaam: 'x 2026 HCC-NoordOost.xlsx' })
    expect(res2.entiteit).toBe('NOORDOOST')
  })

  it('geeft een duidelijke fout op een werkboek zonder Maand prod-sheet', () => {
    const leeg = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(leeg, XLSX.utils.aoa_to_sheet([['a']]), 'Blad1')
    expect(() => parseProductiviteit(leeg)).toThrow(/Maand prod/)
  })
})
