import { describe, it, expect } from 'vitest'
import { maandUitTekst, slimJaar, bepaalRapportagemaand } from '../src/lib/detecteerMaand.js'

describe('maandUitTekst', () => {
  it('herkent maandnaam met jaar in een bestandsnaam', () => {
    expect(maandUitTekst('MT-rapportage juni 2026.docx')).toEqual({ maand: 6, jaar: 2026 })
    expect(maandUitTekst('Berekening Productiviteits% Juni-4 2026 HCC Zuid.xlsx')).toEqual({ maand: 6, jaar: 2026 })
  })

  it('herkent numerieke notaties', () => {
    expect(maandUitTekst('rapport 2026-06 definitief')).toEqual({ maand: 6, jaar: 2026 })
    expect(maandUitTekst('cijfers 06-2026')).toEqual({ maand: 6, jaar: 2026 })
  })

  it('herkent een losse maandnaam zonder jaar', () => {
    expect(maandUitTekst('verzuimrapportage oktober')).toEqual({ maand: 10, jaar: null })
  })

  it('geeft null bij tekst zonder maand', () => {
    expect(maandUitTekst('algemeen rapport definitieve versie')).toBeNull()
  })
})

describe('slimJaar', () => {
  it('kiest het huidige jaar voor recente periodes en vorig jaar voor toekomstige', () => {
    const juli2026 = new Date(2026, 6, 9)
    expect(slimJaar(6, juli2026)).toBe(2026) // P6 in juli = juni van dit jaar
    expect(slimJaar(11, juli2026)).toBe(2025) // P11 in juli = november vorig jaar
  })
})

describe('bepaalRapportagemaand', () => {
  const vandaag = new Date(2026, 6, 9)

  it('geeft de W&V-periode voorrang, met jaar uit een productiviteitsbestand', () => {
    const keuze = bepaalRapportagemaand({
      wenv: [{ periode: 6 }],
      prod: [{ jaar: 2026, laatsteActueleMaand: 6 }],
      vandaag,
    })
    expect(keuze.maand).toBe(6)
    expect(keuze.jaar).toBe(2026)
  })

  it('valt terug op contextdocumenten als er geen cijferbestanden zijn', () => {
    const keuze = bepaalRapportagemaand({
      context: [{ bestandsnaam: 'MT-rapportage mei 2026.docx', tekst: '' }],
      vandaag,
    })
    expect(keuze).toMatchObject({ maand: 5, jaar: 2026 })
  })

  it('kiest de nieuwste bestaande maand voor nageleverde stukken zonder datum', () => {
    const keuze = bepaalRapportagemaand({
      context: [{ bestandsnaam: 'notitie.docx', tekst: 'geen datum hierin' }],
      bestaandeMaanden: ['2026-04-01', '2026-05-01', '2026-06-01'],
      vandaag,
    })
    expect(keuze).toMatchObject({ maand: 6, jaar: 2026 })
  })

  it('valt als laatste terug op de vorige kalendermaand', () => {
    const keuze = bepaalRapportagemaand({ vandaag })
    expect(keuze).toMatchObject({ maand: 6, jaar: 2026 })
  })
})
