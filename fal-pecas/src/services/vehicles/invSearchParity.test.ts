import { describe, expect, it } from 'vitest'
import { resolveVehicleIdentity } from './resolveVehicleIdentity'
import { buildVehicleQuery } from './vehicleService'
import type { VehicleOptionTree } from '@/types'

const tree: VehicleOptionTree = {
  makers: ['Fiat'],
  modelsByMaker: { Fiat: ['Argo'] },
  yearsByModel: { 'Fiat|Argo': ['2020'] },
  enginesByModel: { 'Fiat|Argo': ['1.3'] },
  enginesByModelYear: {},
  versionsByModel: { 'Fiat|Argo': ['Drive'] },
}

describe('INV search parity', () => {
  it('texto e placa geram os mesmos params RPC (exceto vehicle=1)', () => {
    const fromText = resolveVehicleIdentity({
      source: 'text',
      maker: 'Fiat',
      model: 'Argo',
      year: '2020',
      engine: '1.3',
      version: 'Drive',
      tree,
    })
    const fromPlate = resolveVehicleIdentity({
      source: 'plate',
      maker: 'Fiat',
      model: 'Argo Drive 1.3',
      year: '2020',
      tree,
    })
    const qText = buildVehicleQuery(fromText.filter)
    const qPlate = buildVehicleQuery(fromPlate.filter)
    expect(qText.get('maker')).toBe(qPlate.get('maker'))
    expect(qText.get('model')).toBe(qPlate.get('model'))
    expect(qText.get('year')).toBe(qPlate.get('year'))
    expect(qText.get('engine')).toBe(qPlate.get('engine'))
    expect(qText.get('version')).toBe(qPlate.get('version'))
  })

  it('Não informado (\"\") não entra na URL — wildcard RPC', () => {
    const r = resolveVehicleIdentity({
      source: 'text',
      maker: 'Fiat',
      model: 'Argo',
      year: '2020',
      tree,
    })
    expect(r.filter.engine).toBe('')
    const q = buildVehicleQuery(r.filter)
    expect(q.has('engine')).toBe(false)
    expect(q.has('version')).toBe(false)
    expect(q.get('maker')).toBe('Fiat')
    expect(q.get('model')).toBe('Argo')
  })
})
