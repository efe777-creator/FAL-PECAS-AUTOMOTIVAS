/**
 * Antiregress: seletor de anos = identidade (VV + vida), nunca PVC.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('vehicleOptions identity antiregress', () => {
  it('getVehicleOptions não consulta product_vehicle_compatibility', () => {
    const src = readFileSync(
      resolve(__dirname, 'vehicleService.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/product_vehicle_compatibility/)
    expect(src).toMatch(/production_year_start/)
    expect(src).toMatch(/yearsByModel/)
    expect(src).toMatch(/yearsFromProductionLife/)
  })
})
