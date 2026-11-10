import { describe, expect, it } from 'vitest'
import { adminPreviewVehicleMasterImport } from './adminVehicleMasterImportService'

describe('adminPreviewVehicleMasterImport', () => {
  it('lê CSV 5 colunas e classifica linhas', async () => {
    const csv = [
      'montadora;modelo;ano;motor;versao',
      'Volkswagen;Cross Fox;2007;;',
      ';SemModelo;2008;;',
      'Ford;Ka;2015;1.0;SE',
    ].join('\n')
    const file = new File([csv], 'mestre.csv', { type: 'text/csv' })
    const { rows, fileErrors } = await adminPreviewVehicleMasterImport(file)
    expect(fileErrors).toEqual([])
    expect(rows).toHaveLength(3)
    expect(rows[0]?.action).toBe('create')
    expect(rows[0]?.montadora).toBe('Volkswagen')
    expect(rows[1]?.action).toBe('skip')
    expect(rows[2]?.modelo).toBe('Ka')
  })
})
