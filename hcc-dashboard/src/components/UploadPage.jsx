import { useMemo, useRef, useState } from 'react'
import { leesWerkboekVeilig } from '../lib/detectFile.js'
import { parseWenV, controleerAansluiting } from '../lib/parseWenV.js'
import { parseProductiviteit } from '../lib/parseProductiviteit.js'
import { bewaarSnapshots } from '../lib/store.js'
import { REGIOS, HCC, entiteitLabel, maandIso, maandLabel } from '../lib/entities.js'

const MAAND_OPTIES = Array.from({ length: 12 }, (_, i) => i + 1)

export default function UploadPage({ idx, naOpslaan }) {
  const [bestanden, setBestanden] = useState([]) // {naam, status, type, resultaat, fout}
  const [sleep, setSleep] = useState(false)
  const [jaar, setJaar] = useState(new Date().getFullYear())
  const [maandNr, setMaandNr] = useState(null)
  const [bezig, setBezig] = useState(false)
  const [opgeslagen, setOpgeslagen] = useState(null)
  const [fout, setFout] = useState(null)
  const inputRef = useRef(null)

  async function verwerk(files) {
    setOpgeslagen(null)
    setFout(null)
    const nieuwe = []
    for (const file of files) {
      const item = { naam: file.name, status: 'bezig' }
      try {
        const { workbook, type } = await leesWerkboekVeilig(file)
        if (type === 'wenv') {
          const res = parseWenV(workbook)
          item.type = 'wenv'
          item.resultaat = res
          item.status = 'ok'
          if (res.periode) setMaandNr((m) => m ?? res.periode)
        } else if (type === 'productiviteit') {
          const res = parseProductiviteit(workbook, { bestandsnaam: file.name })
          item.type = 'productiviteit'
          item.resultaat = res
          item.status = 'ok'
          if (res.jaar) setJaar(res.jaar)
          if (res.laatsteActueleMaand) setMaandNr((m) => m ?? res.laatsteActueleMaand)
        } else {
          item.status = 'fout'
          item.fout = 'Bestandstype niet herkend: geen W&V-sheets (MTD/YTD) en geen "Maand prod"-sheet.'
        }
      } catch (e) {
        item.status = 'fout'
        item.fout = e.message
      }
      nieuwe.push(item)
    }
    setBestanden((huidig) => [...huidig, ...nieuwe])
  }

  const geslaagd = bestanden.filter((b) => b.status === 'ok')
  const wenvBestanden = geslaagd.filter((b) => b.type === 'wenv')
  const prodBestanden = geslaagd.filter((b) => b.type === 'productiviteit')

  const validatie = useMemo(() => {
    if (!geslaagd.length) return null
    const prodRegios = new Set(prodBestanden.map((b) => b.resultaat.entiteit).filter(Boolean))
    const ontbrekend = REGIOS.filter((r) => !prodRegios.has(r))
    const meldingen = []
    for (const b of wenvBestanden) {
      meldingen.push(...controleerAansluiting(b.resultaat.entiteiten).map((m) => `${b.naam}: ${m}`))
      meldingen.push(...b.resultaat.waarschuwingen.map((m) => `${b.naam}: ${m}`))
    }
    for (const b of prodBestanden) {
      meldingen.push(...b.resultaat.waarschuwingen.map((m) => `${b.naam}: ${m}`))
    }
    return { prodRegios: [...prodRegios], ontbrekend, meldingen }
  }, [bestanden])

  const maand = maandNr ? maandIso(jaar, maandNr) : null
  const overschrijft = useMemo(() => {
    if (!maand) return false
    const bronnen = new Set()
    if (wenvBestanden.length && idx.wenv[HCC]?.[maand]) bronnen.add('W&V')
    for (const b of prodBestanden) {
      const ent = b.resultaat.entiteit
      if (ent && idx.prod[ent]?.[maand]) bronnen.add(`productiviteit ${entiteitLabel(ent)}`)
    }
    return bronnen.size ? [...bronnen] : false
  }, [maand, bestanden, idx])

  async function opslaan() {
    if (!maand || !geslaagd.length) return
    if (overschrijft && !window.confirm(
      `Voor ${maandLabel(maand)} bestaat al data (${overschrijft.join(', ')}). Overschrijven?`
    )) return

    setBezig(true)
    setFout(null)
    try {
      const rijen = []
      for (const b of wenvBestanden) {
        for (const [ent, data] of Object.entries(b.resultaat.entiteiten)) {
          rijen.push({ maand, entiteit: ent, bron: 'wenv', data: { periode: maandNr, ...data } })
        }
      }
      // Productiviteitsbestanden bevatten de hele jaarreeks; sla alle actuele
      // maanden t/m de rapportagemaand op zodat de trend direct gevuld is.
      for (const b of prodBestanden) {
        const ent = b.resultaat.entiteit
        if (!ent) continue
        for (const [mStr, data] of Object.entries(b.resultaat.maanden)) {
          const m = parseInt(mStr, 10)
          if (m > maandNr) continue
          if (data.brutoWerkbareUren == null && data.nettoProductiviteit == null) continue
          rijen.push({ maand: maandIso(jaar, m), entiteit: ent, bron: 'productiviteit', data })
        }
      }
      await bewaarSnapshots(rijen)
      setOpgeslagen(rijen.length)
      setBestanden([])
      await naOpslaan()
    } catch (e) {
      setFout(`Opslaan mislukt: ${e.message}`)
    } finally {
      setBezig(false)
    }
  }

  return (
    <>
      <h2>Bestanden uploaden</h2>
      <p style={{ color: 'var(--ink-2)', maxWidth: 640 }}>
        Sleep hier de maandelijkse W&V-rekening en de zeven productiviteitsbestanden naartoe
        (mag ook in delen; productiviteitsbestanden kun je later naleveren). De ruwe bestanden
        worden niet opgeslagen, alleen de geparste regiototalen. De sheet 'Personeel' wordt
        nooit gelezen.
      </p>

      <div
        className={`dropzone ${sleep ? 'actief' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setSleep(true) }}
        onDragLeave={() => setSleep(false)}
        onDrop={(e) => { e.preventDefault(); setSleep(false); verwerk([...e.dataTransfer.files]) }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <b>Sleep Excel-bestanden hierheen</b> of klik om te bladeren
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.xlsm"
          hidden
          onChange={(e) => { verwerk([...e.target.files]); e.target.value = '' }}
        />
      </div>

      {bestanden.length > 0 && (
        <div className="bestand-lijst">
          {bestanden.map((b, i) => (
            <div className="bestand-rij" key={i}>
              <span className="naam">{b.naam}</span>
              {b.status === 'ok' && b.type === 'wenv' && (
                <>
                  <span className="badge ok">W&V-rekening</span>
                  {b.resultaat.periode && <span className="badge">P{b.resultaat.periode}</span>}
                  <span className="badge">{Object.keys(b.resultaat.entiteiten).length} entiteiten</span>
                </>
              )}
              {b.status === 'ok' && b.type === 'productiviteit' && (
                <>
                  <span className="badge ok">Productiviteit</span>
                  <span className="badge">{b.resultaat.entiteit ? entiteitLabel(b.resultaat.entiteit) : 'regio onbekend'}</span>
                  {b.resultaat.laatsteActueleMaand && <span className="badge">actueel t/m maand {b.resultaat.laatsteActueleMaand}</span>}
                </>
              )}
              {b.status === 'fout' && <span className="badge fout" title={b.fout}>niet gelezen: {b.fout}</span>}
              <button className="knop" onClick={() => setBestanden(bestanden.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
      )}

      {validatie && (
        <div className="validatie">
          <b>Validatie</b>
          <ul>
            <li>
              W&V-rekening: {wenvBestanden.length ? <span className="ok-tekst">binnen</span> : <span className="waarschuwing-tekst">nog niet geüpload</span>}
            </li>
            <li>
              Productiviteit binnen: {validatie.prodRegios.length ? validatie.prodRegios.map(entiteitLabel).join(', ') : 'geen'}
              {validatie.ontbrekend.length > 0 && validatie.ontbrekend.length < 7 && (
                <span className="waarschuwing-tekst"> — ontbreekt: {validatie.ontbrekend.map(entiteitLabel).join(', ')}</span>
              )}
            </li>
            {validatie.meldingen.map((m, i) => (
              <li key={i} className="waarschuwing-tekst">{m}</li>
            ))}
          </ul>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            <label>Rapportagemaand:</label>
            <select className="maand-select" value={maandNr ?? ''} onChange={(e) => setMaandNr(parseInt(e.target.value, 10))}>
              <option value="" disabled>maand…</option>
              {MAAND_OPTIES.map((m) => (
                <option key={m} value={m}>{maandLabel(maandIso(2000, m)).split(' ')[0]}</option>
              ))}
            </select>
            <input
              type="number"
              className="maand-select"
              style={{ width: 90 }}
              value={jaar}
              onChange={(e) => setJaar(parseInt(e.target.value, 10) || jaar)}
            />
            <button className="knop primair" onClick={opslaan} disabled={bezig || !maand || !geslaagd.length}>
              {bezig ? 'Bezig met opslaan…' : overschrijft ? `Opslaan (overschrijft ${maandLabel(maand)})` : maand ? `Opslaan als ${maandLabel(maand)}` : 'Opslaan'}
            </button>
          </div>
          {overschrijft && (
            <p className="waarschuwing-tekst" style={{ marginBottom: 0 }}>
              Let op: voor {maandLabel(maand)} bestaat al data ({overschrijft.join(', ')}). Opslaan overschrijft die na bevestiging.
            </p>
          )}
        </div>
      )}

      {opgeslagen != null && (
        <div className="validatie ok-tekst">✓ {opgeslagen} snapshots opgeslagen. Het dashboard is bijgewerkt.</div>
      )}
      {fout && <div className="fout-melding">{fout}</div>}
    </>
  )
}
