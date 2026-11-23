import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')
const read = (...parts: string[]) => readFileSync(resolve(root, ...parts), 'utf8')

describe('ProductApplicationsEditor antiregress', () => {
  it('editor product-centric: fila, retirar, trocar, período', () => {
    const editor = read('components/admin/applications/ProductApplicationsEditor.tsx')
    expect(editor).toMatch(/Adicionar à fila/)
    expect(editor).toMatch(/Vincular fila/)
    expect(editor).toMatch(/Retirar/)
    expect(editor).toMatch(/Trocar veículo/)
    expect(editor).toMatch(/adminUpdateApplicationYears/)
    expect(editor).toMatch(/adminUpdateApplicationVehicleVersion/)
    expect(editor).toMatch(/adminRemoveApplication/)
    expect(editor).toMatch(/adminAddApplicationsBulk/)
  })

  it('hub abre guia por productId', () => {
    const page = read('pages/admin/products/AdminApplicationsPage.tsx')
    expect(page).toMatch(/openProductGuide\(row\.productId\)/)
    expect(page).toMatch(/ProductApplicationsEditor/)
    expect(page).toMatch(/onOpenProduct/)
  })

  it('ficha reutiliza o editor', () => {
    const section = read('components/admin/AdminProductApplicationsSection.tsx')
    expect(section).toMatch(/ProductApplicationsEditor/)
    expect(section).toMatch(/variant="section"/)
  })

  it('guia produto embute editor com Trocar veículo (G3)', () => {
    const surface = read('components/admin/products/ProductWorkSurface.tsx')
    expect(surface).toMatch(/ProductApplicationsEditor/)
    expect(surface).toMatch(/variant="embedded"/)
    expect(surface).toMatch(/reloadAppsCount|onMutated/)
    expect(surface).not.toMatch(/G3: surface completa/)

    const editor = read('components/admin/applications/ProductApplicationsEditor.tsx')
    expect(editor).toMatch(/Trocar veículo/)
    expect(editor).toMatch(/adminUpdateApplicationVehicleVersion/)
    expect(editor).toMatch(/embedded/)
  })
})
