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

  it('gasolina e álcool do mesmo modelo não compartilham os anos', () => {
    const report = prepareVehicleMasterIntelligence([
      { montadora: 'VW', modelo: 'Gol', ano: '1995', motor: '1.0', versao: '', combustivel: 'Gasolina' },
      { montadora: 'VW', modelo: 'Gol', ano: '1996', motor: '1.0', versao: '', combustivel: 'Gasolina' },
      { montadora: 'VW', modelo: 'Gol', ano: '1997', motor: '1.0', versao: '', combustivel: 'Álcool' },
      { montadora: 'VW', modelo: 'Gol', ano: '1998', motor: '1.0', versao: '', combustivel: 'Álcool' },
    ])
    const ok = report.prepared.filter((p) => p.action === 'upsert')
    const gas = ok.filter((p) => p.fuel === 'Gasolina')
    const alc = ok.filter((p) => p.fuel === 'Etanol')
    expect(gas).toHaveLength(2)
    expect(alc).toHaveLength(2)
    expect(gas.every((p) => p.productionYearStart === 1995 && p.productionYearEnd === 1996)).toBe(true)
    expect(alc.every((p) => p.productionYearStart === 1997 && p.productionYearEnd === 1998)).toBe(true)
  })

  it('fan-out de versões com / e |', () => {
    const report = prepareVehicleMasterIntelligence([
      {
        montadora: 'VW',
        modelo: 'Gol',
        ano: '2018',
        motor: '1.0',
        versao: 'Comfortline / Highline',
        combustivel: 'Flex',
      },
    ])
    const ok = report.prepared.filter((p) => p.action === 'upsert')
    expect(ok).toHaveLength(2)
    expect(ok.map((p) => p.version).sort()).toEqual(['Comfortline', 'Highline'])
  })

  it('fan-out A/B/C e nome FIPE com barra no modelo', () => {
    const abc = prepareVehicleMasterIntelligence([
      {
        montadora: 'VW',
        modelo: 'Gol',
        ano: '2018',
        motor: '1.0',
        versao: 'A / B / C',
        combustivel: 'Flex',
      },
    ])
    expect(abc.prepared.filter((p) => p.action === 'upsert')).toHaveLength(3)

    const fromName = prepareVehicleMasterIntelligence([
      {
        montadora: 'Volkswagen',
        modelo: 'Gol Comfortline / Highline 1.0',
        ano: '2018',
        motor: '',
        versao: '',
        combustivel: 'Flex',
      },
      {
        montadora: 'Hyundai',
        modelo: 'HB20 1.0',
        ano: '2020',
        motor: '',
        versao: '',
        combustivel: 'Flex',
      },
    ])
    const ok = fromName.prepared.filter((p) => p.action === 'upsert')
    expect(ok).toHaveLength(3)
    const gol = ok.filter((p) => p.model === 'Gol')
    expect(gol).toHaveLength(2)
    expect(gol.map((p) => p.version).sort()).toEqual(['Comfortline', 'Highline'])
    expect(ok.some((p) => /hb20/i.test(p.model))).toBe(true)
  })
})
