import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseGeconfigureerd, demoModus } from './lib/supabase.js'
import { haalSnapshotsOp } from './lib/store.js'
import { indexeerSnapshots, laatsteMaand } from './lib/kpi.js'
import { maandLabel } from './lib/entities.js'
import Login from './components/Login.jsx'
import UploadPage from './components/UploadPage.jsx'
import DashboardHCC from './components/DashboardHCC.jsx'
import DashboardRegio from './components/DashboardRegio.jsx'

export default function App() {
  const [sessie, setSessie] = useState(undefined) // undefined = nog aan het laden
  const [snapshots, setSnapshots] = useState(null)
  const [laadFout, setLaadFout] = useState(null)
  const [pagina, setPagina] = useState('hcc')
  const [maand, setMaand] = useState(null)

  useEffect(() => {
    if (!supabaseGeconfigureerd) return
    if (demoModus) {
      setSessie({ demo: true })
      return
    }
    supabase.auth.getSession().then(({ data }) => setSessie(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, nieuweSessie) => setSessie(nieuweSessie))
    return () => sub.subscription.unsubscribe()
  }, [])

  const laadData = useCallback(async () => {
    try {
      setLaadFout(null)
      const rijen = await haalSnapshotsOp()
      setSnapshots(rijen)
    } catch (e) {
      setLaadFout(e.message)
      setSnapshots([])
    }
  }, [])

  useEffect(() => {
    if (sessie) laadData()
  }, [sessie, laadData])

  const idx = useMemo(() => indexeerSnapshots(snapshots || []), [snapshots])
  const actieveMaand = maand && idx.maanden.includes(maand) ? maand : laatsteMaand(idx)

  if (!supabaseGeconfigureerd) {
    return (
      <div className="centreer">
        <div className="paneel lege-staat">
          <h1>Configuratie ontbreekt</h1>
          <p>
            Zet <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_ANON_KEY</code> in een{' '}
            <code>.env</code>-bestand (lokaal) of als environment variables op Netlify. Zie SETUP.md
            voor de stap-voor-stap handleiding.
          </p>
        </div>
      </div>
    )
  }

  if (sessie === undefined) return null
  if (!sessie) return <Login />

  const heeftData = idx.maanden.length > 0

  return (
    <>
      <header className="app-header">
        <h1>HCC Maandcijfers</h1>
        <nav className="tabs">
          <button className={pagina === 'hcc' ? 'actief' : ''} onClick={() => setPagina('hcc')}>HCC totaal</button>
          <button className={pagina === 'regio' ? 'actief' : ''} onClick={() => setPagina('regio')}>Per regio</button>
          <button className={pagina === 'upload' ? 'actief' : ''} onClick={() => setPagina('upload')}>Upload</button>
        </nav>
        <span className="spacer" />
        {heeftData && pagina !== 'upload' && (
          <select className="maand-select" value={actieveMaand || ''} onChange={(e) => setMaand(e.target.value)}>
            {idx.maanden.map((m) => (
              <option key={m} value={m}>{maandLabel(m)}</option>
            ))}
          </select>
        )}
        {pagina !== 'upload' && heeftData && (
          <button className="knop" onClick={() => window.print()}>Exporteer / print</button>
        )}
        {demoModus
          ? <span className="badge">demomodus — data wordt niet bewaard</span>
          : <button className="knop" onClick={() => supabase.auth.signOut()}>Uitloggen</button>}
      </header>

      <main>
        <div className="print-kop">
          <h1 style={{ margin: 0 }}>HCC Maandcijfers — {actieveMaand ? maandLabel(actieveMaand) : ''}</h1>
        </div>

        {laadFout && (
          <div className="fout-melding" style={{ marginBottom: 14 }}>
            Data laden mislukt: {laadFout}. Controleer de Supabase-configuratie en RLS (zie SETUP.md).
          </div>
        )}

        {snapshots === null && !laadFout && <p>Data laden…</p>}

        {snapshots !== null && !heeftData && pagina !== 'upload' && (
          <div className="centreer" style={{ minHeight: '50vh' }}>
            <div className="paneel lege-staat">
              <h1>Nog geen data</h1>
              <p>Upload elke maand twee soorten Excel-bestanden:</p>
              <ol>
                <li>
                  <b>W&V-rekening</b> — één bestand met de sheets 'HCC Totaal MTD', 'Per regio MTD',
                  'HCC Totaal YTD' en 'Per regio YTD'.
                </li>
                <li>
                  <b>Productiviteitsbestanden</b> — zeven bestanden, één per regio, met een sheet die
                  begint met 'Maand prod'. Deze mogen ook later worden nageleverd.
                </li>
              </ol>
              <button className="knop primair" onClick={() => setPagina('upload')}>Naar uploaden</button>
            </div>
          </div>
        )}

        {snapshots !== null && (
          <>
            {pagina === 'upload' && <UploadPage idx={idx} naOpslaan={laadData} />}
            {pagina === 'hcc' && heeftData && actieveMaand && <DashboardHCC idx={idx} maand={actieveMaand} />}
            {pagina === 'regio' && heeftData && actieveMaand && <DashboardRegio idx={idx} maand={actieveMaand} />}
          </>
        )}
      </main>
    </>
  )
}
