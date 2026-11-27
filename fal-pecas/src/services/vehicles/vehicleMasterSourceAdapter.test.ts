import { describe, expect, it } from 'vitest'
import { adaptRawVehicleSourceRow } from './vehicleMasterSourceAdapter'

describe('adaptRawVehicleSourceRow', () => {
  it('normaliza linha fipeX sem inventar transmissão', () => {
    const row = adaptRawVehicleSourceRow('fipex_csv', {
      maker: 'Fiat',
      model: 'Strada',
      year: 2015,
      engine: '1.4',
      version: 'Working',
      combustivel: 'Flex',
    })
    expect(row?.maker).toBe('Fiat')
    expect(row?.fuel).toBe('Flex')
    expect(row?.transmission).toBeNull()
  })

  it('rejeita sem maker/model', () => {
    expect(adaptRawVehicleSourceRow('manual', { year: 2020 })).toBeNull()
  })

  it('preserva external_id', () => {
    const row = adaptRawVehicleSourceRow('fipe', {
      maker: 'VW',
      model: 'Gol',
      year: 2018,
      codigo_fipe: '005340-6',
    })
    expect(row?.externalId).toBe('005340-6')
  })
})
