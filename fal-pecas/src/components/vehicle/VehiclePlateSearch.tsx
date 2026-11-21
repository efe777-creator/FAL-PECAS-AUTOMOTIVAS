import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { matchSavedVehicleForFilter } from '@/components/garage/garageVehicleUi'
import { VehiclePlateConfirmation } from '@/components/vehicle/VehiclePlateConfirmation'
import { VehiclePlateField } from '@/components/vehicle/VehiclePlateField'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'
import { useGarageOptional } from '@/contexts/GarageContext'
import { toUserMessage } from '@/lib/toUserMessage'
import { confirmVehicleCanonicalUpsert } from '@/services/plates/confirmVehicleCanonicalUpsert'
import { assistPlateIdentity } from '@/services/plates/interpretPlateAssist'
import { assertPlateAgainstCatalog } from '@/services/plates/plateIdentityAssert'
import { lookupPlate } from '@/services/plates/plateLookupService'
import { needsConfirmCanonicalUpsert } from '@/services/plates/needsConfirmCanonicalUpsert'
import { plateValidationMessage } from '@/services/plates/plateNormalize'
import {
  canOpenConfirmation,
  requiresManualSelection,
  type PlateLookupResult,
} from '@/services/plates/plateTypes'
import { clearAskGaragePrompt } from '@/services/plates/pendingGarage'
import { ensureSavedVehicleFromFilter } from '@/services/customers/customerVehicleService'
import {
  buildVehicleQuery,
  getVehicleOptions,
  listVehicleCatalogEntries,
} from '@/services/vehicles/vehicleService'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { CustomerSavedVehicle, VehicleFilter } from '@/types'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

export type VehiclePlateSearchIntent = 'discover' | 'garage'

export type VehiclePlateSearchProps = {
  compact?: boolean
  /**
   * `garage` — salvar direto na Minha Garagem (sem catálogo).
   * `discover` — filtrar peças; se logado, auto-save + toast (sem modal).
   */
  intent?: VehiclePlateSearchIntent
  /**
   * PDP / contexto local: só chama `onApplyFilters`.
   * Não altera veículo ativo da garagem nem auto-salva.
   */
  localOnly?: boolean
  /** Quando no catálogo: aplica filtros via callback em vez de navegar. */
  onApplyFilters?: (filter: VehicleFilter) => void
  /** Path atual para preservar após login (legado). */
  returnPath?: string
  /** Callback após salvar na garagem (intent garage). */
  onGarageSaved?: (vehicle: CustomerSavedVehicle) => void
}

type Phase = 'input' | 'loading' | 'confirm' | 'manual'

export function VehiclePlateSearch({
  compact = false,
  intent = 'discover',
  localOnly = false,
  onApplyFilters,
  onGarageSaved,
}: VehiclePlateSearchProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const garage = useGarageOptional()
  const [plateDraft, setPlateDraft] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('input')
  const [result, setResult] = useState<PlateLookupResult | null>(null)
  const [manualMessage, setManualMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function syncActiveToFilter(filter: VehicleFilter) {
    if (!garage) return
    const match = matchSavedVehicleForFilter(garage.vehicles, filter)
    if (match) garage.setActiveVehicle(match)
    else if (garage.activeVehicle) garage.clearActiveVehicle()
  }

  function resetToInput() {
    setPhase('input')
    setResult(null)
    setManualMessage(null)
    setPlateDraft('')
  }

  async function saveToGarage(filter: VehicleFilter): Promise<CustomerSavedVehicle | null> {
    if (!isSupabaseConfigured) return null
    const {
      data: { user },
    } = await getSupabase().auth.getUser()
    if (!user) return null

    const already = garage
      ? matchSavedVehicleForFilter(garage.vehicles, filter)
      : null

    const saved = await ensureSavedVehicleFromFilter({
      ...filter,
      plate: filter.plate ?? result?.plate ?? undefined,
      manufacturerId: filter.manufacturerId ?? result?.manufacturerId ?? undefined,
      modelId: filter.modelId ?? result?.modelId ?? undefined,
      versionId: filter.versionId ?? result?.versionId ?? undefined,
    })
    if (garage) {
      await garage.refreshVehicles()
      garage.setActiveVehicle(saved)
    }
    toast.push(
      already ? 'Veículo já estava na Minha Garagem.' : 'Veículo adicionado à Minha Garagem.',
      'success',
    )
    return saved
  }

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
      let lookup = await lookupPlate(plateDraft)
      // Assertividade: cruza com catálogo FAL + assistência IA opcional (mesmo padrão NL).
      try {
        const [tree, catalog] = await Promise.all([
          getVehicleOptions(),
          listVehicleCatalogEntries(),
        ])
        lookup = assertPlateAgainstCatalog(lookup, tree)
        lookup = await assistPlateIdentity(lookup, catalog)
        if (lookup.identityLlmAssisted) {
          lookup = assertPlateAgainstCatalog(lookup, tree)
        }
      } catch {
        /* catálogo/IA down — mantém payload da Edge */
      }
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

  async function applyConfirmed(filter: VehicleFilter) {
    setBusy(true)
    clearAskGaragePrompt()
    let next = filter
    try {
      if (isSupabaseConfigured && needsConfirmCanonicalUpsert(filter, result?.year)) {
        const {
          data: { session },
        } = await getSupabase().auth.getSession()
        if (session?.user) {
          next = await confirmVehicleCanonicalUpsert(filter)
        }
      }
    } catch (err) {
      toast.push(
        toUserMessage(
          err,
          'Não foi possível sincronizar o veículo no cadastro. Seguindo com a confirmação.',
        ),
        'info',
      )
    }

    try {
      if (localOnly) {
        onApplyFilters?.(next)
        resetToInput()
        setBusy(false)
        return
      }

      if (intent === 'garage') {
        syncActiveToFilter(next)
        const {
          data: { user },
        } = await getSupabase().auth.getUser()
        if (!isSupabaseConfigured || !user) {
          toast.push('Faça login para salvar veículos na garagem.', 'info')
          setBusy(false)
          return
        }
        const saved = await saveToGarage(next)
        if (saved) onGarageSaved?.(saved)
        resetToInput()
        setBusy(false)
        return
      }

      // discover: filtrar peças sem interromper; auto-save se logado
      syncActiveToFilter(next)
      if (onApplyFilters) {
        onApplyFilters(next)
      } else {
        const qs = buildVehicleQuery(next).toString()
        navigate(qs ? `/catalogo?${qs}` : '/catalogo')
      }

      try {
        const {
          data: { user },
        } = await getSupabase().auth.getUser()
        if (user) {
          await saveToGarage(next)
        } else {
          toast.push('Entre na conta para salvar este veículo na garagem.', 'info')
        }
      } catch (err) {
        toast.push(toUserMessage(err, 'Não foi possível salvar na garagem.'), 'error')
      }

      resetToInput()
    } catch (err) {
      toast.push(toUserMessage(err, 'Não foi possível concluir.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (phase === 'confirm' && result) {
    return (
      <VehiclePlateConfirmation
        result={result}
        compact={compact}
        onConfirm={(f) => {
          void applyConfirmed(f)
        }}
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
          <p className="m-0 rounded-[9px] border border-fal-line bg-fal-bg px-3 py-2 text-sm text-fal-fg">
            {manualMessage}
          </p>
        ) : null}
        <VehicleSelector
          compact={compact}
          title="Seleção manual"
          subtitle={
            localOnly
              ? 'Escolha montadora e modelo. Ano, motor e versão ajudam na compatibilidade.'
              : intent === 'garage'
                ? 'Escolha montadora e modelo para salvar na garagem. Ano, motor e versão ajudam na compatibilidade.'
                : 'Escolha montadora, modelo, ano, motor e versão para encontrar peças compatíveis.'
          }
          confirmLabel={localOnly ? 'Verificar nesta página' : undefined}
          onConfirm={(f) => {
            void applyConfirmed(f)
          }}
        />
        <Button
          variant="light"
          type="button"
          disabled={busy}
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
        'rounded-[16px] bg-fal-surface text-fal-navy-dark',
        compact
          ? 'border border-fal-line/80 p-3 shadow-sm'
          : 'border border-fal-line p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] sm:p-5',
      ].join(' ')}
    >
      <VehiclePlateField
        value={plateDraft}
        loading={phase === 'loading' || busy}
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
          className="m-0 border-0 bg-transparent p-0 text-sm font-semibold text-fal-navy dark:text-fal-fg underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-yellow"
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
