import { MAANDNAMEN } from './entities.js'

// Haal een maand (en waar mogelijk jaar) uit vrije tekst of een bestandsnaam.
// Herkent: '2026-06', '06-2026', 'juni 2026', 'Juni-4 2026', losse maandnamen.
export function maandUitTekst(tekst) {
  if (!tekst) return null
  const s = String(tekst).toLowerCase()

  let m = s.match(/\b(20\d{2})[-_./](0?[1-9]|1[0-2])\b/)
  if (m) return { jaar: parseInt(m[1], 10), maand: parseInt(m[2], 10) }

  m = s.match(/\b(0?[1-9]|1[0-2])[-_./](20\d{2})\b/)
  if (m) return { jaar: parseInt(m[2], 10), maand: parseInt(m[1], 10) }

  for (let i = 0; i < 12; i++) {
    const naamRegex = new RegExp(`\\b${MAANDNAMEN[i]}\\b`)
    if (naamRegex.test(s)) {
      const naIndex = s.slice(s.search(naamRegex))
      const jaarM = naIndex.match(/\b(20\d{2})\b/) || s.match(/\b(20\d{2})\b/)
      return { maand: i + 1, jaar: jaarM ? parseInt(jaarM[1], 10) : null }
    }
  }
  return null
}

// Kies het meest waarschijnlijke jaar bij een gedetecteerd periodenummer.
// Regel: een rapportage gaat vrijwel altijd over een maand in het recente
// verleden. Als de periode ná de huidige maand ligt, hoort hij bij vorig jaar.
export function slimJaar(maandNummer, vandaag = new Date()) {
  const huidigJaar = vandaag.getFullYear()
  return maandNummer > vandaag.getMonth() + 2 ? huidigJaar - 1 : huidigJaar
}

// Bepaal de rapportagemaand voor een batch geüploade bestanden.
// Prioriteit: W&V-periode > productiviteit > context-documenten >
// nieuwste maand in de database > vorige kalendermaand.
export function bepaalRapportagemaand({ wenv = [], prod = [], context = [], bestaandeMaanden = [], vandaag = new Date() }) {
  // 1. W&V: het periodenummer is hard; jaar uit een productiviteitsbestand
  //    in dezelfde batch, anders de slimme jaarregel.
  const periode = wenv.map((b) => b.periode).find(Boolean)
  const prodJaar = prod.map((b) => b.jaar).find(Boolean)
  if (periode) {
    return { maand: periode, jaar: prodJaar ?? slimJaar(periode, vandaag), bron: `W&V-rekening (P${periode})` }
  }

  // 2. Productiviteit: laatste maand met echte actuals.
  const prodMetMaand = prod.find((b) => b.laatsteActueleMaand)
  if (prodMetMaand) {
    return {
      maand: prodMetMaand.laatsteActueleMaand,
      jaar: prodMetMaand.jaar ?? slimJaar(prodMetMaand.laatsteActueleMaand, vandaag),
      bron: 'productiviteitsbestand',
    }
  }

  // 3. Contextdocumenten: maand uit bestandsnaam of begin van de tekst.
  for (const doc of context) {
    const uitNaam = maandUitTekst(doc.bestandsnaam) || maandUitTekst((doc.tekst || '').slice(0, 3000))
    if (uitNaam?.maand) {
      return {
        maand: uitNaam.maand,
        jaar: uitNaam.jaar ?? slimJaar(uitNaam.maand, vandaag),
        bron: `documentnaam of -inhoud (${doc.bestandsnaam})`,
      }
    }
  }

  // 4. Nageleverde stukken horen vrijwel altijd bij de nieuwste bestaande maand.
  if (bestaandeMaanden.length) {
    const laatste = bestaandeMaanden[bestaandeMaanden.length - 1]
    const [jaar, maand] = laatste.split('-').map((v) => parseInt(v, 10))
    return { maand, jaar, bron: 'nieuwste maand in het dashboard' }
  }

  // 5. Anders: de vorige kalendermaand.
  const vorige = new Date(vandaag.getFullYear(), vandaag.getMonth() - 1, 1)
  return { maand: vorige.getMonth() + 1, jaar: vorige.getFullYear(), bron: 'vorige kalendermaand' }
}
