import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import { parseContextDocument } from '../src/lib/parseContext.js'
import { detecteerType } from '../src/lib/detectFile.js'

// Minimale maar structureel correcte Office-bestanden, in het geheugen gebouwd.
async function maakDocx(paragrafen) {
  const zip = new JSZip()
  const body = paragrafen.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('')
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document><w:body>${body}</w:body></w:document>`)
  const buffer = await zip.generateAsync({ type: 'arraybuffer' })
  return new File([buffer], 'MT-rapportage juni.docx')
}

async function maakPptx(slides) {
  const zip = new JSZip()
  slides.forEach((teksten, i) => {
    const runs = teksten.map((t) => `<a:t>${t}</a:t>`).join('')
    zip.file(`ppt/slides/slide${i + 1}.xml`, `<?xml version="1.0"?><p:sld>${runs}</p:sld>`)
  })
  const buffer = await zip.generateAsync({ type: 'arraybuffer' })
  return new File([buffer], 'Directiepresentatie HCC Zuid.pptx')
}

function maakVrijeExcel() {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Klant', 'Pipeline waarde'],
      ['Acme BV', 125000],
      ['Bouwbedrijf Jansen', 80000],
    ]),
    'Pipeline'
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Naam', 'FTE'], ['X. Geheim', 0.8]]),
    'Personeel'
  )
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new File([buffer], 'Commercieel overzicht.xlsx')
}

describe('parseContextDocument', () => {
  it('haalt tekst met alinea-structuur uit een Word-bestand', async () => {
    const file = await maakDocx(['Verzuim in Midden loopt op door twee langdurige gevallen.', 'Acties zijn ingezet met de bedrijfsarts.'])
    const res = await parseContextDocument(file)
    expect(res.soort).toBe('word')
    expect(res.tekst).toContain('langdurige gevallen')
    expect(res.tekst).toContain('\n')
  })

  it('haalt tekst per slide uit een PowerPoint en herkent de regio uit de bestandsnaam', async () => {
    const file = await maakPptx([
      ['Omzetontwikkeling', 'Q2 boven verwachting door A&R'],
      ['Risico: preventie-omzet daalt structureel sinds april'],
    ])
    const res = await parseContextDocument(file)
    expect(res.soort).toBe('powerpoint')
    expect(res.tekst).toContain('Slide 1:')
    expect(res.tekst).toContain('preventie-omzet daalt')
    expect(res.entiteit).toBe('ZUID')
  })

  it('zet een vrije Excel om naar CSV-context maar leest de Personeel-sheet nooit', async () => {
    const file = maakVrijeExcel()
    const res = await parseContextDocument(file)
    expect(res.soort).toBe('excel')
    expect(res.tekst).toContain('Pipeline waarde')
    expect(res.tekst).toContain('Acme BV')
    expect(res.tekst).not.toContain('Geheim') // Personeel-sheet nooit lezen
    expect(res.tekst).not.toContain('Personeel')
  })

  it('weigert oude Office-formaten met een duidelijke melding', async () => {
    const file = new File([new ArrayBuffer(10)], 'oud rapport.doc')
    await expect(parseContextDocument(file)).rejects.toThrow(/\.docx/)
  })
})

describe('detecteerType', () => {
  it('stuurt Office-documenten naar context en herkent Excel-varianten op sheetnamen', () => {
    expect(detecteerType('rapport.docx')).toBe('context')
    expect(detecteerType('presentatie.pptx')).toBe('context')
    expect(detecteerType('x.xlsx', ['HCC Totaal MTD', 'Per regio MTD'])).toBe('wenv')
    expect(detecteerType('x.xlsx', ['Maand prod West', 'Personeel'])).toBe('productiviteit')
    expect(detecteerType('x.xlsx', ['Blad1'])).toBe('context')
  })
})
