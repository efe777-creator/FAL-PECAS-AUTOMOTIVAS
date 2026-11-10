import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { entityStatusLabel } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminListModels,
  adminListVersions,
  adminSetModelStatus,
  adminSetVersionStatus,
  adminUpsertModel,
  adminUpsertVersion,
} from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleModel, VehicleVersion } from '@/types'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const MODELS_PAGE_SIZE = 40

type ModelSort = 'maker_model' | 'model' | 'maker'

export function AdminVehiclesPage() {
  useDocumentTitle('Veículos | Admin FAL')
  const toast = useToast()
  const [makers, setMakers] = useState<Manufacturer[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [makerId, setMakerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [modelName, setModelName] = useState('')
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [year, setYear] = useState('')
  const [engine, setEngine] = useState('')
  const [versionName, setVersionName] = useState('')
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchName, setSearchName] = useState('')
  const [filterMakerId, setFilterMakerId] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [sortBy, setSortBy] = useState<ModelSort>('maker_model')
  const [modelsPage, setModelsPage] = useState(1)
  const [allVersionsForYear, setAllVersionsForYear] = useState<VehicleVersion[] | null>(null)

  function pushError(msg: string) {
    setError(msg)
    toast.push(msg, 'error')
  }

  function pushOk(msg: string) {
    setError(null)
    toast.push(msg, 'success')
  }

  const makerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of makers) map.set(m.id, m.name)
    return map
  }, [makers])

  async function reloadModels() {
    setModels(await adminListModels())
  }

  useEffect(() => {
    void (async () => {
      try {
        const [makerList] = await Promise.all([adminListManufacturers(), reloadModels()])
        setMakers(makerList)
      } catch (e) {
        const msg = toUserMessage(e, 'Erro ao carregar veículos')
        setError(msg)
        toast.push(msg, 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [toast])

  useEffect(() => {
    if (!filterYear.trim()) {
      setAllVersionsForYear(null)
      return
    }
    const y = Number(filterYear.trim())
    if (!Number.isInteger(y)) {
      setAllVersionsForYear([])
      return
    }
    let cancelled = false
    void adminListVersions()
      .then((rows) => {
        if (!cancelled) setAllVersionsForYear(rows.filter((v) => v.year === y))
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = toUserMessage(e, 'Erro ao filtrar por ano')
          setError(msg)
          toast.push(msg, 'error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [filterYear, toast])

  useEffect(() => {
    if (!modelId) {
      setVersions([])
      return
    }
    void adminListVersions(modelId)
      .then(setVersions)
      .catch((e) => {
        const msg = toUserMessage(e, 'Erro ao carregar configurações')
        setError(msg)
        toast.push(msg, 'error')
      })
  }, [modelId, toast])

  const filteredModels = useMemo(() => {
    const q = searchName.trim().toLowerCase()
    const yearModelIds =
      allVersionsForYear != null ? new Set(allVersionsForYear.map((v) => v.modelId)) : null

    let list = models.filter((m) => {
      if (filterMakerId && m.manufacturerId !== filterMakerId) return false
      if (q) {
        const maker = (makerNameById.get(m.manufacturerId) ?? '').toLowerCase()
        if (!m.name.toLowerCase().includes(q) && !maker.includes(q)) return false
      }
      if (yearModelIds && !yearModelIds.has(m.id)) return false
      return true
    })

    list = [...list].sort((a, b) => {
      const ma = makerNameById.get(a.manufacturerId) ?? ''
      const mb = makerNameById.get(b.manufacturerId) ?? ''
      if (sortBy === 'model') return a.name.localeCompare(b.name, 'pt-BR')
      if (sortBy === 'maker') {
        const c = ma.localeCompare(mb, 'pt-BR')
        return c !== 0 ? c : a.name.localeCompare(b.name, 'pt-BR')
      }
      const c = ma.localeCompare(mb, 'pt-BR')
      return c !== 0 ? c : a.name.localeCompare(b.name, 'pt-BR')
    })
    return list
  }, [models, filterMakerId, searchName, makerNameById, sortBy, allVersionsForYear])

  const totalFiltered = filteredModels.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / MODELS_PAGE_SIZE))
  const safePage = Math.min(modelsPage, totalPages)
  const pageModels = filteredModels.slice(
    (safePage - 1) * MODELS_PAGE_SIZE,
    safePage * MODELS_PAGE_SIZE,
  )

  useEffect(() => {
    setModelsPage(1)
  }, [searchName, filterMakerId, filterYear, sortBy])

  async function saveModel(e: FormEvent) {
    e.preventDefault()
    const targetMaker = makerId || filterMakerId
    if (!targetMaker) {
      pushError('Selecione a montadora para criar/editar o modelo.')
      return
    }
    setError(null)
    try {
      await adminUpsertModel({
        id: editingModelId ?? undefined,
        manufacturerId: targetMaker,
        name: modelName,
        status: models.find((m) => m.id === editingModelId)?.status ?? 'active',
      })
      setModelName('')
      setEditingModelId(null)
      await reloadModels()
      pushOk(editingModelId ? 'Modelo atualizado.' : 'Modelo criado.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar modelo'))
    }
  }

  async function saveVersion(e: FormEvent) {
    e.preventDefault()
    if (!modelId) return
    const model = models.find((m) => m.id === modelId)
    if (!model) return
    setError(null)
    try {
      await adminUpsertVersion({
        id: editingVersionId ?? undefined,
        manufacturerId: model.manufacturerId,
        modelId,
        year: year.trim() ? Number(year) : null,
        engine: engine.trim() || null,
        versionName: versionName.trim() || null,
        status: versions.find((v) => v.id === editingVersionId)?.status ?? 'active',
      })
      setYear('')
      setEngine('')
      setVersionName('')
      setEditingVersionId(null)
      setVersions(await adminListVersions(modelId))
      pushOk(editingVersionId ? 'Configuração atualizada.' : 'Configuração criada.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar configuração'))
    }
  }

  function startEditModel(m: VehicleModel) {
    setEditingModelId(m.id)
    setModelName(m.name)
    setModelId(m.id)
    setMakerId(m.manufacturerId)
  }

  function startEditVersion(v: VehicleVersion) {
    setEditingVersionId(v.id)
    setYear(v.year != null ? String(v.year) : '')
    setEngine(v.engine ?? '')
    setVersionName(v.versionName ?? '')
  }

  const filteredVersions = useMemo(() => {
    const y = filterYear.trim()
    if (!y) return versions
    const n = Number(y)
    if (!Number.isInteger(n)) return versions
    return versions.filter((v) => v.year === n)
  }, [versions, filterYear])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-navy">Veículos</h1>
          <p className="mt-1 text-sm text-fal-muted">
            Hierarquia: Montadora → Modelo → Configuração. Período da aplicação (ano) fica em{' '}
            <code className="text-xs">product_vehicle_compatibility.year_start/year_end</code> — não
            só em <code className="text-xs">vehicle_versions.year</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy"
            to="/admin/veiculos/importar-mestre"
          >
            Importar mestre
          </Link>
          <Link
            className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy"
            to="/admin/aplicacoes"
          >
            Aplicações
          </Link>
          <Link
            className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy"
            to="/admin/produtos/importar-aplicacoes"
          >
            Importar aplicações
          </Link>
          <Link
            className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy"
            to="/admin/importacoes?kind=catalog_applications"
          >
            Histórico apps
          </Link>
        </div>
      </div>
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {loading ? <Loading /> : null}

      <div className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Buscar modelo / montadora"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Ex.: Gol, Volkswagen"
        />
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">
            Filtrar montadora
          </span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={filterMakerId}
            onChange={(e) => setFilterMakerId(e.target.value)}
          >
            <option value="">Todas</option>
            {makers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Filtrar ano (config)"
          inputMode="numeric"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          hint="Opcional — modelos com config nesse ano"
        />
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Ordenar</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ModelSort)}
          >
            <option value="maker_model">Montadora + modelo</option>
            <option value="model">Modelo</option>
            <option value="maker">Montadora</option>
          </select>
        </label>
      </div>

      <p className="m-0 text-sm font-semibold text-fal-navy">
        {totalFiltered} modelo{totalFiltered === 1 ? '' : 's'}
        {totalFiltered !== models.length ? ` (de ${models.length} no cadastro)` : ''}
      </p>

      <form
        onSubmit={saveModel}
        className="flex flex-wrap items-end gap-3 rounded-[14px] border border-fal-line bg-white p-4"
      >
        <label className="block min-w-[180px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">
            Montadora (cadastro)
          </span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={makerId}
            onChange={(e) => {
              setMakerId(e.target.value)
              setEditingModelId(null)
              setModelName('')
              setEditingVersionId(null)
            }}
            required
          >
            <option value="">Selecione</option>
            {makers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({entityStatusLabel(m.status)})
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-[200px] flex-1">
          <Input
            label={editingModelId ? 'Editar modelo' : 'Novo modelo'}
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
            disabled={!makerId}
          />
        </div>
        <Button type="submit" disabled={!makerId}>
          {editingModelId ? 'Salvar modelo' : 'Criar modelo'}
        </Button>
        {editingModelId ? (
          <Button
            type="button"
            variant="light"
            onClick={() => {
              setEditingModelId(null)
              setModelName('')
            }}
          >
            Cancelar
          </Button>
        ) : null}
      </form>

      {pageModels.length === 0 ? (
        <EmptyState
          title={models.length === 0 ? 'Nenhum veículo cadastrado' : 'Nenhum resultado'}
          description={
            models.length === 0
              ? 'Cadastre o primeiro modelo acima.'
              : 'Ajuste busca ou filtros para ver modelos.'
          }
        />
      ) : null}

      <div className="space-y-3 md:hidden">
        {pageModels.map((m) => (
          <article
            key={m.id}
            className={[
              'rounded-[14px] border border-fal-line bg-white p-3 shadow-sm',
              modelId === m.id ? 'border-fal-yellow bg-[#fff8db]' : '',
            ].join(' ')}
          >
            <p className="m-0 text-xs text-fal-muted">{makerNameById.get(m.manufacturerId) ?? '—'}</p>
            <p className="mb-1 mt-0.5 text-sm font-extrabold text-fal-navy">{m.name}</p>
            <p className="m-0 text-xs text-fal-muted">{entityStatusLabel(m.status)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[10px] bg-fal-navy px-3 text-sm font-bold text-white"
                onClick={() => startEditModel(m)}
              >
                Editar
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line px-3 text-sm font-semibold text-fal-muted"
                onClick={() =>
                  void adminSetModelStatus(m.id, m.status === 'active' ? 'inactive' : 'active')
                    .then(async () => {
                      await reloadModels()
                      pushOk(m.status === 'active' ? 'Modelo inativado.' : 'Modelo ativado.')
                    })
                    .catch((err) => pushError(toUserMessage(err, 'Falha ao atualizar status')))
                }
              >
                {m.status === 'active' ? 'Inativar' : 'Ativar'}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line px-3 text-sm font-semibold text-fal-navy"
                onClick={() => {
                  setModelId(m.id)
                  setMakerId(m.manufacturerId)
                }}
              >
                Ver configs
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-[14px] border border-fal-line bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Montadora</th>
              <th className="px-3 py-2">Modelo</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pageModels.map((m) => (
              <tr
                key={m.id}
                className={[
                  'border-t border-fal-line',
                  modelId === m.id ? 'bg-[#fff8db]' : '',
                ].join(' ')}
              >
                <td className="px-3 py-2">{makerNameById.get(m.manufacturerId) ?? '—'}</td>
                <td className="px-3 py-2 font-semibold">{m.name}</td>
                <td className="px-3 py-2">{entityStatusLabel(m.status)}</td>
                <td className="px-3 py-2 space-x-2">
                  <button
                    type="button"
                    className="font-semibold text-fal-auth-link"
                    onClick={() => startEditModel(m)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="font-semibold text-fal-muted"
                    onClick={() =>
                      void adminSetModelStatus(m.id, m.status === 'active' ? 'inactive' : 'active')
                        .then(async () => {
                          await reloadModels()
                          pushOk(m.status === 'active' ? 'Modelo inativado.' : 'Modelo ativado.')
                        })
                        .catch((err) => pushError(toUserMessage(err, 'Falha ao atualizar status')))
                    }
                  >
                    {m.status === 'active' ? 'Inativar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    className="font-semibold text-fal-navy"
                    onClick={() => {
                      setModelId(m.id)
                      setMakerId(m.manufacturerId)
                    }}
                  >
                    Ver configs
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="light"
            disabled={safePage <= 1}
            onClick={() => setModelsPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-fal-muted">
            Página {safePage} de {totalPages}
          </span>
          <Button
            type="button"
            variant="light"
            disabled={safePage >= totalPages}
            onClick={() => setModelsPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </Button>
        </div>
      ) : null}

      <label className="block max-w-md text-sm">
        <span className="mb-1 block font-semibold">Modelo (configurações)</span>
        <select
          className="w-full rounded-[10px] border border-fal-line px-3 py-2"
          value={modelId}
          onChange={(e) => {
            setModelId(e.target.value)
            setEditingVersionId(null)
            setYear('')
            setEngine('')
            setVersionName('')
            const m = models.find((x) => x.id === e.target.value)
            if (m) setMakerId(m.manufacturerId)
          }}
        >
          <option value="">Selecione</option>
          {filteredModels.map((m) => (
            <option key={m.id} value={m.id}>
              {(makerNameById.get(m.manufacturerId) ?? '?') + ' · ' + m.name}
            </option>
          ))}
        </select>
      </label>

      <form
        onSubmit={saveVersion}
        className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-4"
      >
        <Input
          label="Ano (opcional / legado)"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={!modelId}
          hint="Período da peça fica na aplicação (PVC)"
        />
        <Input
          label="Motor (opcional)"
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
          disabled={!modelId}
        />
        <Input
          label="Versão (opcional)"
          value={versionName}
          onChange={(e) => setVersionName(e.target.value)}
          disabled={!modelId}
        />
        <div className="flex flex-wrap items-end gap-2">
          <Button type="submit" disabled={!modelId}>
            {editingVersionId ? 'Salvar configuração' : 'Criar configuração'}
          </Button>
          {editingVersionId ? (
            <Button
              type="button"
              variant="light"
              onClick={() => {
                setEditingVersionId(null)
                setYear('')
                setEngine('')
                setVersionName('')
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      {filteredVersions.length === 0 ? (
        <EmptyState
          title={modelId ? 'Nenhuma configuração neste modelo' : 'Selecione um modelo'}
          description={
            modelId
              ? 'Crie ano/motor/versão para vincular aplicações.'
              : 'Escolha o modelo na lista acima para listar configurações.'
          }
        />
      ) : null}

      <div className="space-y-3 md:hidden">
        {filteredVersions.map((v) => (
          <article
            key={v.id}
            className="rounded-[14px] border border-fal-line bg-white p-3 shadow-sm"
          >
            <p className="m-0 text-sm font-extrabold text-fal-navy">
              {v.year ?? '—'} · {v.engine ?? '—'} · {v.versionName ?? '—'}
            </p>
            <p className="mb-0 mt-1 text-xs text-fal-muted">{entityStatusLabel(v.status)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[10px] bg-fal-navy px-3 text-sm font-bold text-white"
                onClick={() => startEditVersion(v)}
              >
                Editar
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line px-3 text-sm font-semibold text-fal-muted"
                onClick={() =>
                  void adminSetVersionStatus(v.id, v.status === 'active' ? 'inactive' : 'active')
                    .then(async () => {
                      setVersions(await adminListVersions(modelId))
                      pushOk(
                        v.status === 'active'
                          ? 'Configuração inativada.'
                          : 'Configuração ativada.',
                      )
                    })
                    .catch((err) =>
                      pushError(toUserMessage(err, 'Falha ao atualizar status')),
                    )
                }
              >
                {v.status === 'active' ? 'Inativar' : 'Ativar'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-[14px] border border-fal-line bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Ano</th>
              <th className="px-3 py-2">Motor</th>
              <th className="px-3 py-2">Versão</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredVersions.map((v) => (
              <tr key={v.id} className="border-t border-fal-line">
                <td className="px-3 py-2">{v.year ?? '—'}</td>
                <td className="px-3 py-2">{v.engine ?? '—'}</td>
                <td className="px-3 py-2">{v.versionName ?? '—'}</td>
                <td className="px-3 py-2">{entityStatusLabel(v.status)}</td>
                <td className="px-3 py-2 space-x-2">
                  <button
                    type="button"
                    className="font-semibold text-fal-auth-link"
                    onClick={() => startEditVersion(v)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="font-semibold text-fal-muted"
                    onClick={() =>
                      void adminSetVersionStatus(
                        v.id,
                        v.status === 'active' ? 'inactive' : 'active',
                      )
                        .then(async () => {
                          setVersions(await adminListVersions(modelId))
                          pushOk(
                            v.status === 'active'
                              ? 'Configuração inativada.'
                              : 'Configuração ativada.',
                          )
                        })
                        .catch((err) =>
                          pushError(toUserMessage(err, 'Falha ao atualizar status')),
                        )
                    }
                  >
                    {v.status === 'active' ? 'Inativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
