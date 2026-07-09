// Kleine, veilige Markdown-weergave voor de AI-analyse.
// Bouwt React-elementen (geen innerHTML), dus geen XSS-risico.

function inline(tekst, keyBasis) {
  const delen = []
  // **vet**, *cursief* en `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g
  let laatste = 0
  let m
  let i = 0
  while ((m = regex.exec(tekst)) !== null) {
    if (m.index > laatste) delen.push(tekst.slice(laatste, m.index))
    const t = m[0]
    if (t.startsWith('**')) delen.push(<strong key={`${keyBasis}-${i++}`}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) delen.push(<code key={`${keyBasis}-${i++}`}>{t.slice(1, -1)}</code>)
    else delen.push(<em key={`${keyBasis}-${i++}`}>{t.slice(1, -1)}</em>)
    laatste = m.index + t.length
  }
  if (laatste < tekst.length) delen.push(tekst.slice(laatste))
  return delen
}

export default function Markdown({ tekst }) {
  if (!tekst) return null
  const regels = String(tekst).replace(/\r\n/g, '\n').split('\n')
  const blokken = []
  let lijst = null
  let lijstType = null
  let key = 0

  const sluitLijst = () => {
    if (lijst) {
      blokken.push(lijstType === 'ol' ? <ol key={key++}>{lijst}</ol> : <ul key={key++}>{lijst}</ul>)
      lijst = null
      lijstType = null
    }
  }

  for (const regel of regels) {
    const r = regel.trimEnd()
    const kop = r.match(/^(#{1,4})\s+(.*)$/)
    const bullet = r.match(/^\s*[-*•]\s+(.*)$/)
    const nummer = r.match(/^\s*\d+[.)]\s+(.*)$/)

    if (kop) {
      sluitLijst()
      const niveau = Math.min(kop[1].length + 2, 5) // # -> h3, ## -> h4 (past in de kaart)
      const Tag = `h${niveau}`
      blokken.push(<Tag key={key++} className="md-kop">{inline(kop[2], key)}</Tag>)
    } else if (bullet) {
      if (lijstType !== 'ul') sluitLijst()
      lijstType = 'ul'
      lijst = lijst || []
      lijst.push(<li key={key++}>{inline(bullet[1], key)}</li>)
    } else if (nummer) {
      if (lijstType !== 'ol') sluitLijst()
      lijstType = 'ol'
      lijst = lijst || []
      lijst.push(<li key={key++}>{inline(nummer[1], key)}</li>)
    } else if (!r.trim()) {
      sluitLijst()
    } else {
      sluitLijst()
      blokken.push(<p key={key++}>{inline(r, key)}</p>)
    }
  }
  sluitLijst()
  return <div className="markdown">{blokken}</div>
}
