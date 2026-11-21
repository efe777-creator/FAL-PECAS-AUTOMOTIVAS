import { describe, expect, it } from 'vitest'
import {
  minimizeRecipientName,
  motiveRequiresPolicyAck,
  tipoFromMotive,
} from './postSaleMotives'

describe('postSaleMotives', () => {
  it('devolucao e incompat exigem ACK', () => {
    expect(motiveRequiresPolicyAck('quero_devolver')).toBe(true)
    expect(motiveRequiresPolicyAck('nao_serve_veiculo')).toBe(true)
    expect(motiveRequiresPolicyAck('atraso')).toBe(false)
  })

  it('mapeia tipo', () => {
    expect(tipoFromMotive('defeito')).toBe('pos_venda_devolucao')
    expect(tipoFromMotive('atraso')).toBe('pos_venda_suporte')
  })

  it('minimiza nome LGPD', () => {
    expect(minimizeRecipientName('Maria Silva Santos')).toBe('Maria S.')
    expect(minimizeRecipientName('João')).toBe('João')
    expect(minimizeRecipientName('')).toBeNull()
  })
})
