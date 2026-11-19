import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { matchSavedVehicleForFilter } from '@/components/garage/garageVehicleUi'
import { useGarageOptional } from '@/contexts/GarageContext'
import { toUserMessage } from '@/lib/toUserMessage'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { ensureSavedVehicleFromFilter } from '@/services/customers/customerVehicleService'
import {
  clearAskGaragePrompt,
  readAskGaragePrompt,
  savePendingGarageVehicle,
} from '@/services/plates/pendingGarage'
import { buildVehicleQuery } from '@/services/vehicles/vehicleService'
import type { VehicleFilter } from '@/types'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * @deprecated Fluxo discover não interrompe mais com modal.
 * Auto-save + toast ficam em VehiclePlateSearch (intent=discover).
 * Mantido no repo só por compat transitória — não montar no CatalogPage.
 */
export function GarageAskPrompt() {
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const garage = useGarageOptional()
  const [filter, setFilter] = useState<VehicleFilter | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const ask = readAskGaragePrompt()
    if (ask?.maker && ask?.model) {
      setFilter(ask)
      // Alinha ativo ao filtro da placa (evita badge/carrinho do carro anterior).
      if (garage) {
        const match = matchSavedVehicleForFilter(garage.vehicles, ask)
        if (match) garage.setActiveVehicle(match)
        else if (garage.activeVehicle) garage.clearActiveVehicle()
      }
    }
    // Só na montagem do prompt (ask vem do sessionStorage).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync once when prompt appears
  }, [])

  async function handleAnswer(yes: boolean) {
    if (!yes || !filter?.maker || !filter?.model) {
      clearAskGaragePrompt()
      setFilter(null)
      return
    }
    setSaving(true)
    try {
      if (!isSupabaseConfigured) {
        toast.push('Faça login para salvar veículos na garagem.', 'info')
        clearAskGaragePrompt()
        setFilter(null)
        return
      }
      const {
        data: { user },
      } = await getSupabase().auth.getUser()
      const catalogPath = `${location.pathname}${location.search}` ||
        `/catalogo?${buildVehicleQuery(filter).toString()}`

      if (!user) {
        savePendingGarageVehicle({ ...filter, returnTo: catalogPath })
        clearAskGaragePrompt()
        navigate('/login', { state: { from: catalogPath } })
        return
      }

      const saved = await ensureSavedVehicleFromFilter(filter)
      if (garage) {
        await garage.refreshVehicles()
        garage.setActiveVehicle(saved)
      }
      clearAskGaragePrompt()
      toast.push('Veículo salvo na sua garagem.', 'success')
      setFilter(null)
    } catch (err) {
      toast.push(toUserMessage(err, 'Não foi possível salvar o veículo.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!filter) return null

  return (
    <div
      className="mb-4 rounded-[18px] border border-fal-line bg-white p-4 text-fal-navy-dark shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
      role="dialog"
      aria-labelledby="garage-ask-title"
    >
      <h2 id="garage-ask-title" className="m-0 text-lg font-extrabold">
        Deseja salvar este veículo na sua garagem?
      </h2>
      <p className="mt-1 text-sm text-fal-muted">
        {filter.maker} {filter.model}
        {filter.year ? ` ${filter.year}` : ''}
        {filter.engine ? ` · ${filter.engine}` : ''}
        {filter.version ? ` · ${filter.version}` : ''}
        {filter.plate ? ` · placa ${filter.plate}` : ''}. Assim fica mais fácil encontrar peças nas
        próximas compras.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="primary"
          type="button"
          disabled={saving}
          onClick={() => void handleAnswer(true)}
        >
          Sim, salvar
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled={saving}
          onClick={() => void handleAnswer(false)}
        >
          Agora não
        </Button>
      </div>
    </div>
  )
}
