import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { formatVehicleAppYear } from '@/lib/vehicleAppYear'
import {
  adminAddApplicationsBulk,
  adminFindProductIdBySku,
  adminListApplicationsGlobal,
  adminRemoveApplication,
  adminRemoveApplicationsBulk,
  adminUpdateApplicationYears,
  type AdminApplicationRow,
} from '@/services/admin/adminApplicationService'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleModel, VehicleVersion } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

function canManage(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

function parseYear(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t)
  if (!Number.isInteger(n) || n < 1950 || n > 2100) return null
  return n
}

export function AdminApplicationsPage() {
  const { user } = useAuth()
  const allowed = canManage(user?.role)
  const [searchParams, setSearchParams] = useSearchParams()

  const [rows, setRows] = useState<AdminApplicationRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [qDebounced, setQDebounced] = useState(q)
  const [makerId, setMakerId] = useState(searchParams.get('maker') ?? '')
  const [modelId, setModelId] = useState(searchParams.get('model') ?? '')
  const [engineFilter, setEngineFilter] = useState(searchParams.get('engine') ?? '')
  const [versionFilter, setVersionFilter] = useState(searchParams.get('versao') ?? '')

  const [makers, setMakers] = useState<Manufacturer[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createSku, setCreateSku] = useState('')
  const [createMakerId, setCreateMakerId] = useState('')
  const [createModelId, setCreateModelId] = useState('')
  const [createEngine, setCreateEngine] = useState('')
  const [createVersion, setCreateVersion] = useState('')
  const [createYearStart, setCreateYearStart] = useState('')
  const [createYearEnd, setCreateYearEnd] = useState('')
  const [createModels, setCreateModels] = useState<VehicleModel[]>([])
  const [createVersions, setCreateVersions] = useState<VehicleVersion[]>([])

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 250)
    return () => window.clearTimeout(t)
  }, [q])

  useEffect(() => {
    void adminListManufacturers().then((list) =>
      setMakers(list.filter((m) => m.status === 'active')),
    )
  }, [])

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
      setVersionFilter('')
      return
    }
    void adminListVersions(modelId).then(setVersions)
  }, [modelId])

  useEffect(() => {
    if (!createMakerId) {
      setCreateModels([])
      setCreateModelId('')
      return
    }
    void adminListModels(createMakerId).then(setCreateModels)
  }, [createMakerId])

  useEffect(() => {
    if (!createModelId) {
      setCreateVersions([])
      setCreateEngine('')
      setCreateVersion('')
      return
    }
    void adminListVersions(createModelId).then(setCreateVersions)
  }, [createModelId])

  const engineOptions = useMemo(() => {
    const set = new Set<string>()
    for (const v of versions) {
      const e = (v.engine ?? '').trim()
      if (e) set.add(e)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [versions])

  const versionOptions = useMemo(() => {
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

  const createEngineOptions = useMemo(() => {
    const set = new Set<string>()
    for (const v of createVersions) {
      const e = (v.engine ?? '').trim()
      if (e) set.add(e)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [createVersions])

  const createVersionOptions = useMemo(() => {
    const filtered = createEngine
      ? createVersions.filter((v) => (v.engine ?? '').trim() === createEngine)
      : createVersions
    const set = new Set<string>()
    for (const v of filtered) {
      const name = (v.versionName ?? '').trim()
      if (name) set.add(name)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [createVersions, createEngine])

  const matchingCreateVersions = useMemo(() => {
    return createVersions.filter((v) => {
      if (createEngine && (v.engine ?? '').trim() !== createEngine) return false
      if (createVersion && (v.versionName ?? '').trim() !== createVersion) return false
      return true
    })
  }, [createVersions, createEngine, createVersion])

  const productIdFilter = searchParams.get('productId') || ''

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const { rows: list, total: n } = await adminListApplicationsGlobal({
        q: qDebounced || undefined,
        manufacturerId: makerId || undefined,
        modelId: modelId || undefined,
        engine: engineFilter || undefined,
        versionName: versionFilter || undefined,
        productId: productIdFilter || undefined,
        limit: 250,
      })
      setRows(list)
      setTotal(n)
      setSelected(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar aplicações')
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (qDebounced) p.set('q', qDebounced)
        else p.delete('q')
        if (makerId) p.set('maker', makerId)
        else p.delete('maker')
        if (modelId) p.set('model', modelId)
        else p.delete('model')
        if (engineFilter) p.set('engine', engineFilter)
        else p.delete('engine')
        if (versionFilter) p.set('versao', versionFilter)
        else p.delete('versao')
        return p
      },
      { replace: true },
    )
  }, [qDebounced, makerId, modelId, engineFilter, versionFilter, setSearchParams])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, makerId, modelId, engineFilter, versionFilter, productIdFilter])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    if (selected.size === rows.length) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(rows.map((r) => r.id)))
  }

  async function onSavePeriod(row: AdminApplicationRow) {
    const ys = parseYear(editStart)
    const ye = parseYear(editEnd)
    if (editStart.trim() && ys == null) {
      setError('Ano início inválido')
      return
    }
    if (editEnd.trim() && ye == null) {
      setError('Ano fim inválido')
      return
    }
    if (ys != null && ye != null && ye < ys) {
      setError('Ano fim menor que ano início')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await adminUpdateApplicationYears(row.id, { yearStart: ys, yearEnd: ye })
      setEditingId(null)
      setInfo('Período atualizado.')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar período')
    } finally {
      setBusy(false)
    }
  }

  async function onDeleteOne(id: string) {
    if (!window.confirm('Excluir esta aplicação?')) return
    setBusy(true)
    setError(null)
    try {
      await adminRemoveApplication(id)
      setInfo('Aplicação excluída.')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao excluir')
    } finally {
      setBusy(false)
    }
  }

  async function onDeleteSelected() {
    if (!selected.size) return
    if (!window.confirm(`Excluir ${selected.size} aplicação(ões)?`)) return
    setBusy(true)
    setError(null)
    try {
      const n = await adminRemoveApplicationsBulk([...selected])
      setInfo(`${n} aplicação(ões) excluída(s).`)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao excluir seleção')
    } finally {
      setBusy(false)
    }
  }

  async function onCreate() {
    setError(null)
    setInfo(null)
    const sku = createSku.trim()
    if (!sku) {
      setError('Informe o código (SKU) do produto')
      return
    }
    if (!createModelId) {
      setError('Selecione montadora e modelo')
      return
    }
    if (matchingCreateVersions.length === 0) {
      setError('Nenhuma configuração bate com motorização/versão')
      return
    }
    const ys = parseYear(createYearStart)
    const ye = parseYear(createYearEnd)
    if (createYearStart.trim() && ys == null) {
      setError('Ano início inválido')
      return
    }
    if (createYearEnd.trim() && ye == null) {
      setError('Ano fim inválido')
      return
    }
    if (ys != null && ye != null && ye < ys) {
      setError('Ano fim menor que ano início')
      return
    }
    setBusy(true)
    try {
      const productId = await adminFindProductIdBySku(sku)
      if (!productId) {
        setError(`Produto não encontrado: ${sku}`)
        return
      }
      const n = await adminAddApplicationsBulk(
        productId,
        matchingCreateVersions.map((v) => v.id),
        { yearStart: ys, yearEnd: ye },
      )
      setInfo(`${n} aplicação(ões) criada(s) para ${sku}.`)
      setCreateOpen(false)
      setCreateSku('')
      setQ(sku)
      setQDebounced(sku)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar aplicação')
    } finally {
      setBusy(false)
    }
  }

  if (!allowed) {
    return (
      <p className="text-sm text-red-600">
        Somente administrador ou gerente podem gerenciar aplicações.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-navy">Aplicações</h1>
          <p className="mt-1 max-w-2xl text-sm text-fal-muted">
            Controle as compatibilidades produto × veículo (incluindo as da importação): criar,
            editar período e excluir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/produtos/importar-aplicacoes">
            <Button type="button" variant="light">
              Importar planilha
            </Button>
          </Link>
          <Button type="button" variant="primary" onClick={() => setCreateOpen((v) => !v)}>
            {createOpen ? 'Fechar formulário' : '+ Nova aplicação'}
          </Button>
        </div>
      </div>

      {createOpen ? (
        <div className="space-y-3 rounded-[14px] border border-fal-yellow-dark bg-white p-4 ring-2 ring-fal-yellow/30">
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">Nova aplicação</h2>
          <p className="m-0 text-xs text-fal-muted">
            Motorização ou versão vazia = todas as configs elegíveis (
            {matchingCreateVersions.length}).
          </p>
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
            <Input
              label="Código (SKU)"
              value={createSku}
              onChange={(e) => setCreateSku(e.target.value)}
              placeholder="Código do produto"
            />
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Montadora</span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-3"
                value={createMakerId}
                onChange={(e) => setCreateMakerId(e.target.value)}
              >
                <option value="">Selecione</option>
                {makers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Modelo</span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-3"
                value={createModelId}
                onChange={(e) => setCreateModelId(e.target.value)}
                disabled={!createMakerId}
              >
                <option value="">Selecione</option>
                {createModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Motorização</span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-3"
                value={createEngine}
                onChange={(e) => {
                  setCreateEngine(e.target.value)
                  setCreateVersion('')
                }}
                disabled={!createModelId}
              >
                <option value="">Todas</option>
                {createEngineOptions.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Versão</span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-3"
                value={createVersion}
                onChange={(e) => setCreateVersion(e.target.value)}
                disabled={!createModelId}
              >
                <option value="">Todas</option>
                {createVersionOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Ano início"
              inputMode="numeric"
              value={createYearStart}
              onChange={(e) => setCreateYearStart(e.target.value)}
            />
            <Input
              label="Ano fim"
              inputMode="numeric"
              value={createYearEnd}
              onChange={(e) => setCreateYearEnd(e.target.value)}
              hint="Vazio = vigente"
            />
          </div>
          <Button
            type="button"
            disabled={busy || !createModelId || matchingCreateVersions.length === 0}
            onClick={() => void onCreate()}
          >
            Criar {matchingCreateVersions.length > 1 ? `(${matchingCreateVersions.length})` : ''}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-[14px] border border-fal-line bg-white p-4">
        <div className="min-w-[180px] flex-1">
          <Input
            label="Buscar (SKU / nome / veículo)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código ou montadora…"
          />
        </div>
        <label className="block min-w-[140px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Montadora</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={makerId}
            onChange={(e) => setMakerId(e.target.value)}
          >
            <option value="">Todas</option>
            {makers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[140px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Modelo</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={!makerId}
          >
            <option value="">Todos</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[120px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Motorização</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={engineFilter}
            onChange={(e) => {
              setEngineFilter(e.target.value)
              setVersionFilter('')
            }}
            disabled={!modelId}
          >
            <option value="">Todas</option>
            {engineOptions.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[120px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Versão</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={versionFilter}
            onChange={(e) => setVersionFilter(e.target.value)}
            disabled={!modelId}
          >
            <option value="">Todas</option>
            {versionOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="light"
          onClick={() => {
            setQ('')
            setQDebounced('')
            setMakerId('')
            setModelId('')
            setEngineFilter('')
            setVersionFilter('')
          }}
        >
          Limpar
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-700">{info}</p> : null}

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm">
          <span className="font-semibold text-fal-navy">{selected.size} selecionada(s)</span>
          <Button type="button" variant="light" disabled={busy} onClick={() => void onDeleteSelected()}>
            Excluir seleção
          </Button>
        </div>
      ) : null}

      {loading ? <Loading label="Carregando aplicações…" /> : null}

      {!loading ? (
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-fal-line bg-fal-bg text-fal-muted">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAllVisible}
                    aria-label="Selecionar todas"
                  />
                </th>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Montadora</th>
                <th className="px-3 py-2">Modelo</th>
                <th className="px-3 py-2">Motor</th>
                <th className="px-3 py-2">Versão</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6">
                    <EmptyState
                      title="Nenhuma aplicação encontrada"
                      description="Importe uma planilha ou crie manualmente com + Nova aplicação."
                    >
                      <div className="mt-4 flex justify-center gap-3">
                        <Link
                          className="font-semibold text-fal-navy underline"
                          to="/admin/produtos/importar-aplicacoes"
                        >
                          Importar
                        </Link>
                        <button
                          type="button"
                          className="font-semibold text-fal-navy underline"
                          onClick={() => setCreateOpen(true)}
                        >
                          Criar
                        </button>
                      </div>
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const period =
                    formatVehicleAppYear({
                      yearStart: row.yearStart,
                      yearEnd: row.yearEnd,
                      versionYear: row.versionYear,
                    }) ?? '—'
                  const isEditing = editingId === row.id
                  return (
                    <tr key={row.id} className="border-b border-fal-line/70">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          aria-label={`Selecionar ${row.productSku}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          className="font-semibold text-fal-navy underline"
                          to={`/admin/produtos/${row.productId}`}
                        >
                          {row.productSku || '—'}
                        </Link>
                        <div className="text-xs text-fal-muted">{row.productName}</div>
                      </td>
                      <td className="px-3 py-2">{row.makerName ?? '—'}</td>
                      <td className="px-3 py-2">{row.modelName ?? '—'}</td>
                      <td className="px-3 py-2">{row.engine || '—'}</td>
                      <td className="px-3 py-2">{row.versionName || '—'}</td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              className="w-16 rounded border border-fal-line px-1 py-0.5 text-xs"
                              inputMode="numeric"
                              placeholder="Início"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                            />
                            <span className="text-fal-muted">→</span>
                            <input
                              className="w-16 rounded border border-fal-line px-1 py-0.5 text-xs"
                              inputMode="numeric"
                              placeholder="Fim"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                            />
                          </div>
                        ) : (
                          period
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="font-semibold text-fal-navy underline disabled:opacity-50"
                                disabled={busy}
                                onClick={() => void onSavePeriod(row)}
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                className="font-semibold text-fal-muted underline"
                                onClick={() => setEditingId(null)}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="font-semibold text-fal-navy underline"
                              onClick={() => {
                                setEditingId(row.id)
                                setEditStart(row.yearStart != null ? String(row.yearStart) : '')
                                setEditEnd(row.yearEnd != null ? String(row.yearEnd) : '')
                              }}
                            >
                              Editar
                            </button>
                          )}
                          <button
                            type="button"
                            className="font-semibold text-red-700 underline disabled:opacity-50"
                            disabled={busy}
                            onClick={() => void onDeleteOne(row.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <div className="border-t border-fal-line px-3 py-2 text-xs text-fal-muted">
            Exibindo {rows.length} de {total} (lote máx. 250). Refine os filtros se necessário.
          </div>
        </div>
      ) : null}
    </div>
  )
}
