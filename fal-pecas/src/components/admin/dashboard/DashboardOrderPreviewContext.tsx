import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type Ctx = {
  selectedOrderId: string | null
  setSelectedOrderId: (id: string | null) => void
}

const DashboardOrderPreviewContext = createContext<Ctx | null>(null)

export function DashboardOrderPreviewProvider({ children }: { children: ReactNode }) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const value = useMemo(
    () => ({ selectedOrderId, setSelectedOrderId }),
    [selectedOrderId],
  )
  return (
    <DashboardOrderPreviewContext.Provider value={value}>
      {children}
    </DashboardOrderPreviewContext.Provider>
  )
}

export function useDashboardOrderPreview(): Ctx {
  const ctx = useContext(DashboardOrderPreviewContext)
  if (!ctx) {
    return {
      selectedOrderId: null,
      setSelectedOrderId: () => undefined,
    }
  }
  return ctx
}
