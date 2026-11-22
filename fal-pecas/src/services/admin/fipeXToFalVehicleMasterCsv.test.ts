import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildFalVehicleMasterCsv,
  normalizeFipeXToFalCsv,
} from './fipeXToFalVehicleMasterCsv'
import { adminPreviewVehicleMasterImport } from './adminVehicleMasterImportService'

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'fipex-sample.csv',
)

describe('fipeXToFalVehicleMasterCsv', () => {
  it('buildFalVehicleMasterCsv emite cabeçalho canônico', () => {
    const csv = buildFalVehicleMasterCsv([
      { montadora: 'Fiat', modelo: 'Argo', ano: '2022', motor: '1.0', versao: '' },
    ])
    expect(csv.startsWith('montadora,modelo,ano,motor,versao\n')).toBe(true)
    expect(csv).toContain('Fiat,Argo,2022,1.0,')
  })

  it('normaliza fixture: prioridade BR, dedup, split modelo, sem Peugeot/Honda antigo', () => {
    const text = readFileSync(fixturePath, 'utf8')
    const result = normalizeFipeXToFalCsv(text)
    expect(result.fileErrors).toEqual([])
    expect(result.rows.length).toBeGreaterThanOrEqual(6)
    expect(result.rows.every((r) => r.montadora && r.modelo)).toBe(true)
    expect(result.rows.some((r) => /peugeot/i.test(r.montadora))).toBe(false)
    expect(result.rows.some((r) => r.ano === '1998')).toBe(false)
    // dedup Fiat Argo 2022
    const argo = result.rows.filter(
      (r) => r.montadora === 'Fiat' && /argo/i.test(r.modelo) && r.ano === '2022',
    )
    expect(argo).toHaveLength(1)
    // VW alias
    expect(result.rows.some((r) => r.montadora === 'Volkswagen')).toBe(true)
  })

  it('CSV gerado passa preview do import mestre (cabeçalho)', async () => {
    const text = readFileSync(fixturePath, 'utf8')
    const { csv, fileErrors } = normalizeFipeXToFalCsv(text)
    expect(fileErrors).toEqual([])
    const file = new File([csv], 'fal-mestre.csv', { type: 'text/csv' })
    const preview = await adminPreviewVehicleMasterImport(file)
    expect(preview.fileErrors).toEqual([])
    expect(preview.rows.length).toBeGreaterThan(0)
    expect(preview.rows.every((r) => r.montadora && r.modelo)).toBe(true)
  })

  it('rejeita arquivo sem cabeçalho marca/modelo', () => {
    const result = normalizeFipeXToFalCsv('a,b,c\n1,2,3\n')
    expect(result.rows).toEqual([])
    expect(result.fileErrors[0]).toMatch(/Cabeçalho/i)
  })
})
