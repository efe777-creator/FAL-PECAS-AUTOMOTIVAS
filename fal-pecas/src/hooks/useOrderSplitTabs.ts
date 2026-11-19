import { useCallback, useState } from 'react'

/**
 * Guias empilháveis de pedido (Chrome):
 * - cada clique em pedido novo ADICIONA uma guia
 * - clique no já aberto só foca
 * - fechar guia remove só aquela; se era a ativa, foca a última restante
 */
export function useOrderSplitTabs() {
  const [openOrderIds, setOpenOrderIds] = useState<string[]>([])
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  const openOrder = useCallback((orderId: string) => {
    const id = String(orderId ?? '').trim()
    if (!id) return
    setOpenOrderIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setActiveOrderId(id)
  }, [])

  const selectOrder = useCallback((orderId: string) => {
    const id = String(orderId ?? '').trim()
    if (!id) return
    setOpenOrderIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setActiveOrderId(id)
  }, [])

  const closeOrder = useCallback((orderId: string) => {
    const id = String(orderId ?? '').trim()
    setOpenOrderIds((prev) => {
      const next = prev.filter((x) => x !== id)
      setActiveOrderId((cur) => {
        if (cur !== id) return cur
        return next[next.length - 1] ?? null
      })
      return next
    })
  }, [])

  const closeAll = useCallback(() => {
    setOpenOrderIds([])
    setActiveOrderId(null)
  }, [])

  return {
    openOrderIds,
    activeOrderId,
    openOrder,
    selectOrder,
    closeOrder,
    closeAll,
    hasOpen: openOrderIds.length > 0 && activeOrderId != null,
  }
}

/** Redutor puro — usado nos testes para garantir empilhamento. */
export function reduceOrderSplitTabs(
  state: { openOrderIds: string[]; activeOrderId: string | null },
  action:
    | { type: 'open'; orderId: string }
    | { type: 'close'; orderId: string }
    | { type: 'select'; orderId: string }
    | { type: 'closeAll' },
): { openOrderIds: string[]; activeOrderId: string | null } {
  switch (action.type) {
    case 'open':
    case 'select': {
      const id = action.orderId
      const openOrderIds = state.openOrderIds.includes(id)
        ? state.openOrderIds
        : [...state.openOrderIds, id]
      return { openOrderIds, activeOrderId: id }
    }
    case 'close': {
      const openOrderIds = state.openOrderIds.filter((x) => x !== action.orderId)
      const activeOrderId =
        state.activeOrderId === action.orderId
          ? (openOrderIds[openOrderIds.length - 1] ?? null)
          : state.activeOrderId
      return { openOrderIds, activeOrderId }
    }
    case 'closeAll':
      return { openOrderIds: [], activeOrderId: null }
    default:
      return state
  }
}
