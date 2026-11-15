import {
  DEFAULT_PAYMENT_ROUTING_CONFIG,
  getPaymentRoutingConfig,
  type PaymentRoutingConfig,
} from '@/services/payments/paymentRoutingService'
import { useEffect, useState } from 'react'

export function usePaymentRoutingConfig() {
  const [config, setConfig] = useState<PaymentRoutingConfig>(DEFAULT_PAYMENT_ROUTING_CONFIG)

  useEffect(() => {
    let active = true
    void getPaymentRoutingConfig().then((c) => {
      if (active) setConfig(c)
    })
    return () => {
      active = false
    }
  }, [])

  return config
}