/**
 * Assuntos tipados da Central de Suporte (pós-#14).
 * Pós-venda exige pedido e mapeia para PostSaleMotiveCode.
 */

import type { PostSaleMotiveCode } from '@/lib/postSaleMotives'

export type SupportSubjectKind = 'post_sale' | 'general'

export type SupportSubject = {
  code: string
  label: string
  kind: SupportSubjectKind
  /** Pedido obrigatório no formulário. */
  requiresOrder: boolean
  /** Só para pós-venda — motive do pipeline D9. */
  motivoCode?: PostSaleMotiveCode
  /** Precisa texto livre (ex.: Outro). */
  needsCustomLabel?: boolean
}

export const SUPPORT_SUBJECTS: readonly SupportSubject[] = [
  {
    code: 'atraso',
    label: 'Atraso / não recebi',
    kind: 'post_sale',
    requiresOrder: true,
    motivoCode: 'atraso',
  },
  {
    code: 'avaria',
    label: 'Avaria no transporte',
    kind: 'post_sale',
    requiresOrder: true,
    motivoCode: 'avaria_transporte',
  },
  {
    code: 'item_faltando',
    label: 'Item faltando',
    kind: 'post_sale',
    requiresOrder: true,
    motivoCode: 'item_faltando',
  },
  {
    code: 'peca_errada',
    label: 'Peça errada / incompatível',
    kind: 'post_sale',
    requiresOrder: true,
    motivoCode: 'nao_serve_veiculo',
  },
  {
    code: 'arrependimento',
    label: 'Arrependimento da compra',
    kind: 'post_sale',
    requiresOrder: true,
    motivoCode: 'arrependimento',
  },
  {
    code: 'defeito',
    label: 'Defeito / vício',
    kind: 'post_sale',
    requiresOrder: true,
    motivoCode: 'defeito',
  },
  {
    code: 'quero_devolver',
    label: 'Quero devolver o item',
    kind: 'post_sale',
    requiresOrder: true,
    motivoCode: 'quero_devolver',
  },
  {
    code: 'outro_pedido',
    label: 'Outro problema com o pedido',
    kind: 'post_sale',
    requiresOrder: true,
    motivoCode: 'outro_suporte',
    needsCustomLabel: true,
  },
  {
    code: 'pagamento',
    label: 'Pagamento / cobrança',
    kind: 'general',
    requiresOrder: false,
  },
  {
    code: 'duvida_politica',
    label: 'Dúvida sobre política da loja',
    kind: 'general',
    requiresOrder: false,
  },
  {
    code: 'cadastro_conta',
    label: 'Cadastro / conta',
    kind: 'general',
    requiresOrder: false,
  },
  {
    code: 'outro',
    label: 'Outro',
    kind: 'general',
    requiresOrder: false,
    needsCustomLabel: true,
  },
] as const

export function findSupportSubject(code: string): SupportSubject | undefined {
  return SUPPORT_SUBJECTS.find((s) => s.code === code)
}

export function resolveSupportSubjectLabel(
  subject: SupportSubject,
  customLabel: string,
): string {
  if (subject.needsCustomLabel) {
    const t = customLabel.trim()
    return t || subject.label
  }
  return subject.label
}
