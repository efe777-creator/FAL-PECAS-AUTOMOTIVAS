import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const LOJA = resolve(__dirname, 'shippingPacking.ts')
const EDGE = resolve(
  __dirname,
  '../../supabase/functions/_shared/shippingPacking.ts',
)

/** Remove comentários e whitespace para comparar regra (não JSDoc). */
function normalizeRuleSource(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\s+/g, '')
}

describe('shippingPacking parity loja ↔ Edge (O1-C)', () => {
  const loja = readFileSync(LOJA, 'utf8')
  const edge = readFileSync(EDGE, 'utf8')

  it('espelho Edge existe e declara as mesmas exports', () => {
    expect(edge).toMatch(/Espelho de src\/lib\/shippingPacking\.ts/)
    for (const name of [
      'pickSmallestFittingBox',
      'sumItemsWeightKg',
      'resolvePackingStrategy',
      'PackingBox',
      'PackingItem',
      'PackingStrategy',
    ]) {
      expect(loja).toContain(name)
      expect(edge).toContain(name)
    }
  })

  it('corpos das regras batem após normalizar', () => {
    expect(normalizeRuleSource(loja)).toBe(normalizeRuleSource(edge))
  })

  it('estratégias canônicas presentes nos dois lados', () => {
    for (const mode of ['box_template', 'per_item', 'packing_failed'] as const) {
      expect(loja).toContain(`'${mode}'`)
      expect(edge).toContain(`'${mode}'`)
    }
  })
})
