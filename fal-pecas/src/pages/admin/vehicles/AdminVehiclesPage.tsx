import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { entityStatusLabel } from '@/lib/adminLabels'
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
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export function AdminVehiclesPage() {
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

  function pushError(msg: string) {
    setError(msg)
    toast.push(msg, 'error')
  }

  function pushOk(msg: string) {
    setError(null)
    toast.push(msg, 'success')
  }

  useEffect(() => {
    void (async () => {
      try {
        setMakers(await adminListManufacturers())
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro'
        setError(msg)
        toast.push(msg, 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [toast])

  useEffect(() => {
    if (!makerId) {
      setModels([])
      setModelId('')
      return
    }
    void adminListModels(makerId)
      .then(setModels)
      .catch((e) => {
        const msg = String(e)
        setError(msg)
        toast.push(msg, 'error')
      })
  }, [makerId, toast])

  useEffect(() => {
    if (!modelId) {
      setVersions([])
      return
    }
    void adminListVersions(modelId)
      .then(setVersions)
      .catch((e) => {
        const msg = String(e)
        setError(msg)
        toast.push(msg, 'error')
      })
  }, [modelId, toast])

  async function saveModel(e: FormEvent) {
    e.preventDefault()
    if (!makerId) return
    setError(null)
    try {
      await adminUpsertModel({
        id: editingModelId ?? undefined,
        manufacturerId: makerId,
        name: modelName,
        status: models.find((m) => m.id === editingModelId)?.status ?? 'active',
      })
      setModelName('')
      setEditingModelId(null)
      setModels(await adminListModels(makerId))
      pushOk(editingModelId ? 'Modelo atualizado.' : 'Modelo criado.')
    } catch (err) {
      pushError(err instanceof Error ? err.message : 'Falha ao salvar modelo')
    }
  }

  async function saveVersion(e: FormEvent) {
    e.preventDefault()
    if (!makerId || !modelId) return
    setError(null)
    try {
      await adminUpsertVersion({
        id: editingVersionId ?? undefined,
        manufacturerId: makerId,
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
      pushError(err instanceof Error ? err.message : 'Falha ao salvar configuração')
    }
  }

  function startEditModel(m: VehicleModel) {
    setEditingModelId(m.id)
    setModelName(m.name)
    setModelId(m.id)
  }

  function startEditVersion(v: VehicleVersion) {
    setEditingVersionId(v.id)
    setYear(v.year != null ? String(v.year) : '')
    setEngine(v.engine ?? '')
    setVersionName(v.versionName ?? '')
  }

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

      <label className="block max-w-md text-sm">
        <span className="mb-1 block font-semibold">Montadora</span>
        <select
          className="w-full rounded-[10px] border border-fal-line px-3 py-2"
          value={makerId}
          onChange={(e) => {
            setMakerId(e.target.value)
            setEditingModelId(null)
            setModelName('')
            setEditingVersionId(null)
          }}
        >
          <option value="">Selecione</option>
          {makers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({entityStatusLabel(m.status)})
            </option>
          ))}
        </select>
      </label>

      <form onSubmit={saveModel} className="flex flex-wrap items-end gap-3 rounded-[14px] border border-fal-line bg-white p-4">
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

      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Modelo</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4">
                  <EmptyState
                    title={makerId ? 'Nenhum modelo nesta montadora' : 'Selecione uma montadora'}
                    description={
                      makerId
                        ? 'Cadastre o primeiro modelo para esta montadora.'
                        : 'Escolha a montadora acima para listar modelos.'
                    }
                  />
                </td>
              </tr>
            ) : (
              models.map((m) => (
                <tr key={m.id} className="border-t border-fal-line">
                  <td className="px-3 py-2 font-semibold">{m.name}</td>
                  <td className="px-3 py-2">{entityStatusLabel(m.status)}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button type="button" className="font-semibold text-fal-auth-link" onClick={() => startEditModel(m)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-fal-muted"
                      onClick={() =>
                        void adminSetModelStatus(m.id, m.status === 'active' ? 'inactive' : 'active')
                          .then(async () => {
                            setModels(await adminListModels(makerId))
                            pushOk(m.status === 'active' ? 'Modelo inativado.' : 'Modelo ativado.')
                          })
                          .catch((err) => pushError(String(err)))
                      }
                    >
                      {m.status === 'active' ? 'Inativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-fal-navy"
                      onClick={() => setModelId(m.id)}
                    >
                      Ver configs
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
          }}
        >
          <option value="">Selecione</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <form onSubmit={saveVersion} className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-4">
        <Input label="Ano (opcional)" value={year} onChange={(e) => setYear(e.target.value)} disabled={!modelId} />
        <Input label="Motor (opcional)" value={engine} onChange={(e) => setEngine(e.target.value)} disabled={!modelId} />
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

      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
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
            {versions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4">
                  <EmptyState
                    title={
                      modelId ? 'Nenhuma configuração neste modelo' : 'Selecione um modelo'
                    }
                    description={
                      modelId
                        ? 'Crie ano/motor/versão para vincular aplicações.'
                        : 'Escolha o modelo para listar configurações.'
                    }
                  />
                </td>
              </tr>
            ) : (
              versions.map((v) => (
                <tr key={v.id} className="border-t border-fal-line">
                  <td className="px-3 py-2">{v.year ?? '—'}</td>
                  <td className="px-3 py-2">{v.engine ?? '—'}</td>
                  <td className="px-3 py-2">{v.versionName ?? '—'}</td>
                  <td className="px-3 py-2">{entityStatusLabel(v.status)}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button type="button" className="font-semibold text-fal-auth-link" onClick={() => startEditVersion(v)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-fal-muted"
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
                          .catch((err) => pushError(String(err)))
                      }
                    >
                      {v.status === 'active' ? 'Inativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
