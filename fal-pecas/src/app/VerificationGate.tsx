import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import {
  accountNeedsHardVerification,
  accountPastVerificationGrace,
  isAccountVerified,
} from '@/lib/accountVerification'
import { countMyOrders } from '@/services/customers/orderQueryService'
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

/**
 * Política:
 * — Conta: NÃO tranca /conta após 48h (só aviso persistente + redirect no próximo login).
 * — Checkout: trava se passou 48h OU se é o pagamento do 1º pedido sem verificação.
 */
export function VerificationGate({
  children,
  mode = 'account',
}: {
  children: ReactNode
  mode?: 'account' | 'checkout'
}) {
  const { user, loading, profileLoading } = useAuth()
  const location = useLocation()
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(mode === 'checkout')

  useEffect(() => {
    if (mode !== 'checkout' || !user || isAccountVerified(user)) {
      setOrdersLoading(false)
      setOrderCount(null)
      return
    }
    let cancelled = false
    setOrdersLoading(true)
    void countMyOrders()
      .then((n) => {
        if (!cancelled) setOrderCount(n)
      })
      .catch(() => {
        if (!cancelled) setOrderCount(0)
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, user])

  if (loading || profileLoading) {
    return <Loading label="Verificando conta…" />
  }

  // Área da conta: sem hard lock — banner + login cuidam do pós-48h.
  if (mode === 'account') {
    return children
  }

  if (!user || isAccountVerified(user)) {
    return children
  }

  if (ordersLoading || orderCount === null) {
    return <Loading label="Verificando conta…" />
  }

  const isFirstOrderPayment = orderCount === 0
  const hard = accountNeedsHardVerification(user, { isFirstOrderPayment })

  if (!hard) {
    return children
  }

  const reason = isFirstOrderPayment && !accountPastVerificationGrace(user)
    ? 'first_order'
    : 'grace'

  return (
    <Navigate
      to="/conta/verificar"
      replace
      state={{
        from: `${location.pathname}${location.search}`,
        verifyReason: reason,
      }}
    />
  )
}
