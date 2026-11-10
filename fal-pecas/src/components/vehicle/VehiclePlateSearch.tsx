import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { VehiclePlateConfirmation } from '@/components/vehicle/VehiclePlateConfirmation'
import { VehiclePlateField } from '@/components/vehicle/VehiclePlateField'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'
import { toUserMessage } from '@/lib/toUserMessage'
import { lookupPlate } from '@/services/plates/plateLookupService'
import { plateValidationMessage } from '@/services/plates/plateNormalize'
import {
  canOpenConfirmation,
  requiresManualSelection,
  type PlateLookupResult,
} from '@/services/plates/plateTypes'
import {
  clearPendingGarageVehicle,
  consumeAskGaragePrompt,
  readPendingGarageVehicle,
  saveAskGaragePrompt,
  savePendingGarageVehicle,
} from '@/services/plates/pendingGarage'
import {
  addSavedVehicle,
  listSavedVehicles,
  resolveVersionId,
} from '@/services/customers/customerVehicleService'
import { buildVehicleQuery } from '@/services/vehicles/vehicleService'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { VehicleFilter } from '@/types'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

export type VehiclePlateSearchProps = {
  compact?: boolean
  /** Quando no catálogo: aplica filtros via callback em vez de navegar. */
  onApplyFilters?: (filter: VehicleFilter) => void
  /** Path atual para preservar após login (garagem). */
  returnPath?: string
}

type Phase = 'input' | 'loading' | 'confirm' | 'manual' | 'garage'

export function VehiclePlateSearch({
  compact = false,
  onApplyFilters,
  returnPath,
}: VehiclePlateSearchProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const [plateDraft, setPlateDraft] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('input')
  const [result, setResult] = useState<PlateLookupResult | null>(null)
  const [confirmedFilter, setConfirmedFilter] = useState<VehicleFilter | null>(null)
  const [manualMessage, setManualMessage] = useState<string | null>(null)
  const [savingGarage, setSavingGarage] = useState(false)

  useEffect(() => {
    const ask = consumeAskGaragePrompt()
    if (ask?.maker && ask?.model) {
      setConfirmedFilter(ask)
      setPhase('garage')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function flushPendingGarage() {
      if (!isSupabaseConfigured) return
      const {
        data: { user },
      } = await getSupabase().auth.getUser()
      if (!user || cancelled) return
      const pending = readPendingGarageVehicle()
      if (!pending?.maker || !pending?.model) return
      try {
        const resolved = await resolveVersionId({
          maker: pending.maker,
          model: pending.model,
          year: pending.year,
          engine: pending.engine,
          version: pending.version,
        })
        if (!resolved) {
          toast.push('Não foi possível salvar: complete versão/motor do veículo na conta.', 'error')
          clearPendingGarageVehicle()
          return
        }
        const existing = await listSavedVehicles()
        await addSavedVehicle({
          versionId: resolved.versionId,
          manufacturerId: resolved.manufacturerId,
          modelId: resolved.modelId,
          year: resolved.year,
          engine: resolved.engine,
          isPrimary: existing.length === 0,
        })
        clearPendingGarageVehicle()
        toast.push('Veículo salvo na sua garagem.', 'success')
      } catch (err) {
        toast.push(toUserMessage(err, 'Não foi possível salvar o veículo.'), 'error')
      }
    }
    void flushPendingGarage()
    return () => {
      cancelled = true
    }
  }, [toast])

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault()
    const validation = plateValidationMessage(plateDraft)
    if (validation) {
      setFieldError(validation)
      return
    }
    setFieldError(null)
    setPhase('loading')
    try {
      const lookup = await lookupPlate(plateDraft)
      setResult(lookup)
      if (canOpenConfirmation(lookup)) {
        setPhase('confirm')
        return
      }
      if (requiresManualSelection(lookup.status)) {
        setManualMessage(
          lookup.message ?? 'Não foi possível identificar o veículo pela placa.',
        )
        setPhase('manual')
        return
      }
      setManualMessage(lookup.message ?? 'Não foi possível identificar o veículo.')
      setPhase('manual')
    } catch (err) {
      setManualMessage(toUserMessage(err, 'Consulta indisponível. Selecione o veículo manualmente.'))
      setPhase('manual')
    }
  }

  function applyConfirmed(filter: VehicleFilter) {
    setConfirmedFilter(filter)
    if (onApplyFilters) {
      onApplyFilters(filter)
      setPhase('garage')
      return
    }
    // Home / rota veículo: aplica filtros no catálogo e pergunta garagem lá.
    saveAskGaragePrompt(filter)
    const qs = buildVehicleQuery(filter).toString()
    navigate(qs ? `/catalogo?${qs}` : '/catalogo')
  }

  async function handleSaveGarage(yes: boolean) {
    if (!yes || !confirmedFilter?.maker || !confirmedFilter?.model) {
      setPhase('input')
      setResult(null)
      setConfirmedFilter(null)
      return
    }
    setSavingGarage(true)
    try {
      if (!isSupabaseConfigured) {
        toast.push('Faça login para salvar veículos na garagem.', 'info')
        setPhase('input')
        return
      }
      const {
        data: { user },
      } = await getSupabase().auth.getUser()
      const catalogPath =
        returnPath ??
        `/catalogo?${buildVehicleQuery(confirmedFilter).toString()}`

      if (!user) {
        savePendingGarageVehicle({ ...confirmedFilter, returnTo: catalogPath })
        navigate('/login', { state: { from: catalogPath } })
        return
      }

      const resolved = await resolveVersionId({
        maker: confirmedFilter.maker,
        model: confirmedFilter.model,
        year: confirmedFilter.year,
        engine: confirmedFilter.engine,
        version: confirmedFilter.version,
      })
      if (!resolved) {
        toast.push(
          'Para salvar na garagem, é necessário identificar a versão no cadastro. Ajuste os filtros na conta ou complete versão/motor.',
          'error',
        )
        setPhase('input')
        return
      }
      const existing = await listSavedVehicles()
      await addSavedVehicle({
        versionId: resolved.versionId,
        manufacturerId: resolved.manufacturerId,
        modelId: resolved.modelId,
        year: resolved.year,
        engine: resolved.engine,
        isPrimary: existing.length === 0,
      })
      toast.push('Veículo salvo na sua garagem.', 'success')
      setPhase('input')
      setResult(null)
      setConfirmedFilter(null)
      setPlateDraft('')
    } catch (err) {
      toast.push(toUserMessage(err, 'Não foi possível salvar o veículo.'), 'error')
    } finally {
      setSavingGarage(false)
    }
  }

  if (phase === 'garage') {
    return (
      <div
        className={[
          'rounded-[18px] bg-white text-fal-navy-dark shadow-[0_20px_50px_rgba(0,0,0,0.2)]',
          compact ? 'p-4' : 'p-6',
        ].join(' ')}
      >
        <h2 className={['mt-0 font-extrabold', compact ? 'text-xl' : 'text-[23px]'].join(' ')}>
          Deseja salvar este veículo na sua garagem?
        </h2>
        <p className="text-sm text-fal-muted">
          Assim fica mais fácil encontrar peças nas próximas compras. Nunca salvamos sem a sua
          confirmação.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="primary"
            type="button"
            disabled={savingGarage}
            onClick={() => void handleSaveGarage(true)}
          >
            Sim, salvar
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={savingGarage}
            onClick={() => void handleSaveGarage(false)}
          >
            Agora não
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'confirm' && result) {
    return (
      <VehiclePlateConfirmation
        result={result}
        compact={compact}
        onConfirm={applyConfirmed}
        onCancelManual={() => {
          setManualMessage('Selecione o veículo manualmente para continuar.')
          setPhase('manual')
        }}
        onRetryPlate={() => {
          setResult(null)
          setPhase('input')
        }}
      />
    )
  }

  if (phase === 'manual') {
    return (
      <div className="space-y-3">
        {manualMessage ? (
          <p className="m-0 rounded-[9px] border border-fal-line bg-[#f7f9fb] px-3 py-2 text-sm text-fal-navy-dark">
            {manualMessage}
          </p>
        ) : null}
        <VehicleSelector
          compact={compact}
          title="Seleção manual"
          subtitle="Escolha montadora, modelo, ano, motor e versão para encontrar peças compatíveis."
          onConfirm={applyConfirmed}
        />
        <Button
          variant="light"
          type="button"
          onClick={() => {
            setPhase('input')
            setManualMessage(null)
            setResult(null)
          }}
        >
          Tentar outra placa
        </Button>
      </div>
    )
  }

  return (
    <div
      className={[
        'rounded-[16px] bg-white text-fal-navy-dark',
        compact
          ? 'border border-fal-line/80 p-3 shadow-sm'
          : 'border border-fal-line p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] sm:p-5',
      ].join(' ')}
    >
      <VehiclePlateField
        value={plateDraft}
        loading={phase === 'loading'}
        error={fieldError}
        onChange={(masked) => {
          setPlateDraft(masked)
          if (fieldError) setFieldError(null)
        }}
        onSubmit={() => void handleSearch()}
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          className="m-0 border-0 bg-transparent p-0 text-sm font-semibold text-fal-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-yellow"
          onClick={() => {
            setManualMessage(null)
            setPhase('manual')
          }}
        >
          Selecionar manualmente
        </button>
        <span className="text-xs text-fal-muted">Placa antiga ou Mercosul</span>
      </div>
    </div>
  )
}
