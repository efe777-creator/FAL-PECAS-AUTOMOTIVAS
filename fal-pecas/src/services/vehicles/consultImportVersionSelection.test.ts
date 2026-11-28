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
