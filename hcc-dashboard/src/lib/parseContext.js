import JSZip from 'jszip'
import * as XLSXImport from 'xlsx'

// De CFB-lezer (voor .msg) hangt afhankelijk van de bundler aan de default- of
// naamruimte-export; pak de variant waar hij daadwerkelijk op zit.
const XLSX = XLSXImport.CFB ? XLSXImport : XLSXImport.default ?? XLSXImport
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
    // Grote datasheets (soms honderdduizenden rijen) aftoppen vóór het
    // omzetten naar CSV; de context wordt toch tot MAX_TEKST ingekort.
    const rng = XLSX.utils.decode_range(sheet['!ref'])
    if (rng.e.r - rng.s.r > 300) {
      sheet['!ref'] = XLSX.utils.encode_range({ s: rng.s, e: { r: rng.s.r + 300, c: rng.e.c } })
    }
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim()
    if (csv) delen.push(`=== Sheet: ${naam} ===\n${csv}`)
    if (delen.join('\n').length > MAX_TEKST) break
  }
  return delen.join('\n\n')
}

// Outlook-bericht (.msg): OLE/CFB-container; onderwerp, tekstbody en bijlagen
// zitten in vaste property-streams. De CFB-lezer van SheetJS opent de container.
// Bijlagen die de app kan verwerken (Excel/Word/PowerPoint) worden uitgepakt
// en gaan als losse bestanden door de normale herkenning — ook bijlagen van
// doorgestuurde berichten binnen de mail.
const BIJLAGE_EXTENSIES = /\.(xlsx|xlsm|xls|docx|pptx)$/i

async function leesMsg(buffer) {
  const cfb = XLSX.CFB.read(new Uint8Array(buffer), { type: 'array' })

  const leesTekstStream = (idx) => {
    const entry = cfb.FileIndex[idx]
    if (!entry?.content?.length) return null
    const bytes = new Uint8Array(entry.content)
    return entry.name.endsWith('001F')
      ? new TextDecoder('utf-16le').decode(bytes)
      : new TextDecoder('latin1').decode(bytes)
  }
  const vindProp = (code) =>
    cfb.FileIndex.findIndex((f, i) => {
      // Alleen op het hoofdniveau van het bericht, niet in bijlagen.
      const pad = cfb.FullPaths[i] || ''
      return (f.name === `__substg1.0_${code}001F` || f.name === `__substg1.0_${code}001E`) && !pad.includes('__attach')
    })

  const onderwerpIdx = vindProp('0037')
  const bodyIdx = vindProp('1000')
  const onderwerp = onderwerpIdx >= 0 ? leesTekstStream(onderwerpIdx) : null
  const body = bodyIdx >= 0 ? leesTekstStream(bodyIdx) : null

  // Bijlagen: datastream 37010102, bestandsnaam 3707001F (of 3704001F) in
  // dezelfde map. Geneste mappen (doorgestuurde mails) doen automatisch mee.
  const bijlagen = []
  cfb.FullPaths.forEach((pad, i) => {
    if (!pad.endsWith('__substg1.0_37010102')) return
    const map = pad.slice(0, pad.lastIndexOf('/'))
    // Lange bestandsnaam (3707) heeft voorrang op de verkorte DOS-naam (3704).
    let naamIdx = cfb.FullPaths.findIndex((p) => p === `${map}/__substg1.0_3707001F`)
    if (naamIdx < 0) naamIdx = cfb.FullPaths.findIndex((p) => p === `${map}/__substg1.0_3704001F`)
    const naam = naamIdx >= 0 ? leesTekstStream(naamIdx) : null
    const data = cfb.FileIndex[i]?.content
    if (naam && data?.length && BIJLAGE_EXTENSIES.test(naam)) {
      bijlagen.push({ naam: naam.replace(/\0/g, ''), bytes: new Uint8Array(data) })
    }
  })

  if (!body && !onderwerp && !bijlagen.length) {
    throw new Error(
      'Geen leesbare tekst of bruikbare bijlagen gevonden in dit Outlook-bericht. ' +
      'Kopieer de tekst naar Word (.docx) of sla de bijlagen los op en upload die.'
    )
  }
  const tekst = [onderwerp ? `Onderwerp: ${onderwerp}` : null, body].filter(Boolean).join('\n\n')
  return { tekst, bijlagen }
}

// E-mail in .eml-formaat (platte MIME-tekst).
function leesEml(buffer) {
  const raw = new TextDecoder('utf-8').decode(new Uint8Array(buffer))
  const onderwerp = raw.match(/^Subject:[ \t]*(.+)$/im)?.[1]?.trim()
  // Voorkeur: het text/plain-deel; anders alles na de headers.
  let body
  const plain = raw.match(/Content-Type:\s*text\/plain[^]*?\r?\n\r?\n([^]*?)(?:\r?\n--|$)/i)
  if (plain) {
    body = plain[1]
    if (/Content-Transfer-Encoding:\s*base64/i.test(raw.slice(0, raw.indexOf(plain[1])))) {
      try {
        body = new TextDecoder('utf-8').decode(
          Uint8Array.from(atob(body.replace(/\s+/g, '')), (c) => c.charCodeAt(0))
        )
      } catch { /* laat base64 staan als decoderen mislukt */ }
    }
  } else {
    const kop = raw.search(/\r?\n\r?\n/)
    body = kop >= 0 ? raw.slice(kop) : raw
  }
  // Quoted-printable ruwweg terugvertalen.
  body = body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  return [onderwerp ? `Onderwerp: ${onderwerp}` : null, body.trim()].filter(Boolean).join('\n\n')
}

// Hoofd-ingang voor contextdocumenten (Word, PowerPoint, e-mail, vrije Excel).
// Resultaat: { soort, tekst, entiteit (of null), afgekapt }
export async function parseContextDocument(file) {
  const naam = file.name.toLowerCase()
  const buffer = await file.arrayBuffer()

  let soort
  let tekst
  let bijlagen = []
  if (naam.endsWith('.docx')) {
    soort = 'word'
    tekst = await leesDocx(buffer)
  } else if (naam.endsWith('.pptx')) {
    soort = 'powerpoint'
    tekst = await leesPptx(buffer)
  } else if (naam.endsWith('.msg')) {
    soort = 'e-mail'
    const msg = await leesMsg(buffer)
    tekst = msg.tekst
    bijlagen = msg.bijlagen
  } else if (naam.endsWith('.eml')) {
    soort = 'e-mail'
    tekst = leesEml(buffer)
  } else if (naam.endsWith('.xlsx') || naam.endsWith('.xlsm') || naam.endsWith('.xls')) {
    soort = 'excel'
    tekst = leesVrijeExcel(buffer)
  } else if (naam.endsWith('.doc') || naam.endsWith('.ppt')) {
    throw new Error(
      'Oud Office-formaat (.doc/.ppt) wordt niet ondersteund. Open het bestand en sla het op als .docx of .pptx.'
    )
  } else {
    throw new Error(
      'Bestandstype niet ondersteund. Upload Excel (.xlsx), Word (.docx), PowerPoint (.pptx) of e-mail (.msg/.eml).'
    )
  }

  if ((!tekst || !tekst.trim()) && !bijlagen.length) {
    throw new Error('Geen leesbare tekst gevonden in dit bestand.')
  }

  const afgekapt = (tekst || '').length > MAX_TEKST
  return {
    soort,
    tekst: afgekapt ? tekst.slice(0, MAX_TEKST) : tekst || '',
    entiteit: herkenEntiteit(file.name),
    afgekapt,
    bijlagen,
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
