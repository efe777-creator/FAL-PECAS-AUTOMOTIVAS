/** Rótulos PT para status administrativos (sem redesign). */

export function productStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'draft':
      return 'Rascunho'
    case 'published':
      return 'Publicado'
    case 'archived':
      return 'Arquivado'
    default:
      return status ?? '—'
  }
}

/** Selos de status no admin. Tokens FAL, válidos no tema claro e no escuro. */
export const ADMIN_CHIP = {
  ok: 'bg-fal-success/15 text-fal-fg',
  warn: 'border border-fal-warning/50 bg-fal-warning/15 text-fal-fg',
  danger: 'bg-fal-danger/15 text-fal-fg',
  info: 'bg-fal-navy/10 text-fal-fg',
  neutral: 'bg-fal-line/60 text-fal-muted',
} as const

/** Aba/filtro selecionado: navy no claro, amarelo no escuro. */
export const ADMIN_SEGMENT_ON =
  'border-fal-navy bg-fal-navy text-white dark:border-fal-yellow dark:bg-fal-yellow dark:text-fal-navy-dark'

export const ADMIN_SEGMENT_OFF =
  'border-fal-line bg-fal-surface text-fal-fg hover:border-fal-navy/40'

export function vehicleQualityBadge(status: string | null | undefined): {
  label: string
  className: string
} {
  switch (status) {
    case 'verified':
      return { label: 'Verificado', className: ADMIN_CHIP.ok }
    case 'quarantined':
      return { label: 'Quarentena', className: ADMIN_CHIP.danger }
    case 'superseded':
      return { label: 'Substituído', className: ADMIN_CHIP.neutral }
    case 'review':
    default:
      return { label: 'Revisão', className: ADMIN_CHIP.warn }
  }
}

export function entityStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'active':
      return 'Ativo'
    case 'inactive':
      return 'Inativo'
    case 'published':
      return 'Publicado'
    case 'archived':
      return 'Arquivado'
    case 'draft':
      return 'Rascunho'
    default:
      return status ?? '—'
  }
}

/** Tipos de referência / código cruzado do produto. */
export function productReferenceTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case 'manufacturer':
      return 'Código do fabricante'
    case 'oem':
      return 'Código OEM (montadora)'
    case 'internal':
      return 'Código interno'
    case 'competitor':
      return 'Código concorrente'
    case 'other':
      return 'Outro'
    default:
      return type ?? '—'
  }
}
