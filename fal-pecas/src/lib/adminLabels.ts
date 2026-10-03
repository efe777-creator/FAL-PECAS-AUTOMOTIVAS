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
