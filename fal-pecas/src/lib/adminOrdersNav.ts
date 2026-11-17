const KEY = 'fal.admin.orders.returnPath'

function isAllowedReturnPath(path: string): boolean {
  if (path === '/admin' || path.startsWith('/admin?')) return true
  if (!path.startsWith('/admin/pedidos')) return false
  // rejeita detalhe UUID
  if (/^\/admin\/pedidos\/[0-9a-f-]{36}/i.test(path.split('?')[0] ?? path)) return false
  return true
}

/** Preserva a fila/área ao abrir o detalhe (path + search). */
export function rememberOrdersReturnPath(path: string): void {
  try {
    if (isAllowedReturnPath(path)) {
      sessionStorage.setItem(KEY, path)
    }
  } catch {
    /* ignore */
  }
}

export function peekOrdersReturnPath(fallback = '/admin/pedidos'): string {
  try {
    const v = sessionStorage.getItem(KEY)
    if (v && isAllowedReturnPath(v)) return v
  } catch {
    /* ignore */
  }
  return fallback
}

/** @deprecated use peekOrdersReturnPath */
export const consumeOrdersReturnPath = peekOrdersReturnPath
