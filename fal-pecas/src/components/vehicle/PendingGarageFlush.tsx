import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { flushPendingGarageVehicle } from '@/services/plates/flushPendingGarage'
import { useEffect, useRef } from 'react'

/**
 * Após login/sessão: salva veículo pendente da placa sem depender de montar VehiclePlateSearch.
 */
export function PendingGarageFlush() {
  const { user, loading, profileLoading } = useAuth()
  const toast = useToast()
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
    void flushPendingGarageVehicle().then((result) => {
      if (cancelled || result.skipped) return
      if (result.ok && result.message) toast.push(result.message, 'success')
      else if (!result.ok && result.message) {
        toast.push(
          `${result.message} O rascunho foi mantido — abra Meus carros ou tente de novo.`,
          'error',
        )
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, loading, profileLoading, toast])

  return null
}
