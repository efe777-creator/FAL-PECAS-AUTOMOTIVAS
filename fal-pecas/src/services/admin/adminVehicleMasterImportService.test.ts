import { describe, expect, it } from 'vitest'
import {
  adminPreviewVehicleMasterImport,
  parseVehicleMasterQuality,
} from './adminVehicleMasterImportService'

describe('parseVehicleMasterQuality', () => {
  it('mapeia verificado/quarentena e aliases', () => {
    expect(parseVehicleMasterQuality('Verificado')).toBe('verified')
    expect(parseVehicleMasterQuality('verified')).toBe('verified')
    expect(parseVehicleMasterQuality('confirmado')).toBe('verified')
    expect(parseVehicleMasterQuality('Quarentena')).toBe('quarantined')
    expect(parseVehicleMasterQuality('quarantine')).toBe('quarantined')
    expect(parseVehicleMasterQuality('')).toBe(null)
    expect(parseVehicleMasterQuality('ativo')).toBe('invalid')
  })
})

describe('adminPreviewVehicleMasterImport', () => {
  it('lê CSV legado 5 colunas e classifica linhas', async () => {
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
    expect(rows[0]?.anoInicio).toBe('2007')
    expect(rows[0]?.anoFim).toBe('2007')
    expect(rows[0]?.qualityStatus).toBe(null)
    expect(rows[1]?.action).toBe('skip')
    expect(rows[2]?.modelo).toBe('Ka')
  })

  it('lê Ano início/fim e Status', async () => {
    const csv = [
      'Montadora;Modelo;Versão;Motor;Ano início;Ano fim;Status',
      'Volkswagen;Gol;1.0;1.0 MPI;2010;2015;Verificado',
      'Ford;Ka;SE;1.0;2015;2015;Quarentena',
      'Fiat;Uno;;;2010;2008;Verificado',
      'Chevrolet;Onix;LT;1.0;;;Verificado',
    ].join('\n')
    const file = new File([csv], 'periodo.csv', { type: 'text/csv' })
    const { rows, fileErrors } = await adminPreviewVehicleMasterImport(file)
    expect(fileErrors).toEqual([])
    expect(rows).toHaveLength(4)
    expect(rows[0]?.action).toBe('create')
    expect(rows[0]?.anoInicio).toBe('2010')
    expect(rows[0]?.anoFim).toBe('2015')
    expect(rows[0]?.qualityStatus).toBe('verified')
    expect(rows[0]?.versao).toBe('1.0')
    expect(rows[1]?.qualityStatus).toBe('quarantined')
    expect(rows[2]?.action).toBe('skip')
    expect(rows[2]?.message).toMatch(/início/i)
    expect(rows[3]?.action).toBe('skip')
    expect(rows[3]?.message).toMatch(/ano/i)
  })

  it('só Ano início = vigente até ano corrente; status inválido skip', async () => {
    const csv = [
      'montadora;modelo;ano_inicio;motor;versao;status',
      'Toyota;Corolla;2018;2.0;XEi;Verificado',
      'Honda;Civic;2019;2.0;EX;ativo',
    ].join('\n')
    const file = new File([csv], 'so-inicio.csv', { type: 'text/csv' })
    const { rows } = await adminPreviewVehicleMasterImport(file)
    const now = new Date().getFullYear()
    expect(rows[0]?.action).toBe('create')
    expect(rows[0]?.anoInicio).toBe('2018')
    expect(rows[0]?.anoFim).toBe(String(Math.max(now, 2018)))
    expect(rows[0]?.ano).toBe('18/...')
    expect(rows[1]?.action).toBe('skip')
    expect(rows[1]?.message).toMatch(/Status inválido/)
  })

  it('lê coluna Combustível opcional e aliases', async () => {
    const csv = [
      'Montadora;Modelo;Versão;Motor;Combustível;Ano início;Ano fim;Status',
      'Volkswagen;Gol;1.0;1.0 MPI;FLEX;2010;2012;Verificado',
      'Ford;Ranger;XLT;3.2;Diesel;2015;2016;Verificado',
      'Fiat;Uno;Way;1.0;querosene;2010;2011;Verificado',
    ].join('\n')
    const file = new File([csv], 'fuel.csv', { type: 'text/csv' })
    const { rows, fileErrors } = await adminPreviewVehicleMasterImport(file)
    expect(fileErrors).toEqual([])
    expect(rows).toHaveLength(3)
    expect(rows[0]?.action).toBe('create')
    expect(rows[0]?.combustivel).toBe('Flex')
    expect(rows[0]?.message).toMatch(/Flex/)
    expect(rows[1]?.combustivel).toBe('Diesel')
    expect(rows[2]?.action).toBe('skip')
    expect(rows[2]?.message).toMatch(/Combustível inválido/)
  })
})
