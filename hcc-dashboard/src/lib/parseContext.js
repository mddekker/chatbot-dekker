import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import { herkenEntiteit } from './entities.js'
import { VERBODEN_SHEETS } from './parseProductiviteit.js'

// Maximale tekstlengte per contextdocument (ruim voldoende voor een rapportage,
// klein genoeg om samen met de cijfers naar het model te sturen).
const MAX_TEKST = 20000

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, '&')
}

function stripXml(xml) {
  return decodeXmlEntities(
    xml
      .replace(/<w:p[ >]/g, '\n<')
      .replace(/<w:tab[^>]*\/>/g, '\t')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function leesDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  const doc = zip.file('word/document.xml')
  if (!doc) throw new Error('Geen geldig Word-bestand (word/document.xml ontbreekt).')
  const xml = await doc.async('string')
  return stripXml(xml)
}

async function leesPptx(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  const slideNamen = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10))
  if (!slideNamen.length) throw new Error('Geen geldig PowerPoint-bestand (geen slides gevonden).')
  const delen = []
  for (const naam of slideNamen) {
    const xml = await zip.file(naam).async('string')
    const teksten = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1]))
    const inhoud = teksten.join(' ').replace(/\s+/g, ' ').trim()
    if (inhoud) delen.push(`Slide ${naam.match(/\d+/)[0]}: ${inhoud}`)
  }
  return delen.join('\n')
}

// Vrije Excel (geen W&V of productiviteitsbestand): sheets als compacte CSV.
// De sheet 'Personeel' wordt ook hier nooit gelezen (privacy).
function leesVrijeExcel(buffer) {
  const namen = XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames
  const toegestaan = namen.filter((n) => !VERBODEN_SHEETS.includes(n))
  const wb = XLSX.read(buffer, { type: 'array', sheets: toegestaan })
  const delen = []
  for (const naam of toegestaan) {
    const sheet = wb.Sheets[naam]
    if (!sheet || !sheet['!ref']) continue
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim()
    if (csv) delen.push(`=== Sheet: ${naam} ===\n${csv}`)
    if (delen.join('\n').length > MAX_TEKST) break
  }
  return delen.join('\n\n')
}

// Hoofd-ingang voor contextdocumenten (Word, PowerPoint, vrije Excel).
// Resultaat: { soort, tekst, entiteit (of null), afgekapt }
export async function parseContextDocument(file) {
  const naam = file.name.toLowerCase()
  const buffer = await file.arrayBuffer()

  let soort
  let tekst
  if (naam.endsWith('.docx')) {
    soort = 'word'
    tekst = await leesDocx(buffer)
  } else if (naam.endsWith('.pptx')) {
    soort = 'powerpoint'
    tekst = await leesPptx(buffer)
  } else if (naam.endsWith('.xlsx') || naam.endsWith('.xlsm') || naam.endsWith('.xls')) {
    soort = 'excel'
    tekst = leesVrijeExcel(buffer)
  } else if (naam.endsWith('.doc') || naam.endsWith('.ppt')) {
    throw new Error(
      'Oud Office-formaat (.doc/.ppt) wordt niet ondersteund. Open het bestand en sla het op als .docx of .pptx.'
    )
  } else {
    throw new Error('Bestandstype niet ondersteund. Upload Excel (.xlsx), Word (.docx) of PowerPoint (.pptx).')
  }

  if (!tekst || !tekst.trim()) {
    throw new Error('Geen leesbare tekst gevonden in dit bestand.')
  }

  const afgekapt = tekst.length > MAX_TEKST
  return {
    soort,
    tekst: afgekapt ? tekst.slice(0, MAX_TEKST) : tekst,
    entiteit: herkenEntiteit(file.name),
    afgekapt,
  }
}

// Suggesties voor optionele context die de AI-analyse scherper maakt.
export const CONTEXT_SUGGESTIES = [
  { id: 'mt', label: 'MT- of directierapportage van de maand', hint: 'duiding bij de cijfers, lopende acties' },
  { id: 'verzuim', label: 'Verzuimrapportage (eigen personeel)', hint: 'oorzaken en duur achter de verzuimuren' },
  { id: 'commercie', label: 'Commercieel overzicht / pipeline', hint: 'verklaart omzetmissers en forecastkwaliteit' },
  { id: 'hr', label: 'HR-overzicht: in- en uitstroom, openstaande vacatures', hint: 'context bij capaciteit en inhuur' },
  { id: 'klant', label: 'Klachten of klanttevredenheid (KTO)', hint: 'vroege signalen vóór ze omzet kosten' },
]
