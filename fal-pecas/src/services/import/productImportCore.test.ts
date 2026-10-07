import { describe, expect, it } from 'vitest'
import {
  consolidateProductRows,
  normalizeLado,
  normalizePosicao,
  productFrozenPayload,
  splitHfMappedRows,
} from '@/services/import/productImportCore'

describe('normalizePosicao / normalizeLado', () => {
  it('normaliza abreviações HF', () => {
    expect(normalizePosicao('DIANT')).toEqual({ ok: true, value: 'DIANTEIRA' })
    expect(normalizePosicao('DIANTEIRO')).toEqual({ ok: true, value: 'DIANTEIRA' })
    expect(normalizePosicao('TRAS')).toEqual({ ok: true, value: 'TRASEIRA' })
    expect(normalizeLado('LE')).toEqual({ ok: true, value: 'ESQUERDO' })
    expect(normalizeLado('LD')).toEqual({ ok: true, value: 'DIREITO' })
    expect(normalizeLado('LD/LE')).toEqual({ ok: true, value: 'AMBOS' })
    expect(normalizePosicao('')).toEqual({ ok: true, value: null })
    expect(normalizePosicao('XYZ').ok).toBe(false)
  })
})

describe('productImportCore', () => {
  it('consolida SKU repetido em 1 produto com posicao/lado', () => {
    const rows = consolidateProductRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: '1307B',
            name: 'COXIM',
            categoria: 'SUSPENSAO',
            grupo: 'COXIM LE',
            subgrupo: '',
            posicao: 'DIANT',
            lado: 'LE',
            descricao_curta: '',
            descricao: '',
          },
        },
        {
          lineNumber: 3,
          values: {
            sku: '1307B',
            name: 'COXIM',
            categoria: 'SUSPENSAO',
            grupo: 'COXIM LE',
            subgrupo: 'C/ROL',
            posicao: 'DIANT',
            lado: 'LE',
            descricao_curta: 'curta',
            descricao: 'longa',
          },
        },
      ],
      new Map(),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].sku).toBe('1307B')
    expect(rows[0].action).toBe('create')
    expect(rows[0].posicao).toBe('DIANTEIRA')
    expect(rows[0].lado).toBe('ESQUERDO')
    expect(rows[0].subgrupo).toBe('C/ROL')
    expect(rows[0].sourceLines).toEqual([2, 3])
    const payload = productFrozenPayload(rows[0])
    expect(payload.posicao).toBe('DIANTEIRA')
    expect(payload.lado).toBe('ESQUERDO')
    expect(payload).not.toHaveProperty('montadora')
  })

  it('posição inválida → erro', () => {
    const rows = consolidateProductRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'X',
            name: 'Peca',
            categoria: 'Cat',
            grupo: 'Grp',
            posicao: 'FOO',
            lado: '',
          },
        },
      ],
      new Map(),
    )
    expect(rows[0].action).toBe('error')
    expect(rows[0].applyable).toBe(false)
  })

  it('HF split — 5 linhas → 5 apps + 1 produto com lado', () => {
    const lines = [1, 2, 3, 4, 5].map((n) => ({
      lineNumber: n,
      values: {
        sku: '1307B',
        name: 'COXIM',
        categoria: 'SUSPENSAO',
        grupo: 'COXIM',
        subgrupo: '',
        posicao: 'DIANT',
        lado: 'LE',
        montadora: 'FIAT',
        modelo: `M${n}`,
        versao: '',
        ano_inicio: '1997',
        ano_fim: '2017',
        descricao_curta: '',
        descricao: '',
      },
    }))
    const { productMapped, applicationMapped } = splitHfMappedRows(lines)
    expect(applicationMapped).toHaveLength(5)
    expect(productMapped[0].values.posicao).toBe('DIANT')
    const products = consolidateProductRows(productMapped, new Map())
    expect(products).toHaveLength(1)
    expect(products[0].posicao).toBe('DIANTEIRA')
    expect(products[0].lado).toBe('ESQUERDO')
    expect(products[0].sourceLines).toHaveLength(5)
  })

  it('SKU existente → update', () => {
    const rows = consolidateProductRows(
      [
        {
          lineNumber: 2,
          values: {
            sku: 'X1',
            name: 'Peca',
            categoria: 'Cat',
            grupo: 'Grp',
            subgrupo: '',
            posicao: '',
            lado: '',
            descricao_curta: '',
            descricao: '',
          },
        },
      ],
      new Map([['x1', 'uuid-1']]),
    )
    expect(rows[0].action).toBe('update')
    expect(rows[0].productId).toBe('uuid-1')
  })
})
