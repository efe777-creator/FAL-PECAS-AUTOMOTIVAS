/**
 * Anti-regressão: Hostinger only (decisão 2026-11-23).
 * Impede recolocar Netlify como host canônico de produção nos docs/env.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const falPecasRoot = resolve(__dirname, '../..')
const repoRoot = resolve(falPecasRoot, '..')

function readRepo(rel: string) {
  return readFileSync(resolve(repoRoot, rel), 'utf8')
}

function readApp(rel: string) {
  return readFileSync(resolve(falPecasRoot, rel), 'utf8')
}

describe('Hostinger-only anti-regressão (deploy / domínio)', () => {
  it('decisão canônica: D1–D6 Hostinger only · Netlify inativo · cutover separado', () => {
    const doc = readRepo(
      'docs/planejamento/FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23.md',
    )
    expect(doc).toMatch(/DECISÃO TRAVADA/)
    expect(doc).toMatch(/\|\s*D1\s*\|/)
    expect(doc).toMatch(/\|\s*D2\s*\|/)
    expect(doc).toMatch(/\|\s*D6\s*\|/)
    expect(doc).toMatch(/Hostinger.*único.*host|único\*\* host/i)
    expect(doc).toMatch(/Netlify.*inativo|inativo.*Netlify/i)
    expect(doc).toMatch(/MARCHA HOSTINGER-ONLY CUTOVER/)
    expect(doc).not.toMatch(/Netlify é o único host/i)
  })

  it('domínio→Netlify 22/11 é HISTÓRICO / SUPERSEDIDO', () => {
    const doc = readRepo(
      'docs/planejamento/FAL_DOMINIO_FALPECASAUTOMOTIVAS_NETLIFY_2026-11-22.md',
    )
    expect(doc).toMatch(/HISTÓRICO\s*\/\s*SUPERSEDIDO|SUPERSEDIDO/)
    expect(doc).toMatch(/FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23/)
    expect(doc).toMatch(/Não usar como autoridade de deploy/)
  })

  it('#15-B alinhado a Hostinger-only (não Netlify-as-host)', () => {
    const doc = readRepo(
      'docs/planejamento/FAL_CHECKLIST_HOSTINGER_DOMINIO_ADS_15B_2026-11-22.md',
    )
    expect(doc).toMatch(/Hostinger-only|Hostinger only/i)
    expect(doc).toMatch(/Netlify[\s\S]{0,80}Inativo|Inativo[\s\S]{0,40}Netlify/i)
    expect(doc).toMatch(/falpecasautomotivas\.com/)
    expect(doc).not.toMatch(/front FAL continuar no Netlify/)
  })

  it('índice canônico aponta Hostinger only e marca Netlify doc histórico', () => {
    const idx = readRepo('docs/entrada/FAL_INDICE_CANONICO.md')
    expect(idx).toMatch(/FAL_DECISAO_INATIVAR_NETLIFY_HOSTINGER_ONLY_2026-11-23/)
    expect(idx).toMatch(/Hostinger only/)
    expect(idx).toMatch(/FAL_DOMINIO_FALPECASAUTOMOTIVAS_NETLIFY_2026-11-22/)
    expect(idx).toMatch(/Histórico — Netlify-as-host/)
  })

  it('.env.example: origem canônica = domínio FAL; sem default prod Netlify', () => {
    const env = readApp('.env.example')
    expect(env).toMatch(/VITE_SITE_ORIGIN=https:\/\/falpecasautomotivas\.com/)
    expect(env).toMatch(/Hostinger only|Host front = Hostinger/i)
    expect(env).not.toMatch(/Default:\s*Netlify loja/)
    // URL netlify só como comentário legado explícito, se existir — não como canônico ativo
    const activeOriginLines = env
      .split('\n')
      .filter((l) => /^\s*VITE_SITE_ORIGIN=/.test(l) && !l.trim().startsWith('#'))
    expect(activeOriginLines).toHaveLength(0)
  })

  it('netlify.toml marcado LEGADO (não host canônico de prod)', () => {
    const toml = readRepo('netlify.toml')
    expect(toml).toMatch(/LEGADO|histórico|não.*host canônico|Hostinger only/i)
    expect(toml).toMatch(/base\s*=\s*"fal-pecas"/)
    expect(toml).toMatch(/publish\s*=\s*"dist"/)
  })

  it('public/ sem páginas de teste MP (não publicar em Hostinger)', () => {
    expect(existsSync(resolve(falPecasRoot, 'public/dev-mp-vanilla.html'))).toBe(false)
    expect(existsSync(resolve(falPecasRoot, 'public/dev-mp-fields.html'))).toBe(false)
  })
})
