import { HCC, REGIOS, entiteitLabel, maandLabel } from '../lib/entities.js'
import { fmtK, fmtPct } from '../lib/format.js'
import { brutalFacts } from '../lib/brutalFacts.js'

// "In één oogopslag": de vier dingen die je als directeur eerst wilt weten.
export default function OverzichtStrip({ idx, maand }) {
  const hcc = idx.wenv[HCC]?.[maand]?.mtd
  const omzet = hcc?.nettoOmzet
  const or = hcc?.operationeelResultaat

  const alleBevindingen = [HCC, ...REGIOS].flatMap((ent) => brutalFacts(idx, ent, maand))
  const rood = alleBevindingen.filter((b) => b.ernst === 'rood').length
  const oranje = alleBevindingen.filter((b) => b.ernst === 'oranje').length

  const regiosMetOr = REGIOS
    .map((r) => ({ regio: r, dFc: idx.wenv[r]?.[maand]?.mtd?.operationeelResultaat?.dFc }))
    .filter((r) => r.dFc != null)
    .sort((a, b) => a.dFc - b.dFc)
  const slechtste = regiosMetOr[0]
  const beste = regiosMetOr[regiosMetOr.length - 1]

  const items = [
    omzet && {
      label: 'Omzet vs forecast',
      waarde: fmtK(omzet.dFc, { plus: true }),
      sub: omzet.fc ? fmtPct(omzet.dFc / omzet.fc, { plus: true }) : null,
      status: omzet.dFc >= 0 ? 'goed' : 'slecht',
    },
    or && {
      label: 'OR vs forecast',
      waarde: fmtK(or.dFc, { plus: true }),
      sub: or.act != null ? `${fmtK(or.act)} gerealiseerd` : null,
      status: or.dFc >= 0 ? 'goed' : 'slecht',
    },
    {
      label: 'Signalen',
      waarde: `${rood} rood · ${oranje} oranje`,
      sub: 'over alle entiteiten',
      status: rood > 0 ? 'slecht' : oranje > 0 ? 'matig' : 'goed',
    },
    slechtste && beste && slechtste.regio !== beste.regio && {
      label: 'Uitersten (OR vs FC)',
      waarde: `${entiteitLabel(slechtste.regio)} ${fmtK(slechtste.dFc, { plus: true })}`,
      sub: `beste: ${entiteitLabel(beste.regio)} ${fmtK(beste.dFc, { plus: true })}`,
      status: 'neutraal',
    },
  ].filter(Boolean)

  if (!items.length) return null

  return (
    <div className="overzicht-strip">
      <div className="overzicht-kop">In één oogopslag — {maandLabel(maand)}</div>
      <div className="overzicht-items">
        {items.map((item, i) => (
          <div className={`overzicht-item status-${item.status}`} key={i}>
            <span className="overzicht-label">{item.label}</span>
            <span className="overzicht-waarde">{item.waarde}</span>
            {item.sub && <span className="overzicht-sub">{item.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
