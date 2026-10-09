/**
 * Vocabulário oficial de runs de importação (FAL-IMP-06 / FIND-009).
 */

export const IMPORT_KINDS = [
  'catalog',
  'catalog_applications',
  'supplier_conversion',
  'supplier_cost',
  'price_list',
] as const

export type ImportKind = (typeof IMPORT_KINDS)[number]

export function importKindLabel(kind: string): string {
  if (kind === 'catalog') return 'Catálogo (produtos)'
  if (kind === 'catalog_applications') return 'Aplicações'
  if (kind === 'supplier_conversion') return 'Conversões de fornecedor'
  if (kind === 'supplier_cost') return 'Custos de fornecedor'
  if (kind === 'price_list') return 'Lista de preços'
  return kind
}

export function importStatusLabel(status: string): string {
  if (status === 'preview') return 'Pré-visualização'
  if (status === 'done') return 'Concluída'
  if (status === 'failed') return 'Falhou'
  if (status === 'running') return 'Em andamento'
  return status
}

/** Rota do wizard para nova importação do kind (se existir). */
export function importWizardPath(kind: string): string | null {
  if (kind === 'catalog') return '/admin/produtos/importar'
  if (kind === 'catalog_applications') return '/admin/produtos/importar-aplicacoes'
  if (kind === 'supplier_conversion') return '/admin/fornecedores/importar-conversoes'
  if (kind === 'supplier_cost') return '/admin/fornecedores/importar-custos'
  if (kind === 'price_list') return '/admin/precos'
  return null
}
