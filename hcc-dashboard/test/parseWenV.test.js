import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseWenV, controleerAansluiting } from '../src/lib/parseWenV.js'
import { maakWenVWorkbook } from './fixtures.js'

describe('parseWenV', () => {
  const wb = maakWenVWorkbook({ periode: 6 })
  const res = parseWenV(wb)

  it('herkent de periode uit de sheetkop', () => {
    expect(res.periode).toBe(6)
  })

  it('vindt alle 9 entiteiten met MTD en YTD', () => {
    const verwacht = ['MIDDEN', 'NOORDOOST', 'NOORDWEST', 'WEST', 'ZUID', 'ZUIDOOST', 'ZUIDWEST', 'STAF', 'HCC']
    for (const ent of verwacht) {
      expect(res.entiteiten[ent], ent).toBeDefined()
      expect(res.entiteiten[ent].mtd, `${ent} mtd`).toBeDefined()
      expect(res.entiteiten[ent].ytd, `${ent} ytd`).toBeDefined()
    }
  })

  it('leest het 5-koloms blok ACT/BUD/ΔBUD/FC/ΔFC', () => {
    const omzet = res.entiteiten.MIDDEN.mtd.nettoOmzet
    expect(omzet.act).toBe(751000)
    expect(omzet.bud).toBeCloseTo(751000 * 1.1)
    expect(omzet.dBud).toBeCloseTo(751000 - 751000 * 1.1)
    expect(omzet.fc).toBeCloseTo(751000 * 1.05)
    expect(omzet.dFc).toBeCloseTo(751000 - 751000 * 1.05)
  })

  it('onderscheidt directe (D) en indirecte personeelsregels', () => {
    expect(res.entiteiten.WEST.mtd.persEigenDirect.act).toBe(250000)
    expect(res.entiteiten.WEST.mtd.persEigenIndirect.act).toBe(150000)
    expect(res.entiteiten.WEST.mtd.persInterneVerrekeningDirect.act).toBe(-5000)
    expect(res.entiteiten.WEST.mtd.persInterneVerrekeningIndirect.act).toBe(15000)
  })

  it("neemt bij dubbel 'Algemene kosten' de laatste als totaal en de eerste als subregel", () => {
    expect(res.entiteiten.ZUID.mtd.algemeneKosten.act).toBe(28300)
    expect(res.entiteiten.ZUID.mtd.algemeneKostenSub.act).toBe(5000)
  })

  it('leest percentages als fracties', () => {
    expect(res.entiteiten.HCC.mtd.operationeelResultaatPct.act).toBeCloseTo(0.27)
    expect(res.entiteiten.HCC.mtd.brutoMargePct.act).toBeCloseTo(0.55)
  })

  it('sluit HCC-totaal aan op de som van regio’s + staf (tolerantie 1K)', () => {
    const meldingen = controleerAansluiting(res.entiteiten)
    expect(meldingen).toEqual([])
  })

  it('signaleert een aansluitverschil groter dan de tolerantie', () => {
    const kopie = JSON.parse(JSON.stringify(res.entiteiten))
    kopie.HCC.mtd.nettoOmzet.act += 5000
    const meldingen = controleerAansluiting(kopie)
    expect(meldingen.length).toBeGreaterThan(0)
    expect(meldingen[0]).toContain('Netto omzet')
  })

  it('crasht niet op een onverwacht werkboek maar geeft een duidelijke fout', () => {
    const leeg = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(leeg, XLSX.utils.aoa_to_sheet([['iets', 'anders']]), 'Blad1')
    expect(() => parseWenV(leeg)).toThrow(/Geen W&V-structuur/)
  })
})
