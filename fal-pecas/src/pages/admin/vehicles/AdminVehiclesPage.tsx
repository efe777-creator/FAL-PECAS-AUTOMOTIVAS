import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminListModels,
  adminListVersions,
  adminUpsertModel,
  adminUpsertVersion,
} from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleModel, VehicleVersion } from '@/types'
import { useEffect, useState, type FormEvent } from 'react'

export function AdminVehiclesPage() {
  const [makers, setMakers] = useState<Manufacturer[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [makerId, setMakerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [modelName, setModelName] = useState('')
  const [year, setYear] = useState('')
  const [engine, setEngine] = useState('')
  const [versionName, setVersionName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const list = await adminListManufacturers()
        setMakers(list.filter((m) => m.status === 'active'))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!makerId) {
      setModels([])
      setModelId('')
      return
    }
    void adminListModels(makerId).then(setModels).catch((e) => setError(String(e)))
  }, [makerId])

  useEffect(() => {
    if (!modelId) {
      setVersions([])
      return
    }
    void adminListVersions(modelId).then(setVersions).catch((e) => setError(String(e)))
  }, [modelId])

  async function createModel(e: FormEvent) {
    e.preventDefault()
    if (!makerId) return
    try {
      await adminUpsertModel({ manufacturerId: makerId, name: modelName })
      setModelName('')
      setModels(await adminListModels(makerId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar modelo')
    }
  }

  async function createVersion(e: FormEvent) {
    e.preventDefault()
    if (!makerId || !modelId) return
    try {
      await adminUpsertVersion({
        manufacturerId: makerId,
        modelId,
        year: year.trim() ? Number(year) : null,
        engine: engine.trim() || null,
        versionName: versionName.trim() || null,
      })
      setYear('')
      setEngine('')
      setVersionName('')
      setVersions(await adminListVersions(modelId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar configuração')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-fal-navy">Veículos</h1>
      <p className="text-sm text-fal-muted">
        Hierarquia: Montadora → Modelo → Ano / Motor / Versão. Campos vazios ficam NULL (não inventar).
      </p>
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {loading ? <Loading /> : null}

      <label className="block max-w-md text-sm">
        <span className="mb-1 block font-semibold">Montadora</span>
        <select className="w-full rounded-[10px] border border-fal-line px-3 py-2" value={makerId} onChange={(e) => setMakerId(e.target.value)}>
          <option value="">Selecione</option>
          {makers.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>

      <form onSubmit={createModel} className="flex flex-wrap items-end gap-3 rounded-[14px] border border-fal-line bg-white p-4">
        <div className="min-w-[200px] flex-1">
          <Input label="Novo modelo" value={modelName} onChange={(e) => setModelName(e.target.value)} required disabled={!makerId} />
        </div>
        <Button type="submit" disabled={!makerId}>Criar modelo</Button>
      </form>

      <label className="block max-w-md text-sm">
        <span className="mb-1 block font-semibold">Modelo</span>
        <select className="w-full rounded-[10px] border border-fal-line px-3 py-2" value={modelId} onChange={(e) => setModelId(e.target.value)}>
          <option value="">Selecione</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>

      <form onSubmit={createVersion} className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-4">
        <Input label="Ano (opcional)" value={year} onChange={(e) => setYear(e.target.value)} disabled={!modelId} />
        <Input label="Motor (opcional)" value={engine} onChange={(e) => setEngine(e.target.value)} disabled={!modelId} />
        <Input label="Versão (opcional)" value={versionName} onChange={(e) => setVersionName(e.target.value)} disabled={!modelId} />
        <div className="flex items-end">
          <Button type="submit" disabled={!modelId}>Criar configuração</Button>
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
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className="border-t border-fal-line">
                <td className="px-3 py-2">{v.year ?? '—'}</td>
                <td className="px-3 py-2">{v.engine ?? '—'}</td>
                <td className="px-3 py-2">{v.versionName ?? '—'}</td>
                <td className="px-3 py-2">{v.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
