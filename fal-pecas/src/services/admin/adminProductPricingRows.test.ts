import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')
const read = (...parts: string[]) => readFileSync(resolve(root, ...parts), 'utf8')

describe('adminGetProductPricingRows + guia G2', () => {
  it('API exporta rows ricas e ensure na lista', () => {
    const svc = read('services/admin/adminPriceListService.ts')
    expect(svc).toMatch(/export async function adminGetProductPricingRows/)
    expect(svc).toMatch(/export type ProductPricingRow/)
    expect(svc).toMatch(/export async function adminEnsureProductOnPriceList/)
    expect(svc).toMatch(/missing:\$\{pid\}|missing:\$\{/)
  })

  it('ProductWorkSurface usa modal e APIs de precificação', () => {
    const surface = read('components/admin/products/ProductWorkSurface.tsx')
    expect(surface).toMatch(/PriceItemPricingModal/)
    expect(surface).toMatch(/adminGetProductPricingRows/)
    expect(surface).toMatch(/adminEnsureProductOnPriceList/)
    expect(surface).toMatch(/adminSetPriceListItemPricing/)
    expect(surface).not.toMatch(/G2: seletor multi-lista/)
  })
})
