import { describe, expect, it } from 'vitest'
import type { MasterCatalogSnapshot } from '@/services/vehicles/diffVehicleMasterCandidates'
import {
  collectDemandaIntelligenceFromCatalog,
  demandaTokensMatch,
  foldDemanda,
} from '@/services/vehicles/vehicleMasterConsultService'

const catalog: MasterCatalogSnapshot = {
  models: [
    {
      id: 'm-gol',
      manufacturerId: 'mk-vw',
      makerName: 'Volkswagen',
      name: 'Gol',
      productionYearStart: 2018,
      productionYearEnd: 2022,
      activeVersionCount: 2,
    },
    {
      id: 'm-hb20',
      manufacturerId: 'mk-hy',
      makerName: 'Hyundai',
      name: 'HB20',
      productionYearStart: 2020,
      productionYearEnd: 2024,
      activeVersionCount: 1,
    },
    {
      id: 'm-casca',
      manufacturerId: 'mk-vw',
      makerName: 'Volkswagen',
      name: 'Saveiro',
      productionYearStart: 2019,
      productionYearEnd: 2019,
      activeVersionCount: 0,
    },
  ],
  versions: [
    {
      id: 'v1',
      modelId: 'm-gol',
      manufacturerId: 'mk-vw',
      year: 2018,
      engine: '1.0',
      versionName: 'Comfortline',
      fuel: 'Flex',
      status: 'active',
    },
    {
      id: 'v2',
      modelId: 'm-gol',
      manufacturerId: 'mk-vw',
      year: 2019,
      engine: '1.6',
      versionName: 'Highline',
      fuel: 'Flex',
      status: 'active',
    },
    {
      id: 'v3',
      modelId: 'm-hb20',
      manufacturerId: 'mk-hy',
      year: 2020,
      engine: '1.0',
      versionName: 'Comfort',
      fuel: 'Flex',
      status: 'active',
    },
    {
      id: 'v4',
      modelId: 'm-gol',
      manufacturerId: 'mk-vw',
      year: null,
      engine: '1.0',
      versionName: 'Trendline',
      fuel: null,
      status: 'active',
    },
  ],
}

describe('demanda qualquer termo', () => {
  it('fold + tokens: 1 termo ou AND multi', () => {
    expect(demandaTokensMatch(foldDemanda('volkswagen gol 1.0 comfortline'), 'gol')).toBe(true)
    expect(demandaTokensMatch(foldDemanda('volkswagen gol 1.0'), foldDemanda('gol 1.0'))).toBe(
      true,
    )
    expect(demandaTokensMatch(foldDemanda('hyundai hb20'), 'gol')).toBe(false)
  })

  it('busca só "Gol" sem montadora', () => {
    const rows = collectDemandaIntelligenceFromCatalog(catalog, 'Gol')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.modelo === 'Gol')).toBe(true)
  })

  it('busca "HB20", "1.0", "Comfortline", "Volkswagen"', () => {
    expect(collectDemandaIntelligenceFromCatalog(catalog, 'HB20').some((r) => r.modelo === 'HB20')).toBe(
      true,
    )
    expect(
      collectDemandaIntelligenceFromCatalog(catalog, '1.0').every((r) => r.motor === '1.0'),
    ).toBe(true)
    expect(
      collectDemandaIntelligenceFromCatalog(catalog, 'Comfortline').some(
        (r) => r.versao === 'Comfortline',
      ),
    ).toBe(true)
    expect(
      collectDemandaIntelligenceFromCatalog(catalog, 'Volkswagen').every(
        (r) => r.montadora === 'Volkswagen',
      ),
    ).toBe(true)
  })

  it('gol 1.0 2018 filtra ano e motor', () => {
    const rows = collectDemandaIntelligenceFromCatalog(catalog, 'gol 1.0 2018')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.ano === '2018' && r.motor === '1.0')).toBe(true)
  })

  it('modelo sem ano e sem vida de linha não vira o ano corrente', () => {
    const semAno: MasterCatalogSnapshot = {
      models: [
        {
          id: 'm-x',
          manufacturerId: 'mk-x',
          makerName: 'Fiat',
          name: 'Palio',
          productionYearStart: null,
          productionYearEnd: null,
          activeVersionCount: 0,
        },
      ],
      versions: [],
    }
    const rows = collectDemandaIntelligenceFromCatalog(semAno, 'Palio')
    expect(rows).toHaveLength(0)
    expect(rows.some((r) => r.ano === String(new Date().getFullYear()))).toBe(false)
  })

  it('VV sem ano usa vida do modelo; casca Saveiro aparece', () => {
    const trend = collectDemandaIntelligenceFromCatalog(catalog, 'Trendline')
    expect(trend.some((r) => r.versao === 'Trendline' && r.ano === '2018')).toBe(true)

    const saveiro = collectDemandaIntelligenceFromCatalog(catalog, 'Saveiro')
    expect(saveiro.some((r) => r.modelo === 'Saveiro')).toBe(true)
  })
})
