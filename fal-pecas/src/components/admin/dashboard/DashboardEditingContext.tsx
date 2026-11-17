import { createContext, useContext, type ReactNode } from 'react'

const DashboardEditingContext = createContext(false)

export function DashboardEditingProvider({
  editing,
  children,
}: {
  editing: boolean
  children: ReactNode
}) {
  return (
    <DashboardEditingContext.Provider value={editing}>
      {children}
    </DashboardEditingContext.Provider>
  )
}

export function useDashboardEditing() {
  return useContext(DashboardEditingContext)
}
