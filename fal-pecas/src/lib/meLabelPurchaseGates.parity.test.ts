import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Garante que o espelho Edge (_shared) não perdeu os símbolos da Marcha 4.
 */
describe('meLabelPurchaseGates parity (src ↔ Edge shared)', () => {
  it('Edge shared exporta evaluate + resolve divergence', () => {
    const edge = readFileSync(
      resolve(__dirname, '../../supabase/functions/_shared/meLabelPurchaseGates.ts'),
      'utf8',
    )
    expect(edge).toMatch(/export function evaluateMePurchaseGates/)
    expect(edge).toMatch(/export function resolveFreightDivergenceForPurchase/)
    expect(edge).toMatch(/payment_not_approved/)
    expect(edge).toMatch(/packing_incomplete/)
  })

  it('Edge purchase chama gates e packing RPC', () => {
    const idx = readFileSync(
      resolve(__dirname, '../../supabase/functions/melhorenvio-label/index.ts'),
      'utf8',
    )
    expect(idx).toMatch(/evaluateMePurchaseGates/)
    expect(idx).toMatch(/order_packing_is_complete/)
    expect(idx).toMatch(/divergenceOverride/)
    expect(idx).toMatch(/purchase_in_flight/)
  })

  it('Edge prepare usa packing.volumes quando existir', () => {
    const idx = readFileSync(
      resolve(__dirname, '../../supabase/functions/melhorenvio-label/index.ts'),
      'utf8',
    )
    expect(idx).toMatch(/packingVols/)
    expect(idx).toMatch(/meCartVolumes/)
  })

  it('Edge purchase grava finance G8 (charged vs label)', () => {
    const idx = readFileSync(
      resolve(__dirname, '../../supabase/functions/melhorenvio-label/index.ts'),
      'utf8',
    )
    expect(idx).toMatch(/meFinanceRoot/)
    expect(idx).toMatch(/cost_source: 'me_label'/)
  })
})
