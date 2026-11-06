import { describe, expect, it } from 'vitest'
import { buildAdminBreadcrumbs } from '@/lib/adminBreadcrumbs'

describe('buildAdminBreadcrumbs', () => {
  it('dashboard sem migalha', () => {
    expect(buildAdminBreadcrumbs('/admin')).toEqual([])
    expect(buildAdminBreadcrumbs('/admin/')).toEqual([])
  })

  it('hub simples', () => {
    expect(buildAdminBreadcrumbs('/admin/produtos')).toEqual([
      { to: '/admin', label: 'Painel' },
      { label: 'Produtos' },
    ])
  })

  it('pedido detalhe', () => {
    const id = 'f6c08149-aaaa-bbbb-cccc-ddddeeeeffff'
    expect(buildAdminBreadcrumbs(`/admin/pedidos/${id}`)).toEqual([
      { to: '/admin', label: 'Painel' },
      { to: '/admin/pedidos', label: 'Pedidos' },
      { label: 'Detalhe' },
    ])
  })

  it('logística ME', () => {
    expect(buildAdminBreadcrumbs('/admin/logistica/melhor-envio')).toEqual([
      { to: '/admin', label: 'Painel' },
      { to: '/admin/logistica', label: 'Logística' },
      { label: 'Melhor Envio' },
    ])
  })

  it('área de pedidos', () => {
    expect(buildAdminBreadcrumbs('/admin/pedidos/separacao')).toEqual([
      { to: '/admin', label: 'Painel' },
      { to: '/admin/pedidos', label: 'Pedidos' },
      { label: 'Separação' },
    ])
  })
})
