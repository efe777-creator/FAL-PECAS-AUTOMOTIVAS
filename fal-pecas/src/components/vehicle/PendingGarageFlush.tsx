import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useGarageOptional } from '@/contexts/GarageContext'
import { flushPendingGarageVehicle } from '@/services/plates/flushPendingGarage'
import { useEffect, useRef } from 'react'

/**
 * Após login/sessão: salva veículo pendente da placa sem depender de montar VehiclePlateSearch.
 */
export function PendingGarageFlush() {
  const { user, loading, profileLoading } = useAuth()
  const toast = useToast()
  const garage = useGarageOptional()
  const attemptedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      attemptedFor.current = null
      return
    }
    if (loading || profileLoading) return
    if (attemptedFor.current === user.id) return
    attemptedFor.current = user.id

    let cancelled = false
    void flushPendingGarageVehicle().then(async (result) => {
      if (cancelled || result.skipped) return
      if (result.ok && result.message) toast.push(result.message, 'success')
      else if (!result.ok && result.message) {
        toast.push(
          `${result.message} O rascunho foi mantido — abra Meus carros ou tente de novo.`,
          'error',
        )
      }
      if (result.ok && result.vehicle && garage) {
        await garage.refreshVehicles()
        garage.setActiveVehicle(result.vehicle)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, loading, profileLoading, toast, garage])

  return null
}
