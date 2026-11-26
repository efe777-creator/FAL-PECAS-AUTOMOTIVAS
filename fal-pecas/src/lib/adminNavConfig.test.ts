import { describe, expect, it } from 'vitest'
import { ADMIN_NAV_HOME, ADMIN_NAV_SECTIONS, adminNavLinkOrder } from './adminNavConfig'

describe('adminNavConfig', () => {
  it('ordena: Painel → Dia a dia → Loja → Comercial → Catálogo → Veículos → Sistema', () => {
    const order = adminNavLinkOrder()
    expect(order[0]).toBe('/admin')
    expect(order.indexOf('/admin/pedidos')).toBeLessThan(order.indexOf('/admin/home'))
    expect(order.indexOf('/admin/home')).toBeLessThan(order.indexOf('/admin/clientes'))
    expect(order.indexOf('/admin/clientes')).toBeLessThan(order.indexOf('/admin/produtos'))
    expect(order.indexOf('/admin/produtos')).toBeLessThan(order.indexOf('/admin/montadoras'))
    expect(order.indexOf('/admin/montadoras')).toBeLessThan(order.indexOf('/admin/operadores'))
    expect(order[order.length - 1]).toBe('/admin/operadores')
  })

  it('mantém home e seções sem to duplicado', () => {
    const order = adminNavLinkOrder()
    expect(new Set(order).size).toBe(order.length)
    expect(ADMIN_NAV_HOME.label).toBe('Painel')
    expect(ADMIN_NAV_SECTIONS.map((s) => s.id)).toEqual([
      'dia-a-dia',
      'loja',
      'comercial',
      'catalogo',
      'veiculos',
      'sistema',
    ])
  })

  it('Catálogo tem Kits; Loja não tem Promoções de kits solto', () => {
    const order = adminNavLinkOrder()
    expect(order).toContain('/admin/kits')
    expect(order.indexOf('/admin/produtos')).toBeLessThan(order.indexOf('/admin/kits'))
    expect(order).not.toContain('/admin/home/promocoes/kits')
    expect(order).toContain('/admin/home/promocoes')
  })

  it('Veículos tem Integrações e Importar após CRUD e antes de Modelos 3D', () => {
    const order = adminNavLinkOrder()
    expect(order).toContain('/admin/veiculos/integracoes')
    expect(order).toContain('/admin/veiculos/importar-mestre')
    expect(order.indexOf('/admin/veiculos')).toBeLessThan(
      order.indexOf('/admin/veiculos/integracoes'),
    )
    expect(order.indexOf('/admin/veiculos/integracoes')).toBeLessThan(
      order.indexOf('/admin/veiculos/importar-mestre'),
    )
    expect(order.indexOf('/admin/veiculos/importar-mestre')).toBeLessThan(
      order.indexOf('/admin/modelos-3d'),
    )
  })
})
