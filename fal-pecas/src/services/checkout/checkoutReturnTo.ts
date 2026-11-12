/** Origem do checkout para botão Voltar (produto, carrinho, catálogo…). */

const KEY = 'fal.checkoutReturnTo.v1'

/** Path interno seguro — permite PDP/carrinho; bloqueia open redirect e loop no checkout. */
export function safeCheckoutReturnTo(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const path = value.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return null
  if (path === '/checkout' || path.startsWith('/checkout?') || path.startsWith('/checkout/')) {
    return null
  }
  if (path.startsWith('/login') || path.startsWith('/cadastro')) return null
  return path
}

export function saveCheckoutReturnTo(path: string): void {
  const safe = safeCheckoutReturnTo(path)
  if (!safe) return
  try {
    sessionStorage.setItem(KEY, safe)
  } catch {
    /* private mode */
  }
}

export function loadCheckoutReturnTo(): string | null {
  try {
    return safeCheckoutReturnTo(sessionStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function clearCheckoutReturnTo(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* private mode */
  }
}

export function checkoutBackLabel(path: string | null, isBuyNow: boolean): string {
  if (!path) return isBuyNow ? 'Voltar' : 'Voltar ao carrinho'
  if (path.startsWith('/produto/')) return 'Voltar ao produto'
  if (path.startsWith('/carrinho')) return 'Voltar ao carrinho'
  if (path.startsWith('/catalogo') || path.startsWith('/busca')) return 'Voltar'
  return 'Voltar'
}
