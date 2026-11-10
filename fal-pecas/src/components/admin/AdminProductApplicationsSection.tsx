import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import { formatVehicleAppYear, validatePvcYearInputs } from '@/lib/vehicleAppYear'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminAddApplicationsBulk,
  adminListApplications,
  adminRemoveApplication,
  adminUpdateApplicationYears,
} from '@/services/admin/adminProductService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleModel, VehicleVersion } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  productId: string
}

type AppRow = {
  id: string
  year_start?: number | null
  year_end?: number | null
  vehicle_versions?: {
    year: number | null
    engine: string | null
    version_name: string | null
    manufacturers?: { name: string } | { name: string }[]
    models?: { name: string } | { name: string }[]
  }
}

export function AdminProductApplicationsSection({ productId }: Props) {
  const toast = useToast()
  const [apps, setApps] = useState<AppRow[]>([])
  const [makers, setMakers] = useState<Manufacturer[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [makerId, setMakerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [engineFilter, setEngineFilter] = useState('')
  const [versionNameFilter, setVersionNameFilter] = useState('')
  const [appYearStart, setAppYearStart] = useState('')
  const [appYearEnd, setAppYearEnd] = useState('')
  const [appBusy, setAppBusy] = useState(false)
  const [editingAppId, setEditingAppId] = useState<string | null>(null)
  const [editYearStart, setEditYearStart] = useState('')
  const [editYearEnd, setEditYearEnd] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setApps((await adminListApplications(productId)) as unknown as AppRow[])
  }, [productId])

  useEffect(() => {
    void adminListManufacturers()
      .then((mfrs) => setMakers(mfrs.filter((m) => m.status === 'active')))
      .catch((e) => setError(toUserMessage(e, 'Falha ao carregar montadoras')))
  }, [])

  useEffect(() => {
    void reload().catch((e) => setError(toUserMessage(e, 'Falha ao carregar aplicações')))
  }, [reload])

  useEffect(() => {
    if (!makerId) {
      setModels([])
      setModelId('')
      return
    }
    void adminListModels(makerId).then(setModels)
  }, [makerId])

  useEffect(() => {
    if (!modelId) {
      setVersions([])
      setEngineFilter('')
      setVersionNameFilter('')
      return
    }
    void adminListVersions(modelId).then(setVersions)
  }, [modelId])

  const engineOptions = useMemo(() => {
    const set = new Set<string>()
    for (const v of versions) {
      const e = (v.engine ?? '').trim()
      if (e) set.add(e)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [versions])

  const versionNameOptions = useMemo(() => {
    const filtered = engineFilter
      ? versions.filter((v) => (v.engine ?? '').trim() === engineFilter)
      : versions
    const set = new Set<string>()
    for (const v of filtered) {
      const name = (v.versionName ?? '').trim()
      if (name) set.add(name)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [versions, engineFilter])

  const matchingVersions = useMemo(() => {
    return versions.filter((v) => {
      if (engineFilter && (v.engine ?? '').trim() !== engineFilter) return false
      if (versionNameFilter && (v.versionName ?? '').trim() !== versionNameFilter) return false
      return true
    })
  }, [versions, engineFilter, versionNameFilter])

  async function onLinkApplications() {
    if (!modelId) return
    setError(null)
    if (matchingVersions.length === 0) {
      setError('Nenhuma configuração de veículo bate com os filtros. Ajuste motorização/versão.')
      return
    }
    const period = validatePvcYearInputs(appYearStart, appYearEnd)
    if (!period.ok) {
      setError(period.message)
      return
    }
    setAppBusy(true)
    try {
      const n = await adminAddApplicationsBulk(
        productId,
        matchingVersions.map((v) => v.id),
        { yearStart: period.yearStart, yearEnd: period.yearEnd },
      )
      await reload()
      toast.push(
        n === 1
          ? '1 aplicação vinculada.'
          : `${n} aplicações vinculadas (motorização/versão conforme filtros).`,
        'success',
      )
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao vincular aplicações')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setAppBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 font-extrabold text-fal-navy">Aplicações</h2>
        <Link
          className="text-sm font-semibold text-fal-navy underline"
          to={`/admin/aplicacoes?productId=${productId}`}
        >
          Abrir gestão de aplicações
        </Link>
      </div>
      <p className="text-xs text-fal-muted">
        Cascata: montadora → modelo → motorização → versão → período. Na busca do cliente: motor ou
        versão em branco na config = serve para todas; se cadastrado (ex.: Unique / 1.0) = só aquela.
        Vincular agora: {matchingVersions.length} config elegível
        {matchingVersions.length === 1 ? '' : 'is'}.
      </p>
      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}
      <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
        <select
          className="rounded-[10px] border border-fal-line px-3 py-2"
          value={makerId}
          onChange={(e) => {
            setMakerId(e.target.value)
            setModelId('')
          }}
        >
          <option value="">Montadora</option>
          {makers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-[10px] border border-fal-line px-3 py-2"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          disabled={!makerId}
        >
          <option value="">Modelo</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-[10px] border border-fal-line px-3 py-2"
          value={engineFilter}
          onChange={(e) => {
            setEngineFilter(e.target.value)
            setVersionNameFilter('')
          }}
          disabled={!modelId}
        >
          <option value="">Motorização (Todas)</option>
          {engineOptions.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          className="rounded-[10px] border border-fal-line px-3 py-2"
          value={versionNameFilter}
          onChange={(e) => setVersionNameFilter(e.target.value)}
          disabled={!modelId}
        >
          <option value="">Versão (Todas)</option>
          {versionNameOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <Input
          label="Ano inicial *"
          inputMode="numeric"
          value={appYearStart}
          onChange={(e) => setAppYearStart(e.target.value)}
          disabled={!modelId}
        />
        <Input
          label="Ano final"
          inputMode="numeric"
          value={appYearEnd}
          onChange={(e) => setAppYearEnd(e.target.value)}
          disabled={!modelId}
          hint="Em branco = vigente até o ano atual"
        />
      </div>
      <Button
        type="button"
        disabled={!modelId || appBusy || matchingVersions.length === 0}
        onClick={() => void onLinkApplications()}
      >
        Vincular {matchingVersions.length > 1 ? `(${matchingVersions.length})` : ''}
      </Button>
      <ul className="space-y-1 text-sm">
        {apps.map((row) => {
          const vv = row.vehicle_versions
          const maker = Array.isArray(vv?.manufacturers)
            ? vv?.manufacturers[0]?.name
            : vv?.manufacturers?.name
          const model = Array.isArray(vv?.models) ? vv?.models[0]?.name : vv?.models?.name
          const yearLabel = formatVehicleAppYear({
            yearStart: row.year_start,
            yearEnd: row.year_end,
            versionYear: vv?.year,
          })
          const isEditing = editingAppId === row.id
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line py-1"
            >
              <span>
                {[maker, model, vv?.engine || '—', vv?.version_name || '—', yearLabel]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {isEditing ? (
                  <>
                    <input
                      className="w-20 rounded border border-fal-line px-2 py-1 text-xs"
                      inputMode="numeric"
                      placeholder="Início"
                      value={editYearStart}
                      onChange={(e) => setEditYearStart(e.target.value)}
                    />
                    <input
                      className="w-20 rounded border border-fal-line px-2 py-1 text-xs"
                      inputMode="numeric"
                      placeholder="Fim"
                      value={editYearEnd}
                      onChange={(e) => setEditYearEnd(e.target.value)}
                    />
                    <button
                      type="button"
                      className="font-semibold text-fal-navy underline"
                      onClick={() => {
                        const period = validatePvcYearInputs(editYearStart, editYearEnd)
                        if (!period.ok) {
                          setError(period.message)
                          return
                        }
                        void adminUpdateApplicationYears(row.id, {
                          yearStart: period.yearStart,
                          yearEnd: period.yearEnd,
                        })
                          .then(async () => {
                            setEditingAppId(null)
                            await reload()
                            toast.push('Período atualizado.', 'success')
                          })
                          .catch((err) => {
                            const msg = toUserMessage(err, 'Falha ao salvar período')
                            setError(msg)
                            toast.push(msg, 'error')
                          })
                      }}
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-fal-muted underline"
                      onClick={() => setEditingAppId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="font-semibold text-fal-navy underline"
                    onClick={() => {
                      setEditingAppId(row.id)
                      setEditYearStart(row.year_start != null ? String(row.year_start) : '')
                      setEditYearEnd(row.year_end != null ? String(row.year_end) : '')
                    }}
                  >
                    Período
                  </button>
                )}
                <button
                  type="button"
                  className="font-semibold text-fal-danger"
                  onClick={() => {
                    void confirmDialog({
                      title: 'Remover aplicação?',
                      message: 'O vínculo deste produto com o veículo será removido.',
                      confirmLabel: 'Remover',
                      danger: true,
                    })
                      .then(async ({ confirmed }) => {
                        if (!confirmed) return
                        await adminRemoveApplication(row.id)
                        await reload()
                        toast.push('Aplicação removida.', 'success')
                      })
                      .catch((err) => {
                        const msg = toUserMessage(err, 'Falha ao remover aplicação')
                        setError(msg)
                        toast.push(msg, 'error')
                      })
                  }}
                >
                  Remover
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
