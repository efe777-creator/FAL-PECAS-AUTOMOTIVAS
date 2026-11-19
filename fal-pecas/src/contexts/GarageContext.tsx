import { useAuth } from '@/contexts/AuthContext'
import { listSavedVehicles } from '@/services/customers/customerVehicleService'
import {
  GUEST_ACTIVE_GARAGE_ID,
  promoteGuestSessionToUser,
  readActiveGarage,
  resolveActiveGarageStorageId,
  resolveActiveState,
  vehicleToActiveFilter,
  writeClearedActiveGarage,
  writeSessionActiveGarage,
  writeVehicleActiveGarage,
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
  /** Veículo ativo de navegação (≠ is_primary). Null em sessão manual ou limpo. */
  activeVehicle: CustomerSavedVehicle | null
  /** Filtro que alimenta selos/avisos (veículo ou sessão). */
  activeFilter: VehicleFilter | null
  /** true quando o filtro veio só da sessão (não está na garagem). */
  isSessionActive: boolean
  vehicles: CustomerSavedVehicle[]
  loading: boolean
  refreshVehicles: () => Promise<CustomerSavedVehicle[]>
  setActiveVehicle: (vehicle: CustomerSavedVehicle) => void
  /** Confirma filtro manual só nesta sessão (selos). */
  setSessionFilter: (filter: VehicleFilter) => void
  clearActiveVehicle: () => void
  /** Após exclusão: se era o ativo, cai no principal ou limpa. */
  notifyVehicleRemoved: (vehicleId: string) => Promise<void>
}

const GarageContext = createContext<GarageContextValue | null>(null)

function applyGuestStored(
  setActiveVehicleState: (v: CustomerSavedVehicle | null) => void,
  setSessionFilterState: (f: VehicleFilter | null) => void,
) {
  const stored = readActiveGarage(GUEST_ACTIVE_GARAGE_ID)
  const resolved = resolveActiveState(stored, [])
  if (resolved.mode === 'session') {
    setActiveVehicleState(null)
    setSessionFilterState(resolved.filter)
    return
  }
  setActiveVehicleState(null)
  setSessionFilterState(null)
}

export function GarageProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const storageId = resolveActiveGarageStorageId(userId)
  const [vehicles, setVehicles] = useState<CustomerSavedVehicle[]>([])
  const [activeVehicle, setActiveVehicleState] = useState<CustomerSavedVehicle | null>(null)
  const [sessionFilter, setSessionFilterState] = useState<VehicleFilter | null>(null)
  const [loading, setLoading] = useState(false)

  // Hidrata guest cedo (antes do auth terminar) para selos sem flash.
  useEffect(() => {
    if (userId) return
    applyGuestStored(setActiveVehicleState, setSessionFilterState)
  }, [userId])

  const applyResolved = useCallback(
    (list: CustomerSavedVehicle[]) => {
      if (!userId) {
        applyGuestStored(setActiveVehicleState, setSessionFilterState)
        return
      }
      const stored = readActiveGarage(userId)
      const resolved = resolveActiveState(stored, list)
      if (resolved.mode === 'session') {
        setActiveVehicleState(null)
        setSessionFilterState(resolved.filter)
        return
      }
      if (resolved.mode === 'cleared' || resolved.mode === 'none') {
        setActiveVehicleState(null)
        setSessionFilterState(null)
        return
      }
      setActiveVehicleState(resolved.vehicle)
      setSessionFilterState(null)
      if (resolved.vehicle) {
        writeVehicleActiveGarage(userId, resolved.vehicle)
      }
    },
    [userId],
  )

  const refreshVehicles = useCallback(async () => {
    if (!userId) {
      setVehicles([])
      applyGuestStored(setActiveVehicleState, setSessionFilterState)
      return []
    }
    setLoading(true)
    try {
      const list = await listSavedVehicles()
      setVehicles(list)
      applyResolved(list)
      return list
    } catch {
      setVehicles([])
      return []
    } finally {
      setLoading(false)
    }
  }, [userId, applyResolved])

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      setVehicles([])
      applyGuestStored(setActiveVehicleState, setSessionFilterState)
      return
    }
    const promoted = promoteGuestSessionToUser(userId)
    if (promoted?.mode === 'session' && promoted.filter) {
      setActiveVehicleState(null)
      setSessionFilterState(promoted.filter)
    }
    void refreshVehicles()
  }, [userId, authLoading, refreshVehicles])

  const setActiveVehicle = useCallback(
    (vehicle: CustomerSavedVehicle) => {
      if (!userId) return
      writeVehicleActiveGarage(userId, vehicle)
      setActiveVehicleState(vehicle)
      setSessionFilterState(null)
    },
    [userId],
  )

  const setSessionFilter = useCallback(
    (filter: VehicleFilter) => {
      writeSessionActiveGarage(storageId, filter)
      setActiveVehicleState(null)
      setSessionFilterState(filter)
    },
    [storageId],
  )

  const clearActiveVehicle = useCallback(() => {
    writeClearedActiveGarage(storageId)
    setActiveVehicleState(null)
    setSessionFilterState(null)
  }, [storageId])

  const notifyVehicleRemoved = useCallback(
    async (vehicleId: string) => {
      if (!userId) return
      const stored = readActiveGarage(userId)
      if (stored?.mode === 'vehicle' && stored.customerVehicleId === vehicleId) {
        writeClearedActiveGarage(userId)
      }
      await refreshVehicles()
    },
    [userId, refreshVehicles],
  )

  const activeFilter = useMemo(() => {
    if (activeVehicle) return vehicleToActiveFilter(activeVehicle)
    return sessionFilter
  }, [activeVehicle, sessionFilter])

  const isSessionActive = Boolean(sessionFilter && !activeVehicle)

  const value = useMemo<GarageContextValue>(
    () => ({
      activeVehicle,
      activeFilter,
      isSessionActive,
      vehicles,
      loading,
      refreshVehicles,
      setActiveVehicle,
      setSessionFilter,
      clearActiveVehicle,
      notifyVehicleRemoved,
    }),
    [
      activeVehicle,
      activeFilter,
      isSessionActive,
      vehicles,
      loading,
      refreshVehicles,
      setActiveVehicle,
      setSessionFilter,
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
