import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import {
  ensureSavedVehicleFromFilter,
  listSavedVehicles,
  removeSavedVehicle,
  setPrimaryVehicle,
  updateSavedVehicle,
} from '@/services/customers/customerVehicleService'
import { formatPlateMask, plateValidationMessage } from '@/services/plates/plateNormalize'
import { getVehicleOptions } from '@/services/vehicles/vehicleService'
import { vehicleModelKey, vehicleModelYearKey } from '@/services/vehicles/vehicleOptionKeys'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import type { CustomerSavedVehicle, VehicleOptionTree } from '@/types'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

type EditDraft = { nickname: string; plate: string }

export function AccountVehiclesPage() {
  useDocumentTitle('Meus carros | FAL Peças Automotivas')
  const toast = useToast()
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EditDraft>({ nickname: '', plate: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  function pushOk(message: string) {
    setError(null)
    toast.push(message, 'success')
  }

  async function reload() {
    setLoading(true)
    try {
      const [list, options] = await Promise.all([listSavedVehicles(), getVehicleOptions()])
      setItems(list)
      setTree(options)
      setError(null)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar veículos'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

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

  function startEdit(v: CustomerSavedVehicle) {
    setEditingId(v.id)
    setDraft({
      nickname: v.nickname ?? '',
      plate: v.plate ? formatPlateMask(v.plate) : '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft({ nickname: '', plate: '' })
  }

  async function saveEdit(id: string) {
    const plateRaw = draft.plate.trim()
    if (plateRaw) {
      const msg = plateValidationMessage(plateRaw)
      if (msg) {
        pushError(msg)
        return
      }
    }
    setSavingEdit(true)
    try {
      await updateSavedVehicle(id, {
        nickname: draft.nickname.trim() || null,
        plate: plateRaw || null,
      })
      cancelEdit()
      pushOk('Veículo atualizado.')
      await reload()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao atualizar veículo'))
    } finally {
      setSavingEdit(false)
    }
  }

  async function onSubmit(e: FormEvent) {
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
      await ensureSavedVehicleFromFilter({
        maker,
        model,
        year: year || undefined,
        engine: engine || undefined,
        version: version || undefined,
        plate: plateRaw || undefined,
        nickname,
        isPrimary: asPrimary || items.length === 0,
      })
      setMaker('')
      setModel('')
      setYear('')
      setEngine('')
      setVersion('')
      setNickname('')
      setPlate('')
      setAsPrimary(false)
      pushOk('Veículo salvo.')
      await reload()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar veículo'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-fal border border-fal-line bg-fal-surface p-5">
        <h2 className="mt-0 text-xl font-extrabold">Meus carros</h2>
        <p className="text-sm text-fal-muted">
          Garagem da conta: salve com montadora e modelo (ano, motor e versão opcionais). Mesmo
          sem peças no catálogo o carro fica guardado para você completar depois.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            to="/veiculo"
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-fal-line bg-fal-bg px-4 text-sm font-bold text-fal-fg hover:border-fal-navy"
          >
            Buscar por placa / veículo
          </Link>
          <Link
            to="/catalogo"
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-fal-line bg-fal-surface px-4 text-sm font-bold text-fal-fg hover:border-fal-navy"
          >
            Abrir catálogo
          </Link>
        </div>
        {error ? <p className="text-sm text-fal-danger">{error}</p> : null}

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
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
          <Input label="Apelido (opcional)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
            <input type="checkbox" checked={asPrimary} onChange={(e) => setAsPrimary(e.target.checked)} />
            Definir como veículo principal
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Salvar veículo</Button>
          </div>
        </form>
      </div>

      {loading ? <Loading /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="Você ainda não cadastrou nenhum veículo."
          description="Salve o carro da sua garagem para filtrar o catálogo mais rápido."
        />
      ) : null}

      <div className="space-y-3">
        {items.map((v) => (
          <div key={v.id} className="rounded-fal border border-fal-line bg-fal-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="m-0 font-extrabold">
                  {v.nickname || `${v.makerName ?? ''} ${v.modelName ?? ''}`.trim() || 'Veículo'}
                  {v.isPrimary ? <span className="text-xs text-fal-success"> · Principal</span> : null}
                </p>
                <p className="mb-0 mt-1 text-sm text-fal-muted">
                  {[v.makerName, v.modelName, v.year, v.engine, v.versionName].filter(Boolean).join(' · ')}
                  {!v.versionId ? (
                    <span className="text-fal-muted"> · versão ainda não vinculada ao cadastro</span>
                  ) : null}
                </p>
                {editingId !== v.id ? (
                  <p className="mb-0 mt-1 text-sm">
                    {v.plate ? (
                      <>
                        Placa: <span className="font-semibold tracking-wide">{formatPlateMask(v.plate)}</span>
                      </>
                    ) : (
                      <span className="text-fal-muted">Sem placa</span>
                    )}
                  </p>
                ) : (
                  <div className="mt-3 grid max-w-md gap-2 sm:grid-cols-2">
                    <Input
                      label="Placa"
                      value={draft.plate}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, plate: formatPlateMask(e.target.value) }))
                      }
                      placeholder="ABC1D23"
                      autoComplete="off"
                    />
                    <Input
                      label="Apelido"
                      value={draft.nickname}
                      onChange={(e) => setDraft((d) => ({ ...d, nickname: e.target.value }))}
                    />
                  </div>
                )}
                <Link
                  className="mt-2 inline-block text-sm font-semibold text-fal-auth-link"
                  to={`/catalogo?maker=${encodeURIComponent(v.makerName ?? '')}&model=${encodeURIComponent(v.modelName ?? '')}${v.year ? `&year=${v.year}` : ''}${v.engine ? `&engine=${encodeURIComponent(v.engine)}` : ''}${v.versionName ? `&version=${encodeURIComponent(v.versionName)}` : ''}`}
                >
                  {v.versionId ? 'Ver peças compatíveis' : 'Buscar no catálogo (compatibilidade limitada)'}
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingId === v.id ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingEdit}
                      onClick={() => void saveEdit(v.id)}
                    >
                      Salvar
                    </Button>
                    <Button
                      type="button"
                      variant="light"
                      size="sm"
                      disabled={savingEdit}
                      onClick={cancelEdit}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="light" size="sm" onClick={() => startEdit(v)}>
                    Editar placa / apelido
                  </Button>
                )}
                {!v.isPrimary && editingId !== v.id ? (
                  <Button
                    type="button"
                    variant="light"
                    size="sm"
                    onClick={() =>
                      void setPrimaryVehicle(v.id)
                        .then(async () => {
                          pushOk('Veículo principal atualizado.')
                          await reload()
                        })
                        .catch((err) =>
                          pushError(toUserMessage(err, 'Falha ao definir veículo principal')),
                        )
                    }
                  >
                    Tornar principal
                  </Button>
                ) : null}
                {editingId !== v.id ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      void (async () => {
                        const { confirmed } = await confirmDialog({
                          title: 'Remover veículo?',
                          message: 'Remover este veículo salvo?',
                          confirmLabel: 'Remover',
                          danger: true,
                        })
                        if (!confirmed) return
                        try {
                          await removeSavedVehicle(v.id)
                          pushOk('Veículo removido.')
                          await reload()
                        } catch (err) {
                          pushError(toUserMessage(err, 'Falha ao remover veículo'))
                        }
                      })()
                    }}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
