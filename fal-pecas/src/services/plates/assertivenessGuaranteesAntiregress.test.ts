/**
 * Garantias de assertividade — antiregress (writers · lookup RO · assert na UI).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')

function read(...parts: string[]) {
  return readFileSync(resolve(root, ...parts), 'utf8')
}

describe('assertividade · writers e duplicidade de escrita', () => {
  it('plate-lookup não chama upsert_vehicle_canonical / vehicleCanonicalUpsert', () => {
    const src = read('supabase/functions/plate-lookup/index.ts')
    expect(src).not.toMatch(/upsert_vehicle_canonical/)
    expect(src).not.toMatch(/vehicleCanonicalUpsert\s*\(/)
    expect(src).toMatch(/read-only|vehicle-confirm-upsert/i)
  })

  it('Edge resolveVehicleIdentity nunca permite allowCanonicalUpsert true', () => {
    const src = read('supabase/functions/_shared/resolveVehicleIdentity.ts')
    expect(src).not.toMatch(/allowCanonicalUpsert:\s*true/)
    expect(src).toMatch(/allowCanonicalUpsert:\s*false/)
  })

  it('client resolveVehicleIdentity nunca permite allowCanonicalUpsert true', () => {
    const src = read('src/services/vehicles/resolveVehicleIdentity.ts')
    expect(src).not.toMatch(/allowCanonicalUpsert:\s*true/)
  })

  it('VehiclePlateSearch sempre asserta no catálogo após lookup', () => {
    const src = read('src/components/vehicle/VehiclePlateSearch.tsx')
    expect(src).toMatch(/assertPlateAgainstCatalog/)
    expect(src).toMatch(/confirmVehicleCanonicalUpsert/)
    expect(src).toMatch(/getVehicleOptions/)
  })

  it('confirmação re-asserta pós-candidato com árvore', () => {
    const src = read('src/components/vehicle/VehiclePlateConfirmation.tsx')
    expect(src).toMatch(/assertPlateAgainstCatalog/)
    expect(src).toMatch(/pickCandidate|yearFabrication/)
  })

  it('writers de mestre ficam nos pontos canônicos (sem terceiro path solto)', () => {
    const importSvc = read('src/services/admin/adminVehicleMasterImportService.ts')
    const intelligence = read('src/services/vehicles/vehicleMasterIntelligence.ts')
    const confirm = read('src/services/plates/confirmVehicleCanonicalUpsert.ts')
    const edgeConfirm = read('supabase/functions/vehicle-confirm-upsert/index.ts')
    expect(importSvc).toMatch(/vehicleCanonicalUpsert/)
    expect(intelligence).toMatch(/vehicleCanonicalUpsert/)
    expect(confirm).toMatch(/vehicle-confirm-upsert|confirmVehicleCanonicalUpsert/)
    expect(edgeConfirm).toMatch(/vehicleCanonicalUpsert/)
  })

  it('vehicleCanonicalUpsert client é fail-closed (sem fallback client-side em models/VV)', () => {
    const src = read('src/services/vehicles/vehicleCanonicalUpsert.ts')
    expect(src).toMatch(/if \(error\) throw error/)
    expect(src).not.toMatch(/\.from\(['"](models|manufacturers|vehicle_versions)['"]\)/)
    expect(src).not.toMatch(/\.insert\(/)
  })

  it('árvore pública só lê modelos verified; admin permanece sem filtro', () => {
    const pub = read('src/services/vehicles/vehicleService.ts')
    expect(pub).toMatch(/\.eq\('quality_status', 'verified'\)/)
    expect(pub).toMatch(/models!inner\(name, status, quality_status\)/)
    expect(pub).toMatch(/\.eq\('models\.quality_status', 'verified'\)/)
    expect(pub).toMatch(/Object\.keys\(modelsByMaker\)/)
    expect(pub).toMatch(/Só montadoras com/)
    const admin = read('src/services/admin/adminVehicleService.ts')
    expect(admin).not.toMatch(/\.eq\('quality_status'/)
    expect(admin).toMatch(/quality_status: 'review'/)
  })

  it('RLS público e RPC set_model_quality_status fecham a loja', () => {
    const sql = read(
      'supabase/migrations/20261122170000_mestre_public_rls_and_quality_rpc.sql',
    )
    expect(sql).toMatch(/quality_status = 'verified'/)
    expect(sql).toMatch(/set_model_quality_status/)
    expect(sql).toMatch(/oem_a1/)
    expect(sql).toMatch(/a2_concordant/)
  })

  it('plate resolver só aceita modelo verified (superseded→canonical)', () => {
    const src = read('supabase/functions/_shared/vehicleResolver.ts')
    expect(src).toMatch(/quality_status/)
    expect(src).toMatch(/canonical_model_id/)
    expect(src).toMatch(/verified/)
  })

  it('import CSV clássico merge vida de linha após upsert', () => {
    const src = read('src/services/admin/adminVehicleMasterImportService.ts')
    expect(src).toMatch(/vehicleCanonicalUpsert/)
    expect(src).toMatch(/mergeModelProductionYears/)
  })

  it('garagem resolve só verified e revalida FKs antes de salvar', () => {
    const src = read('src/services/customers/customerVehicleService.ts')
    expect(src).toMatch(/models\.quality_status/)
    expect(src).toMatch(/assertVerifiedGarageFks/)
    expect(src).toMatch(/canonical_model_id/)
    expect(src).toMatch(/touchesFk/)
    expect(src).toMatch(/okFks/)
    expect(src).toMatch(/rpc\('sanitize_garage_vehicle_fks'/)
    expect(src).toMatch(/SECURITY DEFINER|não enxerga superseded/)
    expect(src).toMatch(/isUntypedShellVv/)
    const edgeResolver = read('supabase/functions/_shared/vehicleResolver.ts')
    expect(edgeResolver).toMatch(/Casca VV sem ano/)
    const rpc = read(
      'supabase/migrations/20261122190000_garage_verified_fk_and_vv_hygiene.sql',
    )
    expect(rpc).toMatch(/quality_status = 'verified'/)
    expect(rpc).toMatch(/create_customer_vehicle_with_identity/)
    const backfill = read(
      'supabase/migrations/20261122200000_garage_fk_backfill_and_transfer_sanitize.sql',
    )
    expect(backfill).toMatch(/sanitize_garage_vehicle_fks/)
    expect(backfill).toMatch(/accept_vehicle_transfer/)
    const createSan = read(
      'supabase/migrations/20261122210000_create_cv_uses_sanitize_and_fk_trigger.sql',
    )
    expect(createSan).toMatch(/sanitize_garage_vehicle_fks/)
    expect(createSan).toMatch(/trg_sanitize_garage_fks/)
    const sanDefiner = read(
      'supabase/migrations/20261122220000_sanitize_garage_fks_security_definer.sql',
    )
    expect(sanDefiner).toMatch(/security definer/i)
    expect(sanDefiner).toMatch(/sanitize_garage_vehicle_fks/)
    expect(sanDefiner).toMatch(/'SR', 'Yamaha'/)
    const sanShell = read(
      'supabase/migrations/20261122240000_sanitize_rejects_untyped_shell_vv.sql',
    )
    expect(sanShell).toMatch(/sanitize_garage_vehicle_fks/)
    expect(sanShell).toMatch(/version_name/)
    expect(sanShell).toMatch(/rejeita version_id de VV casca|VV tipada/)
  })

  it('assert de placa zera FKs quando identificação não é plena', () => {
    const src = read('src/services/plates/plateIdentityAssert.ts')
    expect(src).toMatch(/keepFks/)
    expect(src).toMatch(/namesStable/)
    expect(src).toMatch(/let manufacturerId = keepFks \? result\.manufacturerId : null/)
    expect(src).toMatch(/catalogVersions/)
  })

  it('hub e admin usam setModelQualityStatus / badge qualidade', () => {
    const hub = read('src/pages/admin/vehicles/AdminVehicleIntegrationsHubPage.tsx')
    expect(hub).toMatch(/setModelQualityStatus/)
    expect(hub).toMatch(/Verificar \(A1\)/)
    expect(hub).toMatch(/\?model=/)
    expect(hub).toMatch(/Cascas \(0 VV\):/)
    expect(hub).toMatch(/verifiedThinShellItems|listVerifiedThinShells/)
    expect(hub).toMatch(/Cascas verified sem VV/)
    expect(hub).toMatch(/casca: 0 VV/)
    expect(hub).toMatch(/Vida pontual:/)
    expect(hub).toMatch(/Vida pontual verified/)
    expect(hub).toMatch(/verifiedPointLifeItems/)
    expect(hub).toMatch(/Sem motor:/)
    expect(hub).toMatch(/VV verified sem motor/)
    expect(hub).toMatch(/verifiedNoEngineItems/)
    const stats = read('src/services/admin/adminVehicleMasterStats.ts')
    expect(stats).toMatch(/verifiedThinShellItems/)
    expect(stats).toMatch(/verifiedPointLifeItems/)
    expect(stats).toMatch(/verifiedNoEngineItems/)
    expect(stats).toMatch(/loadVerifiedNoEngineRows/)
    const qqFix = read(
      'supabase/migrations/20261122230000_qq_maker_to_caoa_chery.sql',
    )
    expect(qqFix).toMatch(/CAOA Chery/)
    expect(qqFix).toMatch(/QQ/)
    expect(hub).toMatch(/Fonte B não promove/)
    expect(hub).not.toMatch(/FIPE assist \(flag\)/)
    const page = read('src/pages/admin/vehicles/AdminVehiclesPage.tsx')
    expect(page).toMatch(/qualityBadge/)
    expect(page).toMatch(/searchParams\.get\('model'\)/)
  })

  it('vehicleEvidence é somente leitura (sem writers em models/VV/PVC)', () => {
    const src = read('src/services/vehicles/vehicleEvidence.ts')
    expect(src).not.toMatch(/supabase|\.insert\(|\.update\(|\.upsert\(|\.rpc\(/)
    expect(src).toMatch(/GATE12_FORMAL_SOURCES/)
    expect(src).toMatch(/isGate12FormalSnapshot/)
    expect(src).toMatch(/senatran/)
    expect(src).toMatch(/pbev/)
    const hub = read('src/pages/admin/vehicles/AdminVehicleIntegrationsHubPage.tsx')
    expect(hub).toMatch(/Gate 12 checksum A2/)
  })

  it('apps-import cria modelos só em review', () => {
    const sql = read('supabase/migrations/20261122122000_apps_import_models_review_only.sql')
    expect(sql).toMatch(/quality_status, vehicle_class, review_note/)
    expect(sql).toMatch(/'active', 'review', 'unknown'/)
    expect(sql).not.toMatch(/'active', 'verified'/)
  })

  it('plateResultToFilter propaga yearModel/yearFabrication no snapshot', () => {
    const src = read('src/services/plates/plateTypes.ts')
    expect(src).toMatch(/yearModel/)
    expect(src).toMatch(/yearFabrication/)
    expect(src).toMatch(/buildPlateSourceSnapshot/)
  })
})
