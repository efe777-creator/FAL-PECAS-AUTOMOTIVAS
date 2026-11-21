import { describe, expect, it } from 'vitest'
import {
  revisaoChipForRow,
  revisaoModeCodeLabel,
  revisaoNextActionLabel,
  revisaoStageLabel,
  revisaoTipoLabel,
  rowMatchesRevisaoChip,
} from './postSaleRevisaoChips'

describe('postSaleRevisaoChips', () => {
  it('mapeia tipos pos_venda', () => {
    expect(
      revisaoChipForRow({ source: 'occurrence', tipo: 'pos_venda_devolucao' }),
    ).toBe('devolucao')
    expect(
      revisaoChipForRow({ source: 'occurrence', tipo: 'pos_venda_incompat' }),
    ).toBe('devolucao')
    expect(
      revisaoChipForRow({ source: 'occurrence', tipo: 'pos_venda_suporte' }),
    ).toBe('suporte')
    expect(revisaoChipForRow({ source: 'occurrence', tipo: 'pos_entrega' })).toBe(
      'suporte',
    )
    expect(revisaoChipForRow({ source: 'manual_review' })).toBe('aguardando')
  })

  it('stage aguardando_peca / em_conferencia → chip aguardando', () => {
    expect(
      revisaoChipForRow({
        source: 'occurrence',
        tipo: 'pos_venda_devolucao',
        stage: 'aguardando_peca',
      }),
    ).toBe('aguardando')
    expect(
      revisaoChipForRow({
        source: 'occurrence',
        tipo: 'pos_venda_devolucao',
        stage: 'em_conferencia',
      }),
    ).toBe('aguardando')
    expect(
      revisaoChipForRow({
        source: 'occurrence',
        tipo: 'pos_venda_devolucao',
        stage: 'autorizada',
      }),
    ).toBe('devolucao')
  })

  it('filtra chips', () => {
    const row = { source: 'occurrence' as const, tipo: 'pos_venda_devolucao' }
    expect(rowMatchesRevisaoChip('todas', row)).toBe(true)
    expect(rowMatchesRevisaoChip('devolucao', row)).toBe(true)
    expect(rowMatchesRevisaoChip('suporte', row)).toBe(false)
  })

  it('labels lista Adaptive (Tipo / Stage / Modo-código / Faça agora)', () => {
    expect(revisaoTipoLabel('pos_venda_devolucao')).toBe('Devolução')
    expect(revisaoStageLabel('em_analise')).toBe('Em análise')
    expect(
      revisaoModeCodeLabel({
        source: 'occurrence',
        returnMode: 'me_codigo',
        trackingCode: 'ME123',
      }),
    ).toBe('Código Melhor Envio · ME123')
    expect(
      revisaoNextActionLabel({
        source: 'occurrence',
        tipo: 'pos_venda_devolucao',
        stage: 'em_analise',
      }),
    ).toBe('Autorizar ou recusar')
  })
})
