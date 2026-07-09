import { describe, it, expect } from 'vitest'
import { reviewVragen } from '../src/lib/reviewVragen.js'
import { indexeerSnapshots } from '../src/lib/kpi.js'

function blok(act, fc = act, bud = act) {
  return { act, bud, dBud: act - bud, fc, dFc: act - fc }
}
const wenvRij = (maand, entiteit, mtd) => ({ maand, entiteit, bron: 'wenv', data: { mtd, ytd: {} } })
const prodRij = (maand, entiteit, data) => ({ maand, entiteit, bron: 'productiviteit', data })

describe('reviewVragen', () => {
  it('stelt de forecastvraag met de eigen missercijfers erin', () => {
    const idx = indexeerSnapshots([
      wenvRij('2026-06-01', 'MIDDEN', { nettoOmzet: blok(950000, 1000000) }),
    ])
    const vragen = reviewVragen(idx, 'MIDDEN', '2026-06-01')
    const forecast = vragen.find((v) => v.thema === 'Forecast')
    expect(forecast).toBeDefined()
    expect(forecast.vraag).toContain('-50K')
    expect(forecast.vraag).toContain('forecast van komende maand')
  })

  it('vraagt bij een kostenprobleem naar de grootste overschrijding en een besluit', () => {
    const idx = indexeerSnapshots([
      wenvRij('2026-06-01', 'ZUID', {
        nettoOmzet: blok(1000000, 1010000),
        operationeelResultaat: blok(100000, 200000),
        persKostenIndirect: blok(300000, 250000),
      }),
    ])
    const vragen = reviewVragen(idx, 'ZUID', '2026-06-01')
    const kosten = vragen.find((v) => v.thema === 'Kosten')
    expect(kosten.vraag).toContain('indirecte personeelskosten')
    expect(kosten.vraag).toContain('schrap of stop')
  })

  it('zet een herhaald productiviteitsprobleem bovenaan', () => {
    const idx = indexeerSnapshots([
      prodRij('2026-05-01', 'WEST', { nettoProductiviteit: 0.5 }),
      prodRij('2026-06-01', 'WEST', { nettoProductiviteit: 0.52, brutoProductiviteit: 0.85 }),
    ])
    const vragen = reviewVragen(idx, 'WEST', '2026-06-01')
    expect(vragen[0].thema).toBe('Herhaald signaal')
    expect(vragen[0].vraag).toContain('effect nog niet')
    // en de sturingsvraag over weglekkende uren volgt ook
    expect(vragen.some((v) => v.vraag.includes('lekken de uren weg'))).toBe(true)
  })

  it('stelt de capaciteitsvraag bij fors uitlenen terwijl de omzet achterblijft', () => {
    const idx = indexeerSnapshots([
      wenvRij('2026-06-01', 'NOORDOOST', {
        nettoOmzet: blok(400000, 420000),
        persInterneVerrekeningDirect: blok(-280000),
      }),
    ])
    const vragen = reviewVragen(idx, 'NOORDOOST', '2026-06-01')
    const cap = vragen.find((v) => v.thema === 'Capaciteit')
    expect(cap.vraag).toContain('280K')
    expect(cap.vraag).toContain('forecast mist')
  })

  it('geeft maximaal zes vragen en geen vragen zonder data', () => {
    const leeg = indexeerSnapshots([])
    expect(reviewVragen(leeg, 'MIDDEN', '2026-06-01')).toEqual([])
  })
})
