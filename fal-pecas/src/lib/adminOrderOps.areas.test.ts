import { describe, expect, it } from 'vitest'
import {
  ADMIN_ORDER_AREAS,
  ADMIN_ORDER_VIEWS,
  adminOrderAreaId,
  orderMatchesArea,
  orderMatchesProblemsView,
  sumAreaCount,
} from './adminOrderOps'

describe('ADMIN_ORDER_AREAS / views', () => {
  it('mapeia status para as 4 áreas sem inventar status', () => {
    expect(adminOrderAreaId('aguardando_pagamento')).toBe('aguardando-pagamento')
    expect(adminOrderAreaId('em_analise')).toBe('analise')
    expect(adminOrderAreaId('aguardando_decisao')).toBe('analise')
    expect(adminOrderAreaId('em_separacao')).toBe('separacao')
    expect(adminOrderAreaId('pronto_para_envio')).toBe('expedicao')
    expect(adminOrderAreaId('enviado')).toBe('expedicao')
    expect(adminOrderAreaId('entregue')).toBe('expedicao')
    expect(ADMIN_ORDER_AREAS).toHaveLength(4)
  })

  it('orderMatchesArea e contagem', () => {
    expect(orderMatchesArea('em_analise', 'analise')).toBe(true)
    expect(orderMatchesArea('enviado', 'analise')).toBe(false)
    expect(
      sumAreaCount({ em_analise: 2, aguardando_decisao: 1 }, ADMIN_ORDER_AREAS[1]!),
    ).toBe(3)
  })

  it('visão problemas = decisão rejected ou pagamento failed', () => {
    expect(
      orderMatchesProblemsView({
        status: 'aguardando_decisao',
        customerDecision: 'rejected',
      }),
    ).toBe(true)
    expect(
      orderMatchesProblemsView({
        status: 'aguardando_pagamento',
        paymentStatus: 'failed',
      }),
    ).toBe(true)
    expect(
      orderMatchesProblemsView({
        status: 'em_analise',
        customerDecision: null,
      }),
    ).toBe(false)
  })

  it('atalho cancelamento filtra por solicitação pendente (não placeholder)', () => {
    const v = ADMIN_ORDER_VIEWS.find((x) => x.id === 'solicitacoes-cancelamento')
    expect(v?.placeholder).toBeFalsy()
    expect(v?.statuses).toBeNull()
  })
})
