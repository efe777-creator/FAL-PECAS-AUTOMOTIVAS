import type { DashboardContextual } from '@/lib/adminDashboardDeepLinks'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type Ctx = {
  contextual: DashboardContextual
  setContextual: (next: DashboardContextual) => void
  /** Atalho: abre preview de pedido. */
  openOrder: (orderId: string) => void
  clearContextual: () => void
}

const DashboardContextualContext = createContext<Ctx | null>(null)

export function DashboardContextualProvider({ children }: { children: ReactNode }) {
  const [contextual, setContextual] = useState<DashboardContextual>(null)
  const value = useMemo<Ctx>(
    () => ({
      contextual,
      setContextual,
      openOrder: (orderId: string) => setContextual({ kind: 'order', orderId }),
      clearContextual: () => setContextual(null),
    }),
    [contextual],
  )
  return (
    <DashboardContextualContext.Provider value={value}>
      {children}
    </DashboardContextualContext.Provider>
  )
}

export function useDashboardContextual(): Ctx {
  const ctx = useContext(DashboardContextualContext)
  if (!ctx) {
    return {
      contextual: null,
      setContextual: () => undefined,
      openOrder: () => undefined,
      clearContextual: () => undefined,
    }
  }
  return ctx
}

/** Compat: selectedOrderId derivado do contextual. */
export function useDashboardOrderPreview(): {
  selectedOrderId: string | null
  setSelectedOrderId: (id: string | null) => void
} {
  const { contextual, openOrder, clearContextual } = useDashboardContextual()
  const selectedOrderId =
    contextual?.kind === 'order' ? contextual.orderId : null
  return {
    selectedOrderId,
    setSelectedOrderId: (id) => {
      if (id) openOrder(id)
      else clearContextual()
    },
  }
}

/** @deprecated use DashboardContextualProvider */
export const DashboardOrderPreviewProvider = DashboardContextualProvider
