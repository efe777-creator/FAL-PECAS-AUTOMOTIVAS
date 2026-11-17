import { describe, expect, it } from 'vitest'
import {
  deepLinkForContextual,
  resolveQuickControl,
  resolveWidgetContextual,
  resolveWidgetDeepLink,
} from '@/lib/adminDashboardDeepLinks'

describe('adminDashboardDeepLinks', () => {
  it('cash aponta para Central financeiro, não hub de config', () => {
    expect(resolveWidgetDeepLink('cash-box')).toBe('/admin/pedidos?tab=financeiro')
    expect(resolveWidgetDeepLink('chart-cash-series')).toBe(
      '/admin/pedidos?tab=financeiro',
    )
    expect(resolveWidgetContextual('cash-box')).toEqual({ kind: 'hub-finance' })
  })

  it('kpi aguardando pagamento usa área comercial do hub', () => {
    expect(resolveWidgetDeepLink('kpi-awaiting-pay')).toBe(
      '/admin/pedidos?tab=comercial&area=aguardando-pagamento',
    )
    expect(resolveWidgetContextual('kpi-awaiting-pay')).toEqual({
      kind: 'hub-area',
      tab: 'comercial',
      area: 'aguardando-pagamento',
    })
  })

  it('team/customer abrem atenção filtrada', () => {
    expect(resolveWidgetContextual('kpi-team-action')).toEqual({
      kind: 'hub-attention',
      actor: 'team',
    })
    expect(resolveWidgetContextual('kpi-customer-action')).toEqual({
      kind: 'hub-attention',
      actor: 'customer',
    })
  })

  it('logistics fila e pipeline grupo', () => {
    expect(
      resolveWidgetDeepLink('logistics-queues', { logisticsFila: 'etiquetas-me' }),
    ).toBe('/admin/pedidos?tab=logistica&fila=etiquetas-me')
    expect(
      resolveWidgetDeepLink('pipeline-flow', { pipelineGrupo: 'analise' }),
    ).toBe('/admin/pedidos/lista?grupo=analise')
  })

  it('quick controls mapeiam corretamente', () => {
    expect(resolveQuickControl('analise').deepLink).toBe(
      '/admin/pedidos?tab=comercial&area=analise',
    )
    expect(resolveQuickControl('expedicao').contextual).toEqual({
      kind: 'hub-logistics',
      fila: 'volumes',
    })
    expect(resolveQuickControl('relatorios').deepLink).toBe('/admin/relatorios')
  })

  it('deepLinkForContextual cobre kinds', () => {
    expect(deepLinkForContextual({ kind: 'hub-finance' })).toBe(
      '/admin/pedidos?tab=financeiro',
    )
    expect(
      deepLinkForContextual({ kind: 'order', orderId: 'abc-123-def' }),
    ).toBe('/admin/pedidos/abc-123-def')
  })
})
