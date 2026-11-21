/**
 * Ciclo de vida na listagem admin de produtos (Notes #4).
 * Espelha o padrão de Categorias: lista principal = ativos; arquivados sob demanda.
 *
 * - Ativos = draft | published (na loja / em preparação)
 * - Inativos = archived (fora do catálogo)
 */

export type ProductListLifecycle = {
  /** draft + published */
  showActive: boolean
  /** archived */
  showInactive: boolean
}

export const DEFAULT_PRODUCT_LIST_LIFECYCLE: ProductListLifecycle = {
  showActive: true,
  showInactive: false,
}

/** Ajuste fino dentro dos ativos (select Status). */
export type ProductListFineStatus = 'draft' | 'published' | ''

export type ProductStatusQuery =
  | { kind: 'empty' }
  | { kind: 'eq'; status: string }
  | { kind: 'neq'; status: string }
  | { kind: 'none' }

/**
 * Resolve filtro de status para a query Supabase.
 * `fineStatus` (draft/published) só aplica quando há ativos na seleção.
 * `status` legado explícito (ex.: pickers com status: 'published') tem prioridade.
 */
export function resolveProductStatusQuery(opts: {
  lifecycle?: ProductListLifecycle | null
  /** draft | published | archived — override legado / pickers */
  status?: string | null
}): ProductStatusQuery {
  const explicit = (opts.status ?? '').trim()
  if (explicit) {
    return { kind: 'eq', status: explicit }
  }

  const life = opts.lifecycle ?? DEFAULT_PRODUCT_LIST_LIFECYCLE
  const active = Boolean(life.showActive)
  const inactive = Boolean(life.showInactive)

  if (!active && !inactive) return { kind: 'empty' }
  if (active && inactive) return { kind: 'none' }
  if (inactive) return { kind: 'eq', status: 'archived' }
  return { kind: 'neq', status: 'archived' }
}

/** Chip / label da barra de ciclo de vida. */
export function productLifecycleChipLabel(life: ProductListLifecycle): string | null {
  if (life.showActive && life.showInactive) return 'Ativos + inativos'
  if (life.showActive && !life.showInactive) return null // padrão — sem chip
  if (!life.showActive && life.showInactive) return 'Só inativos'
  return 'Nenhum ciclo'
}
