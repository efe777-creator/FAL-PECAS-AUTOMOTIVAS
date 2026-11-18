import { useAuth } from '@/contexts/AuthContext'
import { listSavedVehicles } from '@/services/customers/customerVehicleService'
import {
  clearActiveGarage,
  readActiveGarage,
  resolveActiveAgainstGarage,
  vehicleToActiveFilter,
  writeActiveGarage,
} from '@/services/garage/activeGarageStorage'
import type { CustomerSavedVehicle, VehicleFilter } from '@/types'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type GarageContextValue = {
  /** Veículo ativo de navegação (≠ is_primary). */
  activeVehicle: CustomerSavedVehicle | null
  activeFilter: VehicleFilter | null
  vehicles: CustomerSavedVehicle[]
  loading: boolean
  refreshVehicles: () => Promise<CustomerSavedVehicle[]>
  setActiveVehicle: (vehicle: CustomerSavedVehicle) => void
  clearActiveVehicle: () => void
  /** Após exclusão: se era o ativo, cai no principal ou limpa. */
  notifyVehicleRemoved: (vehicleId: string) => Promise<void>
}

const GarageContext = createContext<GarageContextValue | null>(null)

export function GarageProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const [vehicles, setVehicles] = useState<CustomerSavedVehicle[]>([])
  const [activeVehicle, setActiveVehicleState] = useState<CustomerSavedVehicle | null>(null)
  const [loading, setLoading] = useState(false)

  const persistActive = useCallback(
    (vehicle: CustomerSavedVehicle | null) => {
      if (!userId) return
      if (!vehicle) {
        clearActiveGarage(userId)
        setActiveVehicleState(null)
        return
      }
      const payload = {
        customerVehicleId: vehicle.id,
        filter: vehicleToActiveFilter(vehicle),
        updatedAt: new Date().toISOString(),
      }
      writeActiveGarage(userId, payload)
      setActiveVehicleState(vehicle)
    },
    [userId],
  )

  const refreshVehicles = useCallback(async () => {
    if (!userId) {
      setVehicles([])
      setActiveVehicleState(null)
      return []
    }
    setLoading(true)
    try {
      const list = await listSavedVehicles()
      setVehicles(list)
      const stored = readActiveGarage(userId)
      const resolved = resolveActiveAgainstGarage(stored?.customerVehicleId, list)
      if (resolved) {
        persistActive(resolved)
      } else {
        clearActiveGarage(userId)
        setActiveVehicleState(null)
      }
      return list
    } catch {
      setVehicles([])
      return []
    } finally {
      setLoading(false)
    }
  }, [userId, persistActive])

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      setVehicles([])
      setActiveVehicleState(null)
      return
    }
    void refreshVehicles()
  }, [userId, authLoading, refreshVehicles])

  const setActiveVehicle = useCallback(
    (vehicle: CustomerSavedVehicle) => {
      persistActive(vehicle)
    },
    [persistActive],
  )

  const clearActiveVehicle = useCallback(() => {
    persistActive(null)
  }, [persistActive])

  const notifyVehicleRemoved = useCallback(
    async (vehicleId: string) => {
      if (!userId) return
      const stored = readActiveGarage(userId)
      if (stored?.customerVehicleId === vehicleId) {
        clearActiveGarage(userId)
      }
      await refreshVehicles()
    },
    [userId, refreshVehicles],
  )

  const activeFilter = useMemo(
    () => (activeVehicle ? vehicleToActiveFilter(activeVehicle) : null),
    [activeVehicle],
  )

  const value = useMemo<GarageContextValue>(
    () => ({
      activeVehicle,
      activeFilter,
      vehicles,
      loading,
      refreshVehicles,
      setActiveVehicle,
      clearActiveVehicle,
      notifyVehicleRemoved,
    }),
    [
      activeVehicle,
      activeFilter,
      vehicles,
      loading,
      refreshVehicles,
      setActiveVehicle,
      clearActiveVehicle,
      notifyVehicleRemoved,
    ],
  )

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>
}

export function useGarage(): GarageContextValue {
  const ctx = useContext(GarageContext)
  if (!ctx) throw new Error('useGarage deve ser usado dentro de GarageProvider')
  return ctx
}

/** Para chips/header onde o provider pode não estar montado em testes. */
export function useGarageOptional(): GarageContextValue | null {
  return useContext(GarageContext)
}
