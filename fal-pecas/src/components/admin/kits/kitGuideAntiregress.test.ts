import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')
const read = (...parts: string[]) => readFileSync(resolve(root, ...parts), 'utf8')

describe('Kit guide rica antiregress', () => {
  it('KitWorkSurface tem mini-menus e painéis', () => {
    const surface = read('components/admin/kits/KitWorkSurface.tsx')
    expect(surface).toMatch(/composicao/)
    expect(surface).toMatch(/identidade/)
    expect(surface).toMatch(/precos/)
    expect(surface).toMatch(/aplicacoes/)
    expect(surface).toMatch(/AdminProductKitSection/)
    expect(surface).toMatch(/ProductApplicationsEditor/)
    expect(surface).toMatch(/variant="embedded"/)
    expect(surface).toMatch(/onPriceModeChange/)
  })

  it('AdminProductKitSection compact + onMutated + modo preço', () => {
    const section = read('components/admin/AdminProductKitSection.tsx')
    expect(section).toMatch(/onMutated/)
    expect(section).toMatch(/onPriceModeChange/)
    expect(section).toMatch(/handleSetPriceMode/)
    expect(section).toMatch(/compact/)
  })
})
