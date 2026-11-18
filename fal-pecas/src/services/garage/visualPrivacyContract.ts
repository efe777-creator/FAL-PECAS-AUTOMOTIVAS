/**
 * PLANO 2B · contratos de privacidade da Camada 1 (config visual).
 * Pure — usado em testes/VAL. Sem write-back para 2A.
 */

export type VisualConfigOwnerRef = {
  ownerCustomerId: string
  visibility: 'private_owner' | 'period' | 'shared' | 'public_vehicle'
}

/** Transferência NÃO herda config private_owner do dono anterior. */
export function transferInheritsPrivateVisualConfig(): false {
  return false
}

/** Fase A: sem checkbox de promoção de prefs visuais no wizard. */
export function transferWizardPromotesPrivateVisual(): false {
  return false
}

/** Share 2A não concede edição visual. */
export function shareGrantsVisualEdit(): false {
  return false
}

/**
 * Após transferência, o novo owner só usa config cujo owner_customer_id == ele.
 * Config do anterior permanece do anterior (RLS + filtro de serviço).
 */
export function pickMyVisualConfigRow<T extends VisualConfigOwnerRef>(
  rows: T[],
  currentCustomerId: string | null,
): T | null {
  if (!currentCustomerId) return null
  const mine = rows.filter((r) => r.ownerCustomerId === currentCustomerId)
  return mine[0] ?? null
}

/** Novo owner não deve “ver como minha” a private_owner do anterior. */
export function previousOwnerPrivateVisibleAsMine(
  row: VisualConfigOwnerRef,
  currentCustomerId: string,
): boolean {
  if (row.visibility !== 'private_owner') return false
  return row.ownerCustomerId === currentCustomerId
}
