import { describe, expect, it } from 'vitest'
import {
  buildOrdersHubPath,
  legacyAreaPathToHub,
  parseOrdersHubSearch,
  sanitizeOrdersHubState,
} from './adminOrdersUrl'

describe('adminOrdersUrl', () => {
  it('preserva fila no redirect de expedicao', () => {
    expect(legacyAreaPathToHub('/admin/pedidos/expedicao', '?fila=etiquetas-me')).toBe(
      '/admin/pedidos?tab=logistica&fila=etiquetas-me',
    )
  })

  it('mapeia analise para comercial+area', () => {
    expect(legacyAreaPathToHub('/admin/pedidos/analise', '')).toBe(
      '/admin/pedidos?tab=comercial&area=analise',
    )
  })

  it('mapeia aguardando-pagamento e separacao', () => {
    expect(legacyAreaPathToHub('/admin/pedidos/aguardando-pagamento', '')).toBe(
      '/admin/pedidos?tab=comercial&area=aguardando-pagamento',
    )
    expect(legacyAreaPathToHub('/admin/pedidos/separacao', '')).toBe(
      '/admin/pedidos?tab=pedidos&area=separacao',
    )
  })

  it('expedicao sem fila vai para logistica', () => {
    expect(legacyAreaPathToHub('/admin/pedidos/expedicao', '')).toBe(
      '/admin/pedidos?tab=logistica',
    )
  })

  it('fila=revisao redireciona para visão canônica', () => {
    expect(legacyAreaPathToHub('/admin/pedidos/expedicao', '?fila=revisao')).toBe(
      '/admin/pedidos/visao/revisao-logistica',
    )
  })

  it('parse e build são estáveis', () => {
    const path = buildOrdersHubPath({
      tab: 'logistica',
      fila: 'volumes',
    })
    expect(path).toBe('/admin/pedidos?tab=logistica&fila=volumes')
    expect(parseOrdersHubSearch('?tab=logistica&fila=volumes')).toEqual({
      tab: 'logistica',
      area: null,
      fila: 'volumes',
    })
  })

  it('default tab visao-geral sem query', () => {
    expect(parseOrdersHubSearch('')).toEqual({
      tab: 'visao-geral',
      area: null,
      fila: null,
    })
    expect(buildOrdersHubPath({})).toBe('/admin/pedidos')
  })

  it('sanitize descarta area inválida por aba', () => {
    expect(
      sanitizeOrdersHubState({ tab: 'pedidos', area: 'analise', fila: 'volumes' }),
    ).toEqual({ tab: 'pedidos', area: null, fila: null })
    expect(
      sanitizeOrdersHubState({
        tab: 'comercial',
        area: 'separacao',
        fila: 'volumes',
      }),
    ).toEqual({ tab: 'comercial', area: 'aguardando-pagamento', fila: null })
    expect(
      sanitizeOrdersHubState({ tab: 'logistica', area: 'analise', fila: 'volumes' }),
    ).toEqual({ tab: 'logistica', area: null, fila: 'volumes' })
    expect(
      sanitizeOrdersHubState({
        tab: 'visao-geral',
        area: 'analise',
        fila: 'volumes',
      }),
    ).toEqual({ tab: 'visao-geral', area: null, fila: null })
  })

  it('parse aplica sanitize em area órfã', () => {
    expect(parseOrdersHubSearch('?tab=pedidos&area=analise')).toEqual({
      tab: 'pedidos',
      area: null,
      fila: null,
    })
  })
})
