import type { DashboardContextual } from '@/lib/adminDashboardDeepLinks'
import { useOrderSplitTabs } from '@/hooks/useOrderSplitTabs'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Ctx = {
  contextual: DashboardContextual
  setContextual: (next: DashboardContextual) => void
  /** Abre (ou foca) pedido em guia empilhada — nunca substitui as outras. */
  openOrder: (orderId: string) => void
  openOrderIds: string[]
  activeOrderId: string | null
  selectOrderTab: (orderId: string) => void
  closeOrderTab: (orderId: string) => void
  clearContextual: () => void
}

const DashboardContextualContext = createContext<Ctx | null>(null)

export function DashboardContextualProvider({ children }: { children: ReactNode }) {
  const [hubContextual, setHubContextual] = useState<Exclude<
    DashboardContextual,
    { kind: 'order'; orderId: string } | null
  > | null>(null)

  const {
    openOrderIds,
    activeOrderId,
    openOrder,
    selectOrder,
    closeOrder,
    closeAll,
  } = useOrderSplitTabs()

  const contextual: DashboardContextual = activeOrderId
    ? { kind: 'order', orderId: activeOrderId }
    : hubContextual

  const clearContextual = useCallback(() => {
    closeAll()
    setHubContextual(null)
  }, [closeAll])

  const setContextual = useCallback(
    (next: DashboardContextual) => {
      if (!next) {
        closeAll()
        setHubContextual(null)
        return
      }
      if (next.kind === 'order') {
        // Empilha guia; não apaga as outras.
        openOrder(next.orderId)
        return
      }
      // Painel hub/relatório: limpa guias de pedido e mostra o hub.
      closeAll()
      setHubContextual(next)
    },
    [closeAll, openOrder],
  )

  const value = useMemo<Ctx>(
    () => ({
      contextual,
      setContextual,
      openOrder,
      openOrderIds,
      activeOrderId,
      selectOrderTab: selectOrder,
      closeOrderTab: closeOrder,
      clearContextual,
    }),
    [
      contextual,
      setContextual,
      openOrder,
      openOrderIds,
      activeOrderId,
      selectOrder,
      closeOrder,
      clearContextual,
    ],
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
      openOrderIds: [],
      activeOrderId: null,
      selectOrderTab: () => undefined,
      closeOrderTab: () => undefined,
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
  const { activeOrderId, openOrder, clearContextual } = useDashboardContextual()
  return {
    selectedOrderId: activeOrderId,
    setSelectedOrderId: (id) => {
      if (id) openOrder(id)
      else clearContextual()
    },
  }
}

/** @deprecated use DashboardContextualProvider */
export const DashboardOrderPreviewProvider = DashboardContextualProvider
