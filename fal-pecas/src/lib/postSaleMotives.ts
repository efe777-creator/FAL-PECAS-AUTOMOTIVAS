/** Motivos tipados pós-venda (D9). */

export type PostSaleMotiveGroup = 'suporte' | 'incompat' | 'devolucao'

export type PostSaleMotiveCode =
  | 'atraso'
  | 'avaria_transporte'
  | 'item_faltando'
  | 'outro_suporte'
  | 'nao_serve_veiculo'
  | 'divergencia_catalogo'
  | 'duvida_aplicacao'
  | 'arrependimento'
  | 'defeito'
  | 'quero_devolver'

export type PostSaleMotive = {
  code: PostSaleMotiveCode
  group: PostSaleMotiveGroup
  label: string
}

export const POST_SALE_MOTIVES: readonly PostSaleMotive[] = [
  { code: 'atraso', group: 'suporte', label: 'Atraso na entrega' },
  { code: 'avaria_transporte', group: 'suporte', label: 'Avaria no transporte' },
  { code: 'item_faltando', group: 'suporte', label: 'Item faltando' },
  { code: 'outro_suporte', group: 'suporte', label: 'Outro problema com a entrega' },
  { code: 'nao_serve_veiculo', group: 'incompat', label: 'Não serve no veículo' },
  { code: 'divergencia_catalogo', group: 'incompat', label: 'Divergência com o catálogo' },
  { code: 'duvida_aplicacao', group: 'incompat', label: 'Dúvida de aplicação' },
  { code: 'arrependimento', group: 'devolucao', label: 'Arrependimento da compra' },
  { code: 'defeito', group: 'devolucao', label: 'Defeito / vício' },
  { code: 'quero_devolver', group: 'devolucao', label: 'Quero devolver o item' },
]

export function motiveRequiresPolicyAck(code: PostSaleMotiveCode): boolean {
  const m = POST_SALE_MOTIVES.find((x) => x.code === code)
  return m?.group === 'incompat' || m?.group === 'devolucao'
}

export function motiveRequiresItemScope(code: PostSaleMotiveCode): boolean {
  return motiveRequiresPolicyAck(code)
}

export function tipoFromMotive(code: PostSaleMotiveCode): string {
  const m = POST_SALE_MOTIVES.find((x) => x.code === code)
  if (m?.group === 'devolucao') return 'pos_venda_devolucao'
  if (m?.group === 'incompat') return 'pos_venda_incompat'
  return 'pos_venda_suporte'
}

/** LGPD: primeiro nome + inicial do sobrenome. */
export function minimizeRecipientName(full: string | null | undefined): string | null {
  const t = String(full ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return null
  const parts = t.split(' ')
  if (parts.length === 1) return parts[0]
  const last = parts[parts.length - 1]
  return `${parts[0]} ${last.charAt(0)}.`
}
