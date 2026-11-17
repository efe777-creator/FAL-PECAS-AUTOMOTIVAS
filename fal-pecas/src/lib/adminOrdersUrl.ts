/**
 * Contrato de URL do hub unificado (Adaptive Workspace).
 * Mantém `?fila=` (não inventa `?filtro=`).
 */

export type OrdersHubTab =
  | 'visao-geral'
  | 'pedidos'
  | 'comercial'
  | 'logistica'
  | 'financeiro'

export type OrdersHubArea = 'aguardando-pagamento' | 'analise' | 'separacao' | null

const TABS: readonly OrdersHubTab[] = [
  'visao-geral',
  'pedidos',
  'comercial',
  'logistica',
  'financeiro',
] as const

const AREAS: readonly Exclude<OrdersHubArea, null>[] = [
  'aguardando-pagamento',
  'analise',
  'separacao',
] as const

function isTab(v: string | null): v is OrdersHubTab {
  return v != null && (TABS as readonly string[]).includes(v)
}

function isArea(v: string | null): v is Exclude<OrdersHubArea, null> {
  return v != null && (AREAS as readonly string[]).includes(v)
}

export function parseOrdersHubSearch(search: string): {
  tab: OrdersHubTab
  area: OrdersHubArea
  fila: string | null
} {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const rawTab = q.get('tab')
  const rawArea = q.get('area')
  const fila = q.get('fila')
  return {
    tab: isTab(rawTab) ? rawTab : 'visao-geral',
    area: isArea(rawArea) ? rawArea : null,
    fila: fila && fila.trim() ? fila.trim() : null,
  }
}

export function buildOrdersHubPath(input: {
  tab?: OrdersHubTab
  area?: OrdersHubArea
  fila?: string | null
}): string {
  const tab = input.tab ?? 'visao-geral'
  const p = new URLSearchParams()
  if (tab !== 'visao-geral') p.set('tab', tab)
  if (input.area) p.set('area', input.area)
  if (input.fila) p.set('fila', input.fila)
  const qs = p.toString()
  return qs ? `/admin/pedidos?${qs}` : '/admin/pedidos'
}

/** Converte path legado de área → hub. Retorna null se não for área onda 1. */
export function legacyAreaPathToHub(pathname: string, search: string): string | null {
  const path = pathname.replace(/\/+$/, '') || pathname
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const fila = q.get('fila')

  if (path === '/admin/pedidos/aguardando-pagamento') {
    return buildOrdersHubPath({ tab: 'comercial', area: 'aguardando-pagamento' })
  }
  if (path === '/admin/pedidos/analise') {
    return buildOrdersHubPath({ tab: 'comercial', area: 'analise' })
  }
  if (path === '/admin/pedidos/separacao') {
    return buildOrdersHubPath({ tab: 'pedidos', area: 'separacao' })
  }
  if (path === '/admin/pedidos/expedicao') {
    // Bug legado: ?fila=revisao não é fila válida — canônico é visão.
    if (fila === 'revisao') return '/admin/pedidos/visao/revisao-logistica'
    return buildOrdersHubPath({
      tab: 'logistica',
      fila: fila || null,
    })
  }
  return null
}
