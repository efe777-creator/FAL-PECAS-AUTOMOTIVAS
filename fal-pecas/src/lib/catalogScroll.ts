/** Remove `page` da query — “Carregar mais” não deve invalidar a memória de scroll. */
export function catalogScrollSearchKey(search: string): string {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(raw)
  params.delete('page')
  const next = params.toString()
  return next ? `?${next}` : ''
}

/** Chave de sessionStorage para restaurar scroll do catálogo ao voltar da PDP. */
export function catalogScrollStorageKey(pathname: string, search: string): string {
  return `fal:catalog-scroll:${pathname}${catalogScrollSearchKey(search)}`
}

export function saveCatalogScroll(pathname: string, search: string, y = window.scrollY): void {
  try {
    sessionStorage.setItem(catalogScrollStorageKey(pathname, search), String(Math.max(0, y)))
  } catch {
    /* quota / private mode */
  }
}

export function readCatalogScroll(pathname: string, search: string): number | null {
  try {
    const raw = sessionStorage.getItem(catalogScrollStorageKey(pathname, search))
    if (raw == null) return null
    const y = Number(raw)
    return Number.isFinite(y) && y > 0 ? y : null
  } catch {
    return null
  }
}
