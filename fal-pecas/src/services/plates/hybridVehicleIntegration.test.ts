/**
 * VAL residual — inteligência integração híbrida:
 * seed fipeX → mestre CSV → assert catálogo → assist merge → re-assert → fase UI.
 * Não cria PVC; não chama Edge/LLM de verdade.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { adminPreviewVehicleMasterImport } from '@/services/admin/adminVehicleMasterImportService'
import { normalizeFipeXToFalCsv } from '@/services/admin/fipeXToFalVehicleMasterCsv'
import { mergePlateAssistAgainstCatalog } from '@/services/plates/interpretPlateAssist'
import { assertPlateAgainstCatalog } from '@/services/plates/plateIdentityAssert'
import {
  canOpenConfirmation,
  requiresManualSelection,
  type PlateLookupResult,
} from '@/services/plates/plateTypes'
import type { VehicleOptionTree } from '@/types'

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../admin/fixtures/fipex-sample.csv',
)

function treeFromMasterRows(
  rows: Array<{ montadora: string; modelo: string; ano: string }>,
): VehicleOptionTree {
  const makers = new Set<string>()
  const modelsByMaker: Record<string, string[]> = {}
  const yearsByModel: Record<string, string[]> = {}

  for (const r of rows) {
    makers.add(r.montadora)
    const list = modelsByMaker[r.montadora] ?? []
    if (!list.includes(r.modelo)) list.push(r.modelo)
    modelsByMaker[r.montadora] = list
    if (r.ano) {
      const ys = yearsByModel[r.modelo] ?? []
      if (!ys.includes(r.ano)) ys.push(r.ano)
      yearsByModel[r.modelo] = ys
    }
  }

  return {
    makers: [...makers],
    modelsByMaker,
    yearsByModel,
    enginesByModel: {},
    enginesByModelYear: {},
    versionsByModel: {},
  }
}

function plate(partial: Partial<PlateLookupResult>): PlateLookupResult {
  return {
    plate: 'RNO1A23',
    status: 'found',
    maker: 'Renault',
    model: 'Kwid Intense',
    year: '2021',
    version: null,
    engine: null,
    fuel: null,
    transmission: null,
    manufacturerId: null,
    modelId: null,
    versionId: null,
    vehicleGroup: null,
    source: 'apiplacas',
    queriedAt: new Date().toISOString(),
    confidence: 0.7,
    message: null,
    candidates: [],
    isMock: false,
    ...partial,
  }
}

describe('híbrido — seed mestre + inteligência placa', () => {
  it('fipeX → CSV FAL → preview import (sem erro de cabeçalho)', async () => {
    const text = readFileSync(fixturePath, 'utf8')
    const seed = normalizeFipeXToFalCsv(text)
    expect(seed.fileErrors).toEqual([])
    expect(seed.rows.some((r) => r.montadora === 'Renault')).toBe(true)

    const file = new File([seed.csv], 'mestre.csv', { type: 'text/csv' })
    const preview = await adminPreviewVehicleMasterImport(file)
    expect(preview.fileErrors).toEqual([])
    expect(preview.rows.every((r) => r.action !== 'error')).toBe(true)
  })

  it('pipeline loja: assert → assist merge → re-assert abre conferência ou ambíguo', () => {
    const text = readFileSync(fixturePath, 'utf8')
    const seed = normalizeFipeXToFalCsv(text)
    const tree = treeFromMasterRows(seed.rows)
    // Garante família Kwid no mestre pós-seed (como se CRUD/import tivesse irmãos).
    tree.makers = [...new Set([...tree.makers, 'Renault'])]
    tree.modelsByMaker.Renault = [
      ...new Set([...(tree.modelsByMaker.Renault ?? []), 'Kwid', 'Kwid Intense']),
    ]

    const catalog = (tree.modelsByMaker.Renault ?? []).map((model) => ({
      maker: 'Renault',
      model,
      versions: model.includes('Intense') ? ['Intense'] : ['Zen'],
    }))

    let lookup = assertPlateAgainstCatalog(
      plate({ model: 'Kwid Intens', confidence: 0.55 }),
      tree,
    )
    expect(lookup.identityAsserted).toBe(true)
    expect(lookup.confidenceBand).toBeTruthy()

    lookup = mergePlateAssistAgainstCatalog(
      lookup,
      { maker: 'Renault', model: 'Kwid Intense', version: 'Intense' },
      catalog,
    )
    expect(lookup.model).toBe('Kwid Intense')
    expect(lookup.identityLlmAssisted).toBe(true)

    lookup = assertPlateAgainstCatalog(lookup, tree)
    expect(lookup.identityAsserted).toBe(true)

    // Híbrido: ou confirma (found/incomplete com maker+model) ou manual/ambíguo com escolha.
    if (lookup.status === 'ambiguous') {
      expect(lookup.candidates.length).toBeGreaterThanOrEqual(2)
      expect(canOpenConfirmation(lookup) || requiresManualSelection(lookup.status)).toBe(true)
    } else {
      expect(canOpenConfirmation(lookup)).toBe(true)
      expect(requiresManualSelection(lookup.status)).toBe(false)
    }
  })

  it('assistência não inventa modelo fora do mestre', () => {
    const catalog = [{ maker: 'Fiat', model: 'Argo', versions: [] }]
    const out = mergePlateAssistAgainstCatalog(
      plate({ maker: 'Fiat', model: 'Argo' }),
      { maker: 'Fiat', model: 'Unobtanium X' },
      catalog,
    )
    expect(out.model).toBe('Argo')
    expect(out.identityLlmAssisted).toBeFalsy()
  })
})
