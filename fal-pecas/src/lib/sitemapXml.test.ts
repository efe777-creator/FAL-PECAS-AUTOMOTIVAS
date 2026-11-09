import { describe, expect, it } from 'vitest'
import {
  buildSitemapXml,
  buildStoreSitemapEntries,
  escapeXml,
  productSitemapLoc,
} from './sitemapXml'

describe('sitemapXml', () => {
  it('escapa entidades XML', () => {
    expect(escapeXml(`a&b<"'>`)).toBe('a&amp;b&lt;&quot;&apos;&gt;')
  })

  it('monta loc de produto com encode', () => {
    expect(productSitemapLoc('https://loja.example', 'sk 1')).toBe(
      'https://loja.example/produto/sk%201',
    )
  })

  it('inclui estáticos + produtos sem duplicar slug', () => {
    const entries = buildStoreSitemapEntries({
      siteOrigin: 'https://loja.example/',
      products: [
        { slug: 'sk1', updatedAt: '2026-11-05T12:00:00Z' },
        { slug: 'sk1' },
        { slug: '  ' },
      ],
    })
    expect(entries.map((e) => e.loc)).toEqual([
      'https://loja.example/',
      'https://loja.example/catalogo',
      'https://loja.example/veiculo',
      'https://loja.example/termos',
      'https://loja.example/privacidade',
      'https://loja.example/trocas-devolucoes',
      'https://loja.example/produto/sk1',
    ])
    const xml = buildSitemapXml(entries)
    expect(xml).toContain('<lastmod>2026-11-05</lastmod>')
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
  })
})
