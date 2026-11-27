import { describe, expect, it } from 'vitest'
import { prepareVehicleMasterIntelligence } from './vehicleMasterIntelligence'

describe('prepareVehicleMasterIntelligence', () => {
  it('exige ano e deduplica VV; agrega vida de linha', () => {
    const report = prepareVehicleMasterIntelligence([
      { montadora: 'Fiat', modelo: 'Argo 1.0', ano: '2020', motor: '', versao: '' },
      { montadora: 'Fiat', modelo: 'Argo 1.0', ano: '2022', motor: '', versao: '' },
      { montadora: 'Fiat', modelo: 'Argo 1.0', ano: '2022', motor: '', versao: '' },
      { montadora: 'Fiat', modelo: 'Argo', ano: '', motor: '', versao: '' },
    ])
    const ok = report.prepared.filter((p) => p.action === 'upsert')
    expect(ok.length).toBeGreaterThanOrEqual(2)
    expect(ok.every((p) => p.year >= 1950)).toBe(true)
    const argo = ok.filter((p) => /argo/i.test(p.model))
    expect(argo[0]!.productionYearStart).toBeLessThanOrEqual(argo[0]!.productionYearEnd)
    expect(argo.some((p) => p.productionYearStart === 2020)).toBe(true)
    expect(argo.some((p) => p.productionYearEnd === 2022)).toBe(true)
    expect(report.skipped).toBeGreaterThanOrEqual(1)
  })

  it('rejeita lote sem linhas válidas', () => {
    const report = prepareVehicleMasterIntelligence([
      { montadora: '', modelo: 'X', ano: '2020', motor: '', versao: '' },
    ])
    expect(report.fileErrors.length).toBeGreaterThan(0)
  })

  it('normaliza combustível e inclui na chave VV', () => {
    const report = prepareVehicleMasterIntelligence([
      {
        montadora: 'VW',
        modelo: 'Gol',
        ano: '2018',
        motor: '1.0',
        versao: '',
        combustivel: 'flex',
      },
      {
        montadora: 'VW',
        modelo: 'Gol',
        ano: '2018',
        motor: '1.0',
        versao: '',
        combustivel: 'Flex',
      },
    ])
    const ok = report.prepared.filter((p) => p.action === 'upsert')
    expect(ok).toHaveLength(1)
    expect(ok[0]!.fuel).toBe('Flex')
  })
})
