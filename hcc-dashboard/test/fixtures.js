// Bouwt in-memory Excel-werkboeken die de beschreven sheetstructuur nabootsen,
// zodat de parsers getest worden op exact de structuur van de echte bestanden.
import * as XLSX from 'xlsx'

// 5-koloms blok per entiteit: ACT, BUD, ΔBUD, FC, ΔFC.
export function maakWenVWorkbook({ periode = 6 } = {}) {
  const entiteiten = ['MIDDEN', 'NOORDOOST', 'NOORDWEST', 'WEST', 'ZUID', 'ZUIDOOST', 'ZUIDWEST', 'STAF', 'HumanCapitalCare']

  const blok = (basis) => [basis, basis * 1.1, basis - basis * 1.1, basis * 1.05, basis - basis * 1.05]

  const rijen = (schaal) => [
    ['Omzet preventie', 100000 * schaal],
    ['Omzet verzuimbegeleiding', 500000 * schaal],
    ['Omzet arbeidsinterventie & re-integratie', 150000 * schaal],
    ['Omzet overige', 1000 * schaal],
    ['Netto omzet', 751000 * schaal],
    [null],
    ['Inkoop', 40000 * schaal],
    [null],
    ['Personeel - eigen (D)', 250000 * schaal],
    ['Personeel - interne verrekening (D)', -5000 * schaal],
    ['Personeel - inhuur (D)', 20000 * schaal],
    ['Personeel - mobiliteit (D)', 25000 * schaal],
    ['Personeel - overig (D)', 4000 * schaal],
    ['Personeelskosten - direct', 294000 * schaal],
    [null],
    ['Bruto marge', 417000 * schaal],
    ['Bruto marge %', 0.55],
    [null],
    ['Personeel - eigen', 150000 * schaal],
    ['Personeel - interne verrekening', 15000 * schaal],
    ['Personeel - inhuur', 2000 * schaal],
    ['Personeel - mobiliteit', 8000 * schaal],
    ['Personeel - overig', 14000 * schaal],
    ['Personeelskosten - indirect', 189000 * schaal],
    [null],
    ['Contributiemarge', 228000 * schaal],
    ['Contributie marge %', 0.30],
    [null],
    ['Huisvestingskosten', 21000 * schaal],
    ['Automatiseringskosten', 500 * schaal],
    ['Verkoopkosten', 1800 * schaal],
    ['Algemene kosten', 5000 * schaal],
    ['Algemene kosten', 28300 * schaal],
    [null],
    ['Operationeel resultaat', 199700 * schaal],
    ['Operationeel resultaat %', 0.27],
  ]

  const maakSheet = (soort, alleenTotaal) => {
    const ents = alleenTotaal ? ['HumanCapitalCare'] : entiteiten
    const aoa = []
    // Rij 1: titel met periode; rij 2: entiteitsnamen boven elk blok.
    aoa.push([null, null, null, `HCC P${periode} ${soort}`])
    const kopRij = [null, null, null, '(× €1.000)']
    ents.forEach((ent, i) => {
      kopRij[4 + i * 5] = ent
    })
    aoa.push(kopRij)
    aoa.push([null, null, null, null, 'ACT', 'BUD', '∆ BUD', 'FC', '∆ FC2'])
    aoa.push([null])
    aoa.push([null])
    for (const [label, basis] of rijen(1)) {
      const rij = [null, null, null, label]
      if (basis != null) {
        ents.forEach((ent, i) => {
          // Totaalkolom = som van alle regio's + staf (8 entiteiten, schaal 1 elk).
          const schaal = ent === 'HumanCapitalCare' ? 8 : 1
          const isPct = String(label).includes('%')
          const b = isPct ? [basis, basis - 0.01, 0.01, basis - 0.02, 0.02] : blok(basis * schaal)
          b.forEach((v, k) => {
            rij[4 + i * 5 + k] = v
          })
        })
      }
      aoa.push(rij)
    }
    return XLSX.utils.aoa_to_sheet(aoa)
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, maakSheet('MTD', true), 'HCC Totaal MTD')
  XLSX.utils.book_append_sheet(wb, maakSheet('MTD', false), 'Per regio MTD')
  XLSX.utils.book_append_sheet(wb, maakSheet('YTD', false), 'HCC Totaal YTD')
  XLSX.utils.book_append_sheet(wb, maakSheet('YTD', false), 'Per regio YTD')
  return wb
}

export function maakProductiviteitWorkbook({ regio = 'Zuid West', actueleMaanden = 6 } = {}) {
  const aoa = []
  for (let i = 0; i < 41; i++) aoa.push([null])
  // Rij 42 (index 41): maandnamen.
  aoa[41] = [null, 'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

  const maandRij = (label, waarden, alleenActueel = false) => {
    const rij = [label]
    waarden.forEach((v, i) => {
      rij[i + 1] = alleenActueel && i >= actueleMaanden ? null : v
    })
    return rij
  }

  const urenPerMaand = [176, 160, 176, 176, 168, 176, 184, 168, 176, 176, 168, 184]
  aoa.push(['Actuals'])
  aoa.push(maandRij('Bruto Werkbare uren', urenPerMaand))
  // Let op: in de echte bestanden heeft ' Feestdagen' een spatie ervoor.
  aoa.push(maandRij(' Feestdagen', [8, 0, 0, 24, 16, 0, 0, 0, 0, 0, 0, 8]))
  aoa.push(maandRij('Vakantie dagen', [12.66, 12.84, 12.24, 14.59, 17.52, 17.76, 16.99, 13.61, 5.42, 2.56, 0.1, 2.76]))
  aoa.push(maandRij('Verzuim', [12.32, 13.92, 15.66, 15.49, 17.3, 19.36, 11.96, 10.92, 11.44, 11.44, 10.92, 11.96]))
  aoa.push([null])
  aoa.push(maandRij('Bruto norm "productiviteit"', [0.81, 0.83, 0.84, 0.69, 0.7, 0.79, 0.84, 0.85, 0.9, 0.92, 0.93, 0.88]))
  aoa.push(maandRij('Alg niet Productief norm', Array(12).fill(34.39)))
  aoa.push(maandRij('Afwijking norm niet prod', [6.3, 0.63, 7.05, 1.17, 7.15, 16.45, 2, 2, 2, 2, 2, 2], true))
  aoa.push(maandRij('Productief', [0.58, 0.61, 0.61, 0.49, 0.45, 0.5, 0.66, 0.65, 0.71, 0.73, 0.73, 0.69]))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), `Maand prod ${regio}`)
  // 'Personeel'-sheet met nepnamen: mag nooit in de parseresultaten belanden.
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Naam', 'FTE'],
      ['J. Jansen', 0.8],
    ]),
    'Personeel'
  )
  return wb
}
