import { describe, expect, it } from 'vitest'
import { customerFacingOrderEventLabel } from './orderLifecycle'

describe('customerFacingOrderEventLabel (pós-venda)', () => {
  it('abertura tipada', () => {
    expect(
      customerFacingOrderEventLabel('occurrence_opened', {
        tipo: 'pos_venda_devolucao',
        stage: 'aberto',
      }),
    ).toContain('solicitou ajuda')
  })

  it('autorizada por modo', () => {
    expect(
      customerFacingOrderEventLabel('occurrence_updated', {
        stage: 'autorizada',
        return_mode: 'me_codigo',
      }),
    ).toContain('gere o código')
    expect(
      customerFacingOrderEventLabel('occurrence_updated', {
        stage: 'autorizada',
        return_mode: 'wa',
      }),
    ).toContain('WhatsApp')
    expect(
      customerFacingOrderEventLabel('occurrence_updated', {
        stage: 'autorizada',
        return_mode: 'loja',
      }),
    ).toContain('loja')
  })

  it('código ME e resolução', () => {
    expect(
      customerFacingOrderEventLabel('occurrence_updated', {
        stage: 'aguardando_peca',
        me_reverse: { tracking_code: 'DRY-REV-1' },
      }),
    ).toContain('DRY-REV-1')
    expect(
      customerFacingOrderEventLabel('occurrence_resolved', {
        stage: 'resolvido',
        solucao: 'Estorno ok',
      }),
    ).toContain('encerrado')
  })

  it('fallback genérico fora pós-venda', () => {
    expect(customerFacingOrderEventLabel('occurrence_opened', { tipo: 'atraso' })).toBe(
      'Ocorrência aberta',
    )
    expect(customerFacingOrderEventLabel('order_shipped')).toBe('Pedido enviado')
  })
})
