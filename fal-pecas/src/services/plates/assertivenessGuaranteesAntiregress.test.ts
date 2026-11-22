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

  it('plateResultToFilter propaga yearModel/yearFabrication no snapshot', () => {
    const src = read('src/services/plates/plateTypes.ts')
    expect(src).toMatch(/yearModel/)
    expect(src).toMatch(/yearFabrication/)
    expect(src).toMatch(/buildPlateSourceSnapshot/)
  })
})
