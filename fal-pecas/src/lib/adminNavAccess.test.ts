import { describe, expect, it } from 'vitest'
import { canAccessAdminPath, filterAdminNavLinks } from '@/lib/adminNavAccess'

describe('canAccessAdminPath', () => {
  it('nega customer', () => {
    expect(canAccessAdminPath('/admin/pedidos', 'customer')).toBe(false)
  })

  it('atendimento vê pedidos e clientes, não operadores', () => {
    expect(canAccessAdminPath('/admin/pedidos', 'atendimento')).toBe(true)
    expect(canAccessAdminPath('/admin/clientes', 'atendimento')).toBe(true)
    expect(canAccessAdminPath('/admin/operadores', 'atendimento')).toBe(false)
    expect(canAccessAdminPath('/admin/precos', 'atendimento')).toBe(false)
  })

  it('estoque vê estoque/produtos, não preços', () => {
    expect(canAccessAdminPath('/admin/estoque', 'estoque')).toBe(true)
    expect(canAccessAdminPath('/admin/produtos', 'estoque')).toBe(true)
    expect(canAccessAdminPath('/admin/precos', 'estoque')).toBe(false)
  })

  it('só administrador vê operadores', () => {
    expect(canAccessAdminPath('/admin/operadores', 'administrador')).toBe(true)
    expect(canAccessAdminPath('/admin/operadores', 'gerente')).toBe(false)
  })

  it('prefixo de rota herda permissão do hub', () => {
    expect(canAccessAdminPath('/admin/pedidos/lista', 'atendimento')).toBe(true)
    expect(canAccessAdminPath('/admin/produtos/novo', 'estoque')).toBe(true)
  })
})

describe('filterAdminNavLinks', () => {
  it('filtra lista', () => {
    const links = [
      { to: '/admin/pedidos', label: 'Pedidos' },
      { to: '/admin/operadores', label: 'Operadores' },
    ]
    expect(filterAdminNavLinks(links, 'atendimento').map((l) => l.to)).toEqual([
      '/admin/pedidos',
    ])
  })
})
