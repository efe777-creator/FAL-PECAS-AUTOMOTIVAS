import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import { GarageVehicleCard } from '@/components/garage/GarageVehicleCard'
import { GarageVehicleHero } from '@/components/garage/GarageVehicleHero'
import { IncomingTransferBanner } from '@/components/garage/IncomingTransferBanner'
import { VehiclePlateSearch } from '@/components/vehicle/VehiclePlateSearch'
import { useGarage } from '@/contexts/GarageContext'
import {
  ensureSavedVehicleFromFilter,
  listSavedVehicles,
  removeSavedVehicle,
  setPrimaryVehicle,
} from '@/services/customers/customerVehicleService'
import { formatPlateMask, plateValidationMessage } from '@/services/plates/plateNormalize'
import { getVehicleOptions } from '@/services/vehicles/vehicleService'
import { vehicleModelKey, vehicleModelYearKey } from '@/services/vehicles/vehicleOptionKeys'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import type { CustomerSavedVehicle, VehicleOptionTree } from '@/types'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

type AddTab = 'placa' | 'manual'

export function AccountVehiclesPage() {
  useDocumentTitle('Minha Garagem | FAL Peças Automotivas')
  const toast = useToast()
  const garage = useGarage()
  const [items, setItems] = useState<CustomerSavedVehicle[]>([])
  const [tree, setTree] = useState<VehicleOptionTree | null>(null)
  const [maker, setMaker] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [engine, setEngine] = useState('')
  const [version, setVersion] = useState('')
  const [nickname, setNickname] = useState('')
  const [plate, setPlate] = useState('')
  const [asPrimary, setAsPrimary] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addTab, setAddTab] = useState<AddTab>('placa')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  function pushOk(message: string) {
    setError(null)
    toast.push(message, 'success')
  }

  function openAdd(tab: AddTab = 'placa') {
    setAddTab(tab)
    setShowAdd(true)
  }

  function closeAdd() {
    setShowAdd(false)
    setMaker('')
    setModel('')
    setYear('')
    setEngine('')
    setVersion('')
    setNickname('')
    setPlate('')
    setAsPrimary(false)
  }

  async function reload() {
    setLoading(true)
    try {
      const [list, options] = await Promise.all([listSavedVehicles(), getVehicleOptions()])
      setItems(list)
      setTree(options)
      setError(null)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar a garagem'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  const primary = useMemo(
    () => items.find((v) => v.isPrimary) ?? items[0] ?? null,
    [items],
  )
  const others = useMemo(
    () => (primary ? items.filter((v) => v.id !== primary.id) : []),
    [items, primary],
  )

  const modelOptions = useMemo(() => {
    if (!tree || !maker) return []
    return (tree.modelsByMaker[maker] ?? []).map((m) => ({ value: m, label: m }))
  }, [tree, maker])

  const yearOptions = useMemo(() => {
    if (!tree || !maker || !model) return []
    return (tree.yearsByModel[vehicleModelKey(maker, model)] ?? []).map((y) => ({
      value: y,
      label: y,
    }))
  }, [tree, maker, model])

  const engineOptions = useMemo(() => {
    if (!tree || !maker || !model) return []
    if (year) {
      const byYear = tree.enginesByModelYear[vehicleModelYearKey(maker, model, year)] ?? []
      if (byYear.length) return byYear.map((e) => ({ value: e, label: e }))
    }
    return (tree.enginesByModel[vehicleModelKey(maker, model)] ?? []).map((e) => ({
      value: e,
      label: e,
    }))
  }, [tree, maker, model, year])

  const versionOptions = useMemo(() => {
    if (!tree || !maker || !model) return []
    return (tree.versionsByModel[vehicleModelKey(maker, model)] ?? []).map((v) => ({
      value: v,
      label: v,
    }))
  }, [tree, maker, model])

  async function onSubmitManual(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!maker || !model) {
      pushError('Selecione montadora e modelo.')
      return
    }
    const plateRaw = plate.trim()
    if (plateRaw) {
      const msg = plateValidationMessage(plateRaw)
      if (msg) {
        pushError(msg)
        return
      }
    }
    try {
      const saved = await ensureSavedVehicleFromFilter({
        maker,
        model,
        year: year || undefined,
        engine: engine || undefined,
        version: version || undefined,
        plate: plateRaw || undefined,
        nickname,
        isPrimary: asPrimary || items.length === 0,
      })
      closeAdd()
      pushOk('Veículo salvo na garagem.')
      await garage.refreshVehicles()
      garage.setActiveVehicle(saved)
      await reload()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar veículo'))
    }
  }

  async function handleSetPrimary(id: string) {
    try {
      await setPrimaryVehicle(id)
      pushOk('Veículo principal atualizado.')
      await reload()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao definir veículo principal'))
    }
  }

  async function handleRemove(id: string) {
    const { confirmed } = await confirmDialog({
      title: 'Remover veículo?',
      message: 'Remover este veículo da sua garagem?',
      confirmLabel: 'Remover',
      danger: true,
    })
    if (!confirmed) return
    try {
      await removeSavedVehicle(id)
      await garage.notifyVehicleRemoved(id)
      pushOk('Veículo removido.')
      await reload()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao remover veículo'))
    }
  }

  if (loading) return <Loading />
  if (error && items.length === 0) {
    return <ErrorState message={error} onRetry={() => void reload()} />
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mt-0 mb-1 text-xl font-extrabold sm:text-2xl">Minha Garagem</h2>
          <p className="mb-0 text-sm text-fal-muted">
            Seus carros salvos para filtrar o catálogo e acompanhar o histórico.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => (showAdd ? closeAdd() : openAdd('placa'))}
        >
          {showAdd ? 'Fechar' : 'Adicionar veículo'}
        </Button>
      </header>

      <IncomingTransferBanner onAccepted={() => void reload()} />

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}

      {showAdd ? (
        <div className="rounded-fal border border-fal-line bg-fal-surface p-4 sm:p-5">
          <h3 className="mt-0 text-base font-extrabold">Adicionar veículo</h3>
          <p className="mt-0 text-sm text-fal-muted">
            Pela placa (mais rápido) ou seleção manual. O carro fica salvo na sua garagem.
          </p>

          <div
            className="mt-3 flex flex-wrap gap-2"
            role="tablist"
            aria-label="Como adicionar"
          >
            {(
              [
                { id: 'placa' as const, label: 'Placa' },
                { id: 'manual' as const, label: 'Manual' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={addTab === tab.id}
                className={`min-h-10 rounded-[10px] border px-3 text-sm font-extrabold ${
                  addTab === tab.id
                    ? 'border-fal-accent bg-fal-accent/10 text-fal-fg'
                    : 'border-fal-line bg-fal-bg text-fal-muted'
                }`}
                onClick={() => setAddTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4" role="tabpanel">
            {addTab === 'placa' ? (
              <VehiclePlateSearch
                intent="garage"
                compact
                onGarageSaved={() => {
                  closeAdd()
                  void reload()
                }}
              />
            ) : (
              <form onSubmit={onSubmitManual} className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Montadora"
                  value={maker}
                  options={(tree?.makers ?? []).map((m) => ({ value: m, label: m }))}
                  placeholder="Selecione"
                  onChange={(e) => {
                    setMaker(e.target.value)
                    setModel('')
                    setYear('')
                    setEngine('')
                    setVersion('')
                  }}
                />
                <Select
                  label="Modelo"
                  value={model}
                  options={modelOptions}
                  placeholder="Selecione"
                  disabled={!maker}
                  onChange={(e) => {
                    setModel(e.target.value)
                    setYear('')
                    setEngine('')
                    setVersion('')
                  }}
                />
                <Select
                  label="Ano"
                  value={year}
                  options={yearOptions}
                  placeholder="Opcional"
                  disabled={!model}
                  onChange={(e) => setYear(e.target.value)}
                />
                <Select
                  label="Motor"
                  value={engine}
                  options={engineOptions}
                  placeholder="Opcional"
                  disabled={!model}
                  onChange={(e) => setEngine(e.target.value)}
                />
                <Select
                  label="Versão"
                  value={version}
                  options={versionOptions}
                  placeholder="Opcional"
                  disabled={!model}
                  onChange={(e) => setVersion(e.target.value)}
                />
                <Input
                  label="Placa (opcional)"
                  value={plate}
                  onChange={(e) => setPlate(formatPlateMask(e.target.value))}
                  placeholder="ABC1D23"
                  autoComplete="off"
                />
                <Input
                  label="Apelido (opcional)"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
                <label className="flex min-h-10 items-center gap-2 text-sm font-semibold sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={asPrimary}
                    onChange={(e) => setAsPrimary(e.target.checked)}
                  />
                  Definir como veículo principal
                </label>
                <div className="sm:col-span-2">
                  <Button type="submit">Salvar na garagem</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {items.length === 0 && !showAdd ? (
        <EmptyState
          title="Sua garagem está vazia."
          description="Adicione pela placa ou escolha montadora e modelo manualmente."
          actionLabel="Adicionar veículo"
          onAction={() => openAdd('placa')}
        />
      ) : null}

      {primary ? (
        <GarageVehicleHero
          vehicle={primary}
          isActive={garage.activeVehicle?.id === primary.id}
          onUseInStore={() => {
            garage.setActiveVehicle(primary)
            pushOk('Veículo ativo na loja (não altera o principal).')
          }}
          onSetPrimary={
            primary.isPrimary ? undefined : () => void handleSetPrimary(primary.id)
          }
          onRemove={() => void handleRemove(primary.id)}
        />
      ) : null}

      {others.length > 0 ? (
        <section className="space-y-3" aria-label="Outros veículos">
          <h3 className="m-0 text-sm font-extrabold uppercase tracking-wide text-fal-muted">
            Outros veículos
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((v) => (
              <GarageVehicleCard
                key={v.id}
                vehicle={v}
                isActive={garage.activeVehicle?.id === v.id}
                onUseInStore={() => {
                  garage.setActiveVehicle(v)
                  pushOk('Veículo ativo na loja (não altera o principal).')
                }}
                onSetPrimary={() => void handleSetPrimary(v.id)}
                onRemove={() => void handleRemove(v.id)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
