import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LEGAL_DOC_PATH, LEGAL_POLICY_CARDS } from './legalVersions'

const root = resolve(__dirname, '../..')

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('legal nav anti-regressão (#14 limpeza)', () => {
  it('generate-sitemap.mjs espelha as 8 políticas + /suporte', () => {
    const script = read('scripts/generate-sitemap.mjs')
    expect(script).toMatch(/\/suporte/)
    for (const path of Object.values(LEGAL_DOC_PATH)) {
      expect(script).toContain(path)
    }
  })

  it('Footer aponta Central sem listar as 8 políticas', () => {
    const footer = read('src/components/layout/Footer.tsx')
    expect(footer).toMatch(/to="\/suporte"/)
    expect(footer).toMatch(/LEGAL_DOC_PATH/)
    expect(footer).not.toMatch(/termos-comerciais/)
    expect(footer).not.toMatch(/frete-entrega/)
    expect(footer).not.toMatch(/compatibilidade/)
  })

  it('cards de política têm paths únicos alinhados a LEGAL_DOC_PATH', () => {
    expect(LEGAL_POLICY_CARDS).toHaveLength(8)
    for (const card of LEGAL_POLICY_CARDS) {
      expect(card.path).toBe(LEGAL_DOC_PATH[card.kind])
    }
  })
})
