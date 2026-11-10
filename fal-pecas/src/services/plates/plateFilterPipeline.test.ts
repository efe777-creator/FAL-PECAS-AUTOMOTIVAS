import { describe, expect, it } from 'vitest'
import type { VehicleOptionTree } from '@/types'
import { plateResultToFilter, type PlateLookupResult } from './plateTypes'
import { reconcileVehicleFilter, selectOptionsWithValue } from './reconcileVehicleFilter'
import { vehicleModelKey } from '@/services/vehicles/vehicleOptionKeys'

/** Simula árvore pós-upsert canônico (VV active, sem depender de PVC). */
const treeAfterUpsert: VehicleOptionTree = {
  makers: ['Volkswagen'],
  modelsByMaker: { Volkswagen: ['Cross Fox'] },
  yearsByModel: { 'Volkswagen|Cross Fox': ['2007'] },
  enginesByModel: { 'Volkswagen|Cross Fox': [] },
  enginesByModelYear: {},
  versionsByModel: { 'Volkswagen|Cross Fox': [] },
}

const plateCanonical: PlateLookupResult = {
  plate: 'INT8C36',
  status: 'found',
  maker: 'Volkswagen',
  model: 'Cross Fox',
  year: '2007',
  engine: null,
  version: null,
  fuel: 'Alcool / Gasolina',
  transmission: null,
  manufacturerId: 'm1',
  modelId: 'md1',
  versionId: 'v1',
  vehicleGroup: null,
  source: 'apiplacas',
  queriedAt: new Date().toISOString(),
  confidence: 0.85,
  message: 'Veículo identificado. Motor/versão não informados pela consulta — confira antes de buscar.',
  candidates: [],
  isMock: false,
}

describe('pipeline placa → filtros UI', () => {
  it('5 selects têm value presente nas options após reconcile', () => {
    const filter = reconcileVehicleFilter(plateResultToFilter(plateCanonical), treeAfterUpsert)
    expect(filter).toEqual({
      maker: 'Volkswagen',
      model: 'Cross Fox',
      year: '2007',
      engine: '',
      version: '',
    })

    const mk = vehicleModelKey(filter.maker!, filter.model!)
    const makers = selectOptionsWithValue(
      treeAfterUpsert.makers.map((m) => ({ value: m, label: m })),
      filter.maker,
    )
    const models = selectOptionsWithValue(
      (treeAfterUpsert.modelsByMaker[filter.maker!] ?? []).map((m) => ({ value: m, label: m })),
      filter.model,
    )
    const years = selectOptionsWithValue(
      (treeAfterUpsert.yearsByModel[mk] ?? []).map((y) => ({ value: y, label: y })),
      filter.year,
    )
    const engines = selectOptionsWithValue(
      (treeAfterUpsert.enginesByModel[mk] ?? []).map((e) => ({ value: e, label: e })),
      filter.engine,
    )
    const versions = selectOptionsWithValue(
      (treeAfterUpsert.versionsByModel[mk] ?? []).map((v) => ({ value: v, label: v })),
      filter.version,
    )

    for (const [value, opts] of [
      [filter.maker, makers],
      [filter.model, models],
      [filter.year, years],
      [filter.engine, engines],
      [filter.version, versions],
    ] as const) {
      expect(opts.some((o) => o.value === value)).toBe(true)
    }
    expect(engines.find((o) => o.value === '')?.label).toBe('Não informado')
    expect(versions.find((o) => o.value === '')?.label).toBe('Não informado')
  })
})
