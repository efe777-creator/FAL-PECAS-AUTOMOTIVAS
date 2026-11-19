import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  shouldAutoPurchaseMeLabel,
  stopAfterBlocksPurchase,
} from '../../scripts/lib/meSmokePurchasePolicy.mjs'

const root = resolve(__dirname, '../..')

describe('ME live anti-regressão (política smoke)', () => {
  it('live sem dry-run NÃO compra automaticamente', () => {
    expect(shouldAutoPurchaseMeLabel({ sandbox: false, dryRun: false })).toBe(false)
  })

  it('sandbox ou dry-run permite auto-purchase do smoke', () => {
    expect(shouldAutoPurchaseMeLabel({ sandbox: true, dryRun: false })).toBe(true)
    expect(shouldAutoPurchaseMeLabel({ sandbox: false, dryRun: true })).toBe(true)
  })

  it('STOP_AFTER=prepare bloqueia purchase', () => {
    expect(stopAfterBlocksPurchase('prepare')).toBe(true)
    expect(stopAfterBlocksPurchase('purchase')).toBe(false)
    expect(stopAfterBlocksPurchase('')).toBe(false)
  })
})

describe('ME live anti-regressão (fonte scripts)', () => {
  it('smoke usa política + STOP_AFTER prepare antes de purchase', () => {
    const smoke = readFileSync(resolve(root, 'scripts/smoke-me-label.mjs'), 'utf8')
    expect(smoke).toMatch(/shouldAutoPurchaseMeLabel/)
    expect(smoke).toMatch(/meSmokePurchasePolicy\.mjs/)
    const prepareIdx = smoke.indexOf("stopAfter === 'prepare'")
    const purchaseIdx = smoke.indexOf("action: 'purchase'")
    expect(prepareIdx).toBeGreaterThan(-1)
    expect(purchaseIdx).toBeGreaterThan(-1)
    expect(prepareIdx).toBeLessThan(purchaseIdx)
  })

  it('wire live força API produção + --yes + --env-file (sem token no argv)', () => {
    const wire = readFileSync(resolve(root, 'scripts/wire-me-live-secrets.mjs'), 'utf8')
    expect(wire).toContain('https://melhorenvio.com.br')
    expect(wire).toMatch(/--yes/)
    expect(wire).toMatch(/--env-file/)
    expect(wire).not.toContain('sandbox.melhorenvio.com.br')
    expect(wire).not.toMatch(/MELHOR_ENVIO_TOKEN="\$\{TOKEN\}"/)
  })

  it('Edge purchase gates + packing permanecem no index', () => {
    const idx = readFileSync(
      resolve(root, 'supabase/functions/melhorenvio-label/index.ts'),
      'utf8',
    )
    expect(idx).toMatch(/evaluateMePurchaseGates/)
    expect(idx).toMatch(/order_packing_is_complete/)
  })
})
