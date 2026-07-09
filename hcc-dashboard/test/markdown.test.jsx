import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from '../src/lib/markdown.jsx'

const render = (tekst) => renderToStaticMarkup(<Markdown tekst={tekst} />)

describe('Markdown', () => {
  it('rendert kopjes, vet en lijsten', () => {
    const html = render('## Conclusie\nDe **OR-miss** is een kostenprobleem.\n\n- punt een\n- punt twee\n\n1. actie een\n2. actie twee')
    expect(html).toContain('<h4 class="md-kop">Conclusie</h4>')
    expect(html).toContain('<strong>OR-miss</strong>')
    expect(html).toContain('<ul><li>punt een</li><li>punt twee</li></ul>')
    expect(html).toContain('<ol><li>actie een</li><li>actie twee</li></ol>')
  })

  it('escapet HTML in de invoer (geen injectie)', () => {
    const html = render('tekst met <script>alert(1)</script> erin')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('rendert platte tekst gewoon als alinea’s', () => {
    const html = render('regel een\nregel twee')
    expect(html).toContain('<p>regel een</p>')
    expect(html).toContain('<p>regel twee</p>')
  })
})
