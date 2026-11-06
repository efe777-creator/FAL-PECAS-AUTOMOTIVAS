import { confirmDialog } from '@/components/common/ConfirmDialog'
import {
  adminExpireUnpaidOrders,
  type ExpireUnpaidOrdersResult,
} from '@/services/admin/adminOrderService'

export const EXPIRE_UNPAID_CONFIRM = {
  title: 'Retirar pedidos não pagos?',
  confirmLabel: 'Retirar da fila',
  shortMessage:
    'Retirar da fila (cancelar) pedidos com mais de 48 h sem pagamento aprovado?',
  detailedMessage:
    'Retirar da fila (cancelar) pedidos com mais de 48 h sem pagamento aprovado?\n\n' +
    'Histórico permanece. Reserva liberada. Pix (5 min) é independente — não cancela o pedido.',
} as const

/** Diálogo canônico Hub / Lista / Área. */
export async function confirmExpireUnpaidIntent(opts?: {
  detailed?: boolean
}): Promise<boolean> {
  const { confirmed } = await confirmDialog({
    title: EXPIRE_UNPAID_CONFIRM.title,
    message:
      opts?.detailed === false
        ? EXPIRE_UNPAID_CONFIRM.shortMessage
        : EXPIRE_UNPAID_CONFIRM.detailedMessage,
    confirmLabel: EXPIRE_UNPAID_CONFIRM.confirmLabel,
    danger: true,
  })
  return confirmed
}

export async function runExpireUnpaidOrders(opts?: {
  limit?: number
  maxAgeHours?: number
}): Promise<ExpireUnpaidOrdersResult> {
  return adminExpireUnpaidOrders({
    limit: opts?.limit ?? 50,
    maxAgeHours: opts?.maxAgeHours ?? 48,
  })
}

/**
 * Confirma + RPC. `null` = operador cancelou.
 * Preferir `confirmExpireUnpaidIntent` + `runExpireUnpaidOrders` quando a UI precisa de busy só no RPC.
 */
export async function confirmAndExpireUnpaidOrders(opts?: {
  detailed?: boolean
  limit?: number
  maxAgeHours?: number
}): Promise<ExpireUnpaidOrdersResult | null> {
  if (!(await confirmExpireUnpaidIntent({ detailed: opts?.detailed }))) return null
  return runExpireUnpaidOrders(opts)
}

export function formatExpireUnpaidMessage(r: ExpireUnpaidOrdersResult): string {
  return r.expired > 0
    ? `${r.expired} pedido(s) retirado(s) da fila (não pagos > ${r.maxAgeHours} h).`
    : `Nenhum pedido elegível (> ${r.maxAgeHours} h sem pagamento).`
}
