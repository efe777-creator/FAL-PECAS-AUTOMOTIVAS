/** Filtro de catálogo por product_kind (URL `?kind=kit|item`). */
export type CatalogProductKind = 'item' | 'kit'

export function parseCatalogProductKind(
  raw: string | null | undefined,
): CatalogProductKind | '' {
  const v = (raw ?? '').trim().toLowerCase()
  if (v === 'kit' || v === 'item') return v
  return ''
}

export function catalogProductKindLabel(kind: CatalogProductKind | ''): string {
  if (kind === 'kit') return 'Kits'
  if (kind === 'item') return 'Itens avulsos'
  return 'Todos'
}
