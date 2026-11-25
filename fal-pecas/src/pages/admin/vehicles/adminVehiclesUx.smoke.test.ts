import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Smoke estático — jornadas admin veículos (lista+guia Adaptive + hub ponte).
 * Sem browser / sem rede.
 */
const root = resolve(__dirname, '../../../..')
const read = (...parts: string[]) => readFileSync(resolve(root, 'src', ...parts), 'utf8')

describe('Admin veículos UX smoke (lista + guia)', () => {
  const page = read('pages/admin/vehicles/AdminVehiclesPage.tsx')
  const guide = read('components/admin/vehicles/AdminVehicleGuidePanel.tsx')
  const hub = read('pages/admin/vehicles/AdminVehicleIntegrationsHubPage.tsx')
  const bridges = read('lib/adminGuideBridges.ts')
  const peel = read('lib/vehicles/peelEngineFromVersionName.ts')

  it('jornada manual: Adaptive + create verified + open guia', () => {
    expect(page).toMatch(/moduleKey="vehicles"/)
    expect(page).toMatch(/AdaptiveWorkspace/)
    expect(page).toMatch(/useIdSplitTabs/)
    expect(page).toMatch(/AdminVehicleGuidePanel/)
    expect(page).toMatch(/fal-admin-scroll/)
    expect(page).toMatch(/max-h-\[min\(60dvh,640px\)\]/)
    expect(page).toMatch(/onDoubleClick/)
    expect(page).toMatch(/Abrir guia/)
    expect(page).toMatch(/Modelo criado \(verified\)/)
    expect(page).toMatch(/Buscar \(qualquer termo\)/)
    expect(page).toMatch(/filterQuality/)
    expect(page).toMatch(/filterStatus/)
  })

  it('guia: modelo + VV + peel + approve form (sem prompt)', () => {
    expect(guide).toMatch(/peelEngineFromVersionName/)
    expect(guide).toMatch(/adminUpsertVersionYearRange/)
    expect(guide).toMatch(/adminReconcileVersionYearRange/)
    expect(guide).toMatch(/assertVersionYearsWithinModelLife/)
    expect(guide).toMatch(/groupVersionsByConfig/)
    expect(guide).toMatch(/Ano início/)
    expect(guide).toMatch(/Ano fim/)
    expect(guide).toMatch(/Editar período/)
    expect(guide).toMatch(/formatVersionPeriodLabel/)
    expect(guide).toMatch(/setModelQualityStatus/)
    expect(guide).toMatch(/Salvar situação/)
    expect(guide).toMatch(/qualityDraft/)
    expect(guide).toMatch(/STAFF_QUALITY_EVIDENCE_KIND/)
    expect(guide).not.toMatch(/URL evidência/)
    expect(guide).not.toMatch(/Aplicações[\s\S]{0,200}>\s*Fechar\s*</)
    expect(guide).toMatch(/quarantined/)
    expect(guide).toMatch(/superseded/)
    expect(guide).toMatch(/onDoubleClick/)
    expect(guide).not.toMatch(/window\.prompt/)
    expect(peel).toMatch(/peelEngineFromVersionName/)
    const provider = read('services/vehicles/vehicleMasterProvider.ts')
    expect(provider).toMatch(/master_api/)
    expect(provider).toMatch(/staff_override/)
    const expand = read('lib/vehicles/expandVersionYearRange.ts')
    expect(expand).toMatch(/assertVersionYearsWithinModelLife/)
    expect(expand).toMatch(/yearsInInclusiveRange/)
    const svc = read('services/admin/adminVehicleService.ts')
    expect(svc).toMatch(/export async function adminUpsertVersionYearRange/)
    expect(svc).toMatch(/export async function adminReconcileVersionYearRange/)
  })

  it('hub: ponte guia + quarentena form + zero prompt', () => {
    expect(bridges).toMatch(/VEHICLES_OPEN_GUIDE_KEY/)
    expect(hub).toMatch(/VEHICLES_OPEN_GUIDE_KEY/)
    expect(hub).toMatch(/setGuideBridge/)
    expect(hub).toMatch(/openVehicleGuide/)
    expect(hub).toMatch(/>\s*Verificar\s*</)
    expect(hub).toMatch(/quarantineFormId/)
    expect(hub).toMatch(/nasce[\s\S]{0,40}verified/i)
    expect(hub).not.toMatch(/window\.prompt/)
    expect(page).toMatch(/consumeGuideBridge/)
    expect(page).toMatch(/searchParams\.get\('model'\)/)
  })
})
