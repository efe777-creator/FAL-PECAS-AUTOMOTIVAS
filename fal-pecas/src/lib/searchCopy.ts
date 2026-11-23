/** Copy compartilhado SearchBar (header) × campo de busca do catálogo. */
export const SEARCH_INPUT_PLACEHOLDER =
  'Placa, peça ou código (ex.: ABC1D23 ou HB20 2015)'

export const SEARCH_CATALOG_HINT =
  'Busque por placa, peça ou código. Modelo + ano também funciona. A compatibilidade vem das aplicações cadastradas.'

export const SEARCH_ARIA_LABEL = 'Busca de peças e veículos'

/** Faixa quando a busca entendeu só o veículo (lista PVC / refine peça). */
export function searchVehicleBrowseLabel(opts: {
  maker?: string | null
  model?: string | null
  year?: string | null
}): string {
  const parts = [opts.maker?.trim(), opts.model?.trim(), opts.year?.trim()].filter(Boolean)
  const label = parts.join(' ')
  return label ? `Peças para ${label}` : 'Peças para o veículo selecionado'
}

export const SEARCH_REFINE_PRODUCT_HINT =
  'Digite a peça (ex.: axial, terminal, pivô) para refinar — ou navegue pelas categorias.'

/** Empty quando o campo de busca reconheceu o veículo mas não há PVC/peças. */
export function searchVehicleEmptyDescription(opts: {
  maker?: string | null
  model?: string | null
  year?: string | null
}): string {
  const parts = [opts.maker?.trim(), opts.model?.trim(), opts.year?.trim()].filter(Boolean)
  const label = parts.join(' ')
  if (label) {
    return `Reconhecemos o veículo ${label}. Nenhuma peça com aplicação cadastrada para ele ainda. Digite a peça para refinar ou cadastre aplicações no admin.`
  }
  return 'Identificamos o veículo, mas ainda não temos peças compatíveis cadastradas.'
}
