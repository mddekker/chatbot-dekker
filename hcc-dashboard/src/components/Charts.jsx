import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, Cell,
} from 'recharts'
import { fmtK, fmtPct, fmtUren } from '../lib/format.js'
import { NORM_NETTO_PRODUCTIVITEIT, NORM_ALGEMENE_UREN } from '../lib/parseProductiviteit.js'

const KLEUR = {
  act: 'var(--series-1)',
  bud: '#898781',
  fc: '#4a3aa7',
  preventie: '#2a78d6',
  verzuim: '#1baf7a',
  interventie: '#eda100',
  norm: '#d03b3b',
}

const MAAND_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function maandTick(maandIso) {
  const [jaar, mnd] = String(maandIso).split('-')
  return `${MAAND_KORT[parseInt(mnd, 10) - 1]} '${jaar.slice(2)}`
}

const AS_PROPS = {
  tick: { fontSize: 11.5, fill: 'var(--muted)' },
  axisLine: { stroke: 'var(--baseline)' },
  tickLine: false,
}
const GRID = <CartesianGrid stroke="var(--grid)" vertical={false} />
const TOOLTIP_STIJL = {
  contentStyle: {
    background: 'var(--surface-1)', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 12.5,
  },
  labelFormatter: maandTick,
}
const LEGENDA = <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" iconSize={14} />

function Kaart({ titel, sub, children, hoogte = 240 }) {
  return (
    <div className="grafiek-kaart">
      <h3>{titel}</h3>
      {sub && <p className="sub">{sub}</p>}
      <ResponsiveContainer width="100%" height={hoogte}>{children}</ResponsiveContainer>
    </div>
  )
}

// Omzet of OR: ACT vs BUD vs FC.
export function ActBudFcChart({ data, veldPrefix, titel }) {
  return (
    <Kaart titel={titel}>
      <LineChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="maand" tickFormatter={maandTick} {...AS_PROPS} />
        <YAxis tickFormatter={(v) => fmtK(v)} width={62} {...AS_PROPS} />
        <Tooltip {...TOOLTIP_STIJL} formatter={(v) => fmtK(v)} />
        {LEGENDA}
        <Line isAnimationActive={false} name="Budget" dataKey={`${veldPrefix}Bud`} stroke={KLEUR.bud} strokeWidth={1.6} strokeDasharray="5 4" dot={false} />
        <Line isAnimationActive={false} name="Forecast" dataKey={`${veldPrefix}Fc`} stroke={KLEUR.fc} strokeWidth={1.6} strokeDasharray="2 3" dot={false} />
        <Line isAnimationActive={false} name="Actueel" dataKey={`${veldPrefix}Act`} stroke={KLEUR.act} strokeWidth={2.2} dot={{ r: 2.5 }} />
      </LineChart>
    </Kaart>
  )
}

export function ProductiviteitChart({ data }) {
  return (
    <Kaart titel="Netto productiviteit" sub={`Normlijn op ${fmtPct(NORM_NETTO_PRODUCTIVITEIT)}`}>
      <LineChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="maand" tickFormatter={maandTick} {...AS_PROPS} />
        <YAxis tickFormatter={(v) => fmtPct(v)} width={52} domain={[0.3, 0.9]} {...AS_PROPS} />
        <Tooltip {...TOOLTIP_STIJL} formatter={(v) => fmtPct(v)} />
        {LEGENDA}
        <ReferenceLine y={NORM_NETTO_PRODUCTIVITEIT} stroke={KLEUR.norm} strokeDasharray="4 4"
          label={{ value: 'norm 64,0%', position: 'insideTopRight', fontSize: 11, fill: KLEUR.norm }} />
        <Line isAnimationActive={false} name="Bruto" dataKey="brutoProd" stroke={KLEUR.bud} strokeWidth={1.6} strokeDasharray="5 4" dot={false} />
        <Line isAnimationActive={false} name="Netto" dataKey="nettoProd" stroke={KLEUR.act} strokeWidth={2.2} dot={{ r: 2.5 }} />
      </LineChart>
    </Kaart>
  )
}

export function VerzuimChart({ data }) {
  return (
    <Kaart titel="Verzuim per maand" sub="Verzuimuren per FTE">
      <LineChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="maand" tickFormatter={maandTick} {...AS_PROPS} />
        <YAxis tickFormatter={(v) => fmtUren(v)} width={54} {...AS_PROPS} />
        <Tooltip {...TOOLTIP_STIJL} formatter={(v) => fmtUren(v)} />
        <Line isAnimationActive={false} name="Verzuimuren per FTE" dataKey="verzuimUren" stroke={KLEUR.act} strokeWidth={2.2} dot={{ r: 2.5 }} />
      </LineChart>
    </Kaart>
  )
}

export function OmzetMixChart({ data }) {
  return (
    <Kaart titel="Omzetmix per productlijn" sub="Actuele omzet per maand">
      <BarChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 0 }} barCategoryGap="25%">
        {GRID}
        <XAxis dataKey="maand" tickFormatter={maandTick} {...AS_PROPS} />
        <YAxis tickFormatter={(v) => fmtK(v)} width={62} {...AS_PROPS} />
        <Tooltip {...TOOLTIP_STIJL} formatter={(v) => fmtK(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
        <Bar isAnimationActive={false} name="Preventie" dataKey="omzetPreventie" stackId="mix" fill={KLEUR.preventie} stroke="var(--surface-1)" strokeWidth={1} />
        <Bar isAnimationActive={false} name="Verzuimbegeleiding" dataKey="omzetVerzuim" stackId="mix" fill={KLEUR.verzuim} stroke="var(--surface-1)" strokeWidth={1} />
        <Bar isAnimationActive={false} name="A&R" dataKey="omzetInterventie" stackId="mix" fill={KLEUR.interventie} stroke="var(--surface-1)" strokeWidth={1} radius={[3, 3, 0, 0]} />
      </BarChart>
    </Kaart>
  )
}

export function AlgemeneUrenChart({ data }) {
  return (
    <Kaart titel="Algemene uren per FTE" sub={`Norm ${NORM_ALGEMENE_UREN.toLocaleString('nl-NL')} uur per FTE per maand`}>
      <LineChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="maand" tickFormatter={maandTick} {...AS_PROPS} />
        <YAxis tickFormatter={(v) => fmtUren(v)} width={54} {...AS_PROPS} />
        <Tooltip {...TOOLTIP_STIJL} formatter={(v) => fmtUren(v)} />
        <ReferenceLine y={NORM_ALGEMENE_UREN} stroke={KLEUR.norm} strokeDasharray="4 4"
          label={{ value: 'norm 34,4 u', position: 'insideTopRight', fontSize: 11, fill: KLEUR.norm }} />
        <Line isAnimationActive={false} name="Algemene uren per FTE" dataKey="algemeneUren" stroke={KLEUR.act} strokeWidth={2.2} dot={{ r: 2.5 }} />
      </LineChart>
    </Kaart>
  )
}

export function IkvChart({ data }) {
  return (
    <Kaart titel="Interne verrekening (IKV) direct" sub="Negatief = regio leent uit (credit), positief = regio neemt af">
      <LineChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="maand" tickFormatter={maandTick} {...AS_PROPS} />
        <YAxis tickFormatter={(v) => fmtK(v)} width={62} {...AS_PROPS} />
        <Tooltip {...TOOLTIP_STIJL} formatter={(v) => fmtK(v)} />
        <ReferenceLine y={0} stroke="var(--baseline)" />
        <Line isAnimationActive={false} name="IKV direct" dataKey="ikvDirect" stroke={KLEUR.fc} strokeWidth={2.2} dot={{ r: 2.5 }} />
      </LineChart>
    </Kaart>
  )
}

// Productiviteitsbrug als waterval: zwevende bars via een onzichtbaar basissegment.
export function BrugChart({ brug }) {
  if (!brug) return null
  let lopend = 0
  const data = brug.map((stap) => {
    if (stap.type === 'start' || stap.type === 'eind') {
      const rij = { naam: stap.naam, basis: 0, waarde: Math.max(stap.waarde, 0), type: stap.type }
      lopend = stap.waarde
      return rij
    }
    const nieuw = lopend + stap.waarde
    const rij = { naam: stap.naam, basis: Math.min(lopend, nieuw), waarde: Math.abs(stap.waarde), type: stap.type }
    lopend = nieuw
    return rij
  })
  const kleur = (type) =>
    type === 'start' ? 'var(--series-1)'
      : type === 'eind' ? '#1baf7a'
      : type === 'afRood' ? '#d03b3b'
      : '#898781'
  return (
    <Kaart titel="Productiviteitsbrug" sub="Uren per FTE deze maand, van bruto werkbaar naar productief" hoogte={260}>
      <BarChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 0 }} barCategoryGap="18%">
        {GRID}
        <XAxis dataKey="naam" {...AS_PROPS} interval={0} tick={{ fontSize: 10.5, fill: 'var(--muted)' }} />
        <YAxis tickFormatter={(v) => fmtUren(v)} width={54} {...AS_PROPS} />
        <Tooltip
          {...TOOLTIP_STIJL}
          labelFormatter={(l) => l}
          formatter={(v, naam) => (naam === 'uren' ? fmtUren(v) : null)}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const p = payload.find((x) => x.dataKey === 'waarde')
            return (
              <div style={TOOLTIP_STIJL.contentStyle}>
                <div style={{ padding: '6px 10px' }}><b>{label}</b>: {fmtUren(p?.value)}</div>
              </div>
            )
          }}
        />
        <Bar dataKey="basis" stackId="brug" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="waarde" stackId="brug" radius={[3, 3, 0, 0]}>
          {data.map((rij, i) => <Cell key={i} fill={kleur(rij.type)} />)}
        </Bar>
      </BarChart>
    </Kaart>
  )
}

export function Sparkline({ punten }) {
  const data = (punten || []).filter((p) => p.waarde != null)
  if (data.length < 2) return <div className="kpi-spark" />
  return (
    <div className="kpi-spark">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line dataKey="waarde" stroke="var(--series-1)" strokeWidth={1.6} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
