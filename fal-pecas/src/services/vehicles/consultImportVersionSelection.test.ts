/**
 * Consultar + Importar: multi-modelo, fan-out de versões e campos corretos.
 */
import { describe, expect, it } from 'vitest'
import { fipeSelectionToIntelligenceRows } from '@/services/admin/fipeCatalogClient'
import { splitVersionAlternatives } from '@/lib/vehicles/splitVersionAlternatives'
import { splitApiModelo } from '@/services/plates/splitApiModelo'
import {
  diffVehicleMasterCandidates,
  selectedMasterDiffCandidates,
  type MasterCatalogSnapshot,
} from '@/services/vehicles/diffVehicleMasterCandidates'
import { prepareVehicleMasterIntelligence } from '@/services/vehicles/vehicleMasterIntelligence'

const emptyCatalog: MasterCatalogSnapshot = { models: [], versions: [] }

describe('consultar/importar · multi + versões + campos', () => {
  it('identifica modelo/motor/versão (barra, trim, 16V, sem Flex na versão)', () => {
    expect(splitApiModelo('Gol Comfortline / Highline 1.0')).toMatchObject({
      model: 'Gol',
      engine: '1.0',
      version: 'Comfortline / Highline',
    })
    expect(splitApiModelo('Onix LT / LTZ 1.0')).toMatchObject({
      model: 'Onix',
      engine: '1.0',
      version: 'LT / LTZ',
    })
    expect(splitApiModelo('Polo Highline 1.0')).toMatchObject({
      model: 'Polo',
      engine: '1.0',
      version: 'Highline',
    })
    expect(splitApiModelo('HB20 1.0 Comfort')).toMatchObject({
      model: 'HB20',
      engine: '1.0',
      version: 'Comfort',
    })
    const civic = splitApiModelo('Civic Sedan EXL 2.0 Flex 16V Aut.4p')
    expect(civic.model).toMatch(/^Civic/i)
    expect(civic.engine).toBe('2.0 16V')
    expect(civic.version).toMatch(/EXL/i)
    expect(civic.version ?? '').not.toMatch(/16V/i)
    expect(civic.version ?? '').not.toMatch(/flex/i)
    expect(civic.version ?? '').not.toMatch(/aut/i)
  })

  it('FIPE multi-modelo + barra → candidatos únicos por versão (sem duplicar anos)', () => {
    const rows = fipeSelectionToIntelligenceRows({
      brandName: 'Volkswagen',
      selections: [
        {
          modelName: 'Gol Comfortline / Highline 1.0',
          years: [
            { code: '2018-5', name: '2018 Flex', year: 2018, fuel: 'Flex' },
            { code: '2019-5', name: '2019 Flex', year: 2019, fuel: 'Flex' },
          ],
        },
        {
          modelName: 'Polo Highline 1.0',
          years: [{ code: '2020-5', name: '2020 Flex', year: 2020, fuel: 'Flex' }],
        },
      ],
    })
    expect(rows).toHaveLength(3)

    const prepared = prepareVehicleMasterIntelligence(rows).prepared.filter(
      (p) => p.action === 'upsert',
    )
    // 2 anos × 2 versões Gol + 1 Polo
    expect(prepared).toHaveLength(5)

    const cands = diffVehicleMasterCandidates(prepared, emptyCatalog)
    expect(cands).toHaveLength(3)
    const gol = cands.filter((c) => c.model === 'Gol')
    expect(gol).toHaveLength(2)
    expect(gol.map((c) => c.version).sort()).toEqual(['Comfortline', 'Highline'])
    expect(gol.every((c) => c.engine === '1.0')).toBe(true)
    expect(gol.every((c) => c.fuel === 'Flex')).toBe(true)
    expect(gol.every((c) => c.yearStart === 2018 && c.yearEnd === 2019)).toBe(true)
    expect(gol.every((c) => c.selected)).toBe(true)

    const polo = cands.find((c) => c.model === 'Polo')
    expect(polo).toMatchObject({
      version: 'Highline',
      engine: '1.0',
      fuel: 'Flex',
      yearStart: 2020,
      yearEnd: 2020,
      selected: true,
    })

    // Apply: cada candidato já é 1 versão (fan-out de segurança não explode de novo)
    const applyRows = selectedMasterDiffCandidates(cands).flatMap((c) =>
      splitVersionAlternatives(c.version).map((v) => ({ ...c, version: v })),
    )
    expect(applyRows).toHaveLength(3)
  })

  it('HB20: cada versão tem o próprio período, sem herdar o ano de outra', () => {
    const rows = fipeSelectionToIntelligenceRows({
      brandName: 'Hyundai',
      selections: [
        {
          modelName: 'HB20 C./C.Plus/C.Style 1.6 Flex 16V Mec.',
          years: [2013, 2014, 2015, 2016, 2017, 2018, 2019].map((year) => ({
            code: `${year}-5`,
            name: `${year} Flex`,
            year,
            fuel: 'Flex',
          })),
        },
        {
          modelName: 'HB20 Comf./C.Plus/C.Style 1.0 Flex 12V',
          years: [2013, 2014, 2015, 2016, 2017, 2018, 2019].map((year) => ({
            code: `${year}-5`,
            name: `${year} Flex`,
            year,
            fuel: 'Flex',
          })),
        },
        {
          modelName: 'HB20 5 Anos 1.0 Flex 12V Mec.',
          years: [{ code: '2018-5', name: '2018 Flex', year: 2018, fuel: 'Flex' }],
        },
        {
          modelName: 'HB20 Comfort 1.0 Flex 12V Mec.',
          years: [2023, 2024, 2026, 2027].map((year) => ({
            code: `${year}-5`,
            name: `${year} Flex`,
            year,
            fuel: 'Flex',
          })),
        },
      ],
    })
    const prepared = prepareVehicleMasterIntelligence(rows).prepared.filter((p) => p.action === 'upsert')
    const cands = diffVehicleMasterCandidates(prepared, emptyCatalog)
    const plus16 = cands.find((c) => c.version === 'Comfort Plus' && c.engine === '1.6 16V')
    const cinco = cands.find((c) => c.version === '5 Anos')
    const comfort10 = cands
      .filter((c) => c.version === 'Comfort' && c.engine === '1.0 12V')
      .map((c) => `${c.yearStart}-${c.yearEnd}`)
      .sort()
    expect(plus16).toMatchObject({ yearStart: 2013, yearEnd: 2019 })
    expect(cinco).toMatchObject({ yearStart: 2018, yearEnd: 2018 })
    expect(comfort10).toEqual(['2013-2019', '2023-2024', '2026-2027'])
  })

  it('mesma config junta anos de linhas diferentes; motor novo abre outro período', () => {
    const flex = (year: number) => ({ code: `${year}-5`, name: `${year} Flex`, year, fuel: 'Flex' })
    const rows = fipeSelectionToIntelligenceRows({
      brandName: 'VW',
      selections: [
        {
          modelName: 'Gol Comfortline 1.0 T. Flex 8V 3p',
          years: [flex(2015)],
        },
        {
          modelName: 'Gol Comfortline 1.0 Total Flex 8V 5p',
          years: [2015, 2016].map(flex),
        },
        {
          modelName: 'Gol Comfortline 1.0 T.Flex 12V 5p',
          years: [2016, 2017, 2018, 2019].map(flex),
        },
      ],
    })
    const prepared = prepareVehicleMasterIntelligence(rows).prepared.filter((p) => p.action === 'upsert')
    const cands = diffVehicleMasterCandidates(prepared, emptyCatalog)
    const spans = cands
      .filter((c) => c.version === 'Comfortline')
      .map((c) => `${c.engine} ${c.yearStart}-${c.yearEnd}`)
      .sort()
    expect(spans).toEqual(['1.0 12V 2016-2019', '1.0 8V 2015-2016'])
  })

  it('cada ano numa linha vira um período da config, e outra versão não entra', () => {
    const line = (name: string, year: number) => ({
      modelName: name,
      years: [{ code: `${year}-5`, name: `${year} Flex`, year, fuel: 'Flex' }],
    })
    const rows = fipeSelectionToIntelligenceRows({
      brandName: 'GM',
      selections: [
        ...[2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019].map((year) =>
          line(`Onix LT 1.0 ${year}`, year),
        ),
        line('Onix LTZ 1.0 2020', 2020),
      ],
    })
    const prepared = prepareVehicleMasterIntelligence(rows).prepared.filter((p) => p.action === 'upsert')
    const cands = diffVehicleMasterCandidates(prepared, emptyCatalog)
    const spans = cands.map((c) => `${c.model} ${c.version} ${c.engine} ${c.yearStart}-${c.yearEnd}`).sort()
    expect(spans).toEqual(['Onix LT 1.0 2012-2019', 'Onix LTZ 1.0 2020-2020'])
  })

  it('Onix LT 8V não herda os anos do LT 12V', () => {
    const flex = (year: number) => ({ code: `${year}-5`, name: `${year} Flex`, year, fuel: 'Flex' })
    const rows = fipeSelectionToIntelligenceRows({
      brandName: 'GM',
      selections: [
        {
          modelName: 'ONIX HATCH LT 1.0 8V FlexPower 5p Mec.',
          years: [2013, 2014, 2015, 2016, 2017, 2018, 2019].map(flex),
        },
        {
          modelName: 'ONIX HATCH LT 1.0 12V Flex 5p Mec.',
          years: [2020, 2021, 2022, 2023, 2024, 2025, 2026].map(flex),
        },
      ],
    })
    const prepared = prepareVehicleMasterIntelligence(rows).prepared.filter((p) => p.action === 'upsert')
    const cands = diffVehicleMasterCandidates(prepared, emptyCatalog)
    const spans = cands.map((c) => `${c.version} ${c.engine} ${c.yearStart}-${c.yearEnd}`).sort()
    expect(spans).toEqual(['LT 1.0 12V 2020-2026', 'LT 1.0 8V 2013-2019'])
  })

  it('import CSV-like: coluna versão com barra vira 2 candidatos', () => {
    const prepared = prepareVehicleMasterIntelligence([
      {
        montadora: 'Volkswagen',
        modelo: 'Gol',
        ano: '2018',
        motor: '1.0',
        versao: 'Comfortline / Highline',
        combustivel: 'Flex',
      },
      {
        montadora: 'Hyundai',
        modelo: 'HB20',
        ano: '2020',
        motor: '1.0',
        versao: 'Comfort',
        combustivel: 'Flex',
      },
    ]).prepared.filter((p) => p.action === 'upsert')

    expect(prepared).toHaveLength(3)
    const cands = diffVehicleMasterCandidates(prepared, emptyCatalog)
    expect(cands).toHaveLength(3)
    expect(cands.filter((c) => c.model === 'Gol').map((c) => c.version).sort()).toEqual([
      'Comfortline',
      'Highline',
    ])
  })
})
