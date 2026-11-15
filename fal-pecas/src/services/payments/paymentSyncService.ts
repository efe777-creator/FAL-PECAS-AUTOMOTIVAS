import { getOwnPayment } from '@/services/payments/ownPaymentService'
import { syncAsaasPayment } from '@/services/payments/asaasSyncPaymentService'
import { syncMercadoPagoPayment } from '@/services/payments/mpSyncPaymentService'
import type { SyncMpPaymentResult } from '@/services/payments/mpSyncPaymentService'

/** Poll de cobrança conforme o provedor gravado no ledger. */
export async function syncCheckoutPayment(paymentId: string): Promise<SyncMpPaymentResult> {
  const row = await getOwnPayment(paymentId)
  if (row?.provider === 'asaas') return syncAsaasPayment(paymentId)
  return syncMercadoPagoPayment(paymentId)
}