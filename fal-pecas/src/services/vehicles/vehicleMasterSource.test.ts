import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { prepareVehicleMasterIntelligence } from './vehicleMasterIntelligence'
import {
  fipeXCsvVehicleMasterSource,
  paidApiVehicleMasterSourceStub,
  resolveVehicleMasterSource,
} from './vehicleMasterSource'

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../admin/fixtures/fipex-sample.csv',
)

describe('VehicleMasterSource + intelligence (cadastro rico)', () => {
  it('fipeX → rows → prepare com anos e vida de linha', async () => {
    const text = readFileSync(fixturePath, 'utf8')
    const src = await fipeXCsvVehicleMasterSource.fetchNormalizedRows(text)
    expect(src.fileErrors).toEqual([])
    expect(src.rows.length).toBeGreaterThan(0)
    expect(src.rows.every((r) => r.montadora && r.modelo)).toBe(true)

    const prepared = prepareVehicleMasterIntelligence(src.rows)
    expect(prepared.fileErrors).toEqual([])
    const ok = prepared.prepared.filter((p) => p.action === 'upsert')
    expect(ok.length).toBeGreaterThan(0)
    expect(ok.every((p) => p.year >= 2000)).toBe(true)
    // Vida de linha agregada por modelo
    for (const row of ok) {
      expect(row.productionYearStart).toBeLessThanOrEqual(row.productionYearEnd)
    }
  })

  it('pórtico resolve fipeX e fipe_api; legado paid_api aponta consulta', async () => {
    expect(resolveVehicleMasterSource('fipex_csv').kind).toBe('fipex_csv')
    expect(resolveVehicleMasterSource('fipe_api').kind).toBe('fipe_api')
    const stub = await paidApiVehicleMasterSourceStub.fetchNormalizedRows({})
    expect(stub.rows).toEqual([])
    expect(stub.fileErrors[0]).toMatch(/Consultar e escolher|fipe_api/i)
  })
})
