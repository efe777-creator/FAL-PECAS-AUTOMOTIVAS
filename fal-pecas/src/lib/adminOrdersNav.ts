const KEY = 'fal.admin.orders.returnPath'

/** Preserva a fila/área ao abrir o detalhe (Fase 2 — restaurar filtros). */
export function rememberOrdersReturnPath(path: string): void {
  try {
    if (path.startsWith('/admin/pedidos') && !/^\/admin\/pedidos\/[0-9a-f-]{36}/i.test(path)) {
      sessionStorage.setItem(KEY, path)
    }
  } catch {
    /* ignore */
  }
}

export function peekOrdersReturnPath(fallback = '/admin/pedidos'): string {
  try {
    const v = sessionStorage.getItem(KEY)
    if (v && v.startsWith('/admin/pedidos')) return v
  } catch {
    /* ignore */
  }
  return fallback
}

/** @deprecated use peekOrdersReturnPath */
export const consumeOrdersReturnPath = peekOrdersReturnPath
