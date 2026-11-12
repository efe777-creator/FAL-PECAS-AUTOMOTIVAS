import { isCheckoutPaymentSettled } from '@/services/checkout/isCheckoutPaymentSettled'
import { getMyOrderDetail } from '@/services/orders/orderDetailService'
import { syncMercadoPagoPayment } from '@/services/payments/mpSyncPaymentService'
import { listOwnPaymentStatusesByOrder } from '@/services/payments/ownPaymentService'
import { useEffect, useRef } from 'react'

const POLL_MS = 3500

/**
 * Enquanto o checkout está em mpAwaiting, observa o pedido mesmo se o painel
 * Pix/cartão estiver desmontado (Ver entrega / troca de canal).
 */
export function useCheckoutOrderPaymentWatch(opts: {
  orderId: string | null | undefined
  enabled: boolean
  paymentId?: string | null
  onSettled: (orderId: string) => void
}) {
  const { orderId, enabled, paymentId, onSettled } = opts
  const onSettledRef = useRef(onSettled)
  onSettledRef.current = onSettled
  const settledOnceRef = useRef(false)
  const tickRef = useRef(0)

  useEffect(() => {
    settledOnceRef.current = false
    tickRef.current = 0
  }, [orderId])

  useEffect(() => {
    if (!enabled || !orderId) return

    let cancelled = false

    async function tick() {
      if (cancelled || settledOnceRef.current || !orderId) return
      try {
        tickRef.current += 1
        if (paymentId && tickRef.current % 2 === 0) {
          try {
            await syncMercadoPagoPayment(paymentId)
          } catch {
            /* sync best-effort */
          }
        }
        const detail = await getMyOrderDetail(orderId)
        if (!detail || cancelled) return
        const payments = await listOwnPaymentStatusesByOrder(orderId)
        if (
          isCheckoutPaymentSettled({
            orderStatus: detail.status,
            payments,
          })
        ) {
          settledOnceRef.current = true
          onSettledRef.current(orderId)
        }
      } catch {
        /* poll best-effort */
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), POLL_MS)

    function onVis() {
      if (document.visibilityState === 'visible') void tick()
    }
    function onFocus() {
      void tick()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, orderId, paymentId])
}
