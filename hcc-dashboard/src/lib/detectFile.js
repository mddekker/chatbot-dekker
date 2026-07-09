import * as XLSX from 'xlsx'
import { isProductiviteitSheetNaam, VERBODEN_SHEETS } from './parseProductiviteit.js'

// Herkent het bestandstype op één uploadplek:
// - Excel met MTD/YTD-sheets            -> 'wenv'
// - Excel met een 'Maand prod'-sheet    -> 'productiviteit'
// - overige Excel, Word of PowerPoint   -> 'context' (tekst voor de AI-analyse)
export function detecteerType(bestandsnaam, sheetNamen = null) {
  const naam = bestandsnaam.toLowerCase()
  if (naam.endsWith('.docx') || naam.endsWith('.pptx') || naam.endsWith('.doc') || naam.endsWith('.ppt')) {
    return 'context'
  }
  if (sheetNamen) {
    if (sheetNamen.some(isProductiviteitSheetNaam)) return 'productiviteit'
    if (sheetNamen.some((n) => /MTD|YTD/i.test(n))) return 'wenv'
    return 'context'
  }
  return 'onbekend'
}

// Leest een Excel-bestand in twee stappen:
// 1. alleen de sheetnamen (bookSheets) om het type te bepalen;
// 2. daarna uitsluitend de benodigde sheets. De sheet 'Personeel' met
//    persoonsgegevens wordt zo nooit geparseerd of in het geheugen gehouden.
export async function leesWerkboekVeilig(file) {
  const buffer = await file.arrayBuffer()
  const namen = XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames
  const type = detecteerType(file.name, namen)

  if (type === 'context') return { workbook: null, type }

  const toegestaan =
    type === 'productiviteit'
      ? namen.filter((n) => isProductiviteitSheetNaam(n))
      : namen.filter((n) => !VERBODEN_SHEETS.includes(n))

  const workbook = XLSX.read(buffer, { type: 'array', sheets: toegestaan })
  return { workbook, type }
}
