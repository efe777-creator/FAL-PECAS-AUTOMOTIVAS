/**
 * Rótulos PT-BR de status/provedor de pagamento (mapa único O0-C).
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

const PAYMENT_PROVIDER_LABEL: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  mercado_pago: 'Mercado Pago',
  mp: 'Mercado Pago',
  simulated: 'Demonstração',
  demo: 'Demonstração',
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  pix: 'Pix',
  pix_simulated: 'Pix (demonstração)',
  credit_card: 'Cartão',
  card: 'Cartão',
  card_simulated: 'Cartão (demonstração)',
  debit_card: 'Cartão de débito',
}

export function paymentStatusLabel(status: string | null | undefined): string {
  const key = String(status ?? '')
    .trim()
    .toLowerCase()
  if (!key) return '—'
  return PAYMENT_STATUS_LABEL[key] ?? key
}

export function paymentProviderLabel(provider: string | null | undefined): string {
  const key = String(provider ?? '')
    .trim()
    .toLowerCase()
  if (!key) return '—'
  return PAYMENT_PROVIDER_LABEL[key] ?? key
}

export function paymentMethodLabel(method: string | null | undefined): string {
  const key = String(method ?? '')
    .trim()
    .toLowerCase()
  if (!key) return '—'
  return PAYMENT_METHOD_LABEL[key] ?? key
}
