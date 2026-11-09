/**
 * Rótulos PT-BR de status de pagamento (mapa único O0-C).
 * Evita inglês/jargão na UI da loja (Pix, cartão, conta).
 */

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  idle: 'aguardando',
  pending: 'pendente',
  in_process: 'em análise',
  approved: 'aprovado',
  rejected: 'recusado',
  cancelled: 'cancelado',
  expired: 'expirado',
  refunded: 'estornado',
}

export function paymentStatusLabel(status: string | null | undefined): string {
  const key = String(status ?? '')
    .trim()
    .toLowerCase()
  if (!key) return '—'
  return PAYMENT_STATUS_LABEL[key] ?? key
}
