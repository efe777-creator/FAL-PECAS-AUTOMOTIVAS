/**
 * Rótulos PT-BR de status de envio (shipments.status).
 * Valores canônicos: pending | ready | shipped | delivered | cancelled.
 */

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'pendente',
  ready: 'pronto para envio',
  shipped: 'enviado',
  delivered: 'entregue',
  cancelled: 'cancelado',
}

export function shipmentStatusLabel(status: string | null | undefined): string {
  const key = String(status ?? '')
    .trim()
    .toLowerCase()
  if (!key) return '—'
  return SHIPMENT_STATUS_LABEL[key] ?? key
}
