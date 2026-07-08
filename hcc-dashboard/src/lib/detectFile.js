import * as XLSX from 'xlsx'
import { isProductiviteitSheetNaam, VERBODEN_SHEETS } from './parseProductiviteit.js'

// Leest een bestand in twee stappen:
// 1. alleen de sheetnamen (bookSheets) om het type te bepalen;
// 2. daarna uitsluitend de benodigde sheets. De sheet 'Personeel' met
//    persoonsgegevens wordt zo nooit geparseerd of in het geheugen gehouden.
export async function leesWerkboekVeilig(file) {
  const buffer = await file.arrayBuffer()
  const namen = XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames

  const isProductiviteit = namen.some(isProductiviteitSheetNaam)
  const toegestaan = isProductiviteit
    ? namen.filter((n) => isProductiviteitSheetNaam(n))
    : namen.filter((n) => !VERBODEN_SHEETS.includes(n))

  const workbook = XLSX.read(buffer, { type: 'array', sheets: toegestaan })
  return { workbook, type: isProductiviteit ? 'productiviteit' : detecteerWenV(namen) }
}

function detecteerWenV(sheetNamen) {
  const heeftWenV = sheetNamen.some((n) => /MTD|YTD/i.test(n))
  return heeftWenV ? 'wenv' : 'onbekend'
}
