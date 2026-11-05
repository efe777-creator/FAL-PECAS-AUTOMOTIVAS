import { getPaymentDisplaySettings } from '@/services/store/paymentDisplayService'
import type { PaymentDisplaySettings } from '@/lib/paymentDisplay'
import { useEffect, useState } from 'react'

/** Carrega condições de pagamento (cache 5 min no service). */
export function usePaymentDisplay() {
  const [settings, setSettings] = useState<PaymentDisplaySettings | null>(null)

  useEffect(() => {
    let active = true
    void getPaymentDisplaySettings().then((s) => {
      if (active) setSettings(s)
    })
    return () => {
      active = false
    }
  }, [])

  return settings
}
