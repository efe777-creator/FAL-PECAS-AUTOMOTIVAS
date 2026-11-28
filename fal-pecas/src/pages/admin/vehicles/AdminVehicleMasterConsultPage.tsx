import { VehicleMasterConsultPreview } from '@/components/admin/vehicles/VehicleMasterConsultPreview'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { setGuideBridge, VEHICLES_OPEN_GUIDE_KEY } from '@/lib/adminGuideBridges'
import { ADMIN_SEGMENT_OFF, ADMIN_SEGMENT_ON } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  fipeListBrands,
  fipeListModels,
  fipeListYears,
  fipeSelectionToIntelligenceRows,
  type FipeCodeName,
  type FipeYearOption,
} from '@/services/admin/fipeCatalogClient'
import type { MasterDiffCandidate, MasterDiffStatus } from '@/services/vehicles/diffVehicleMasterCandidates'
import {
  applySelectedMasterCandidates,
  buildCandidatesFromDemandaQuery,
  buildCandidatesFromFalCsvFile,
  buildCandidatesFromFipeXText,
  buildCandidatesFromIntelligenceRows,
} from '@/services/vehicles/vehicleMasterConsultService'
import {
  writeVehicleMasterSyncMeta,
  type VehicleMasterSyncMeta,
} from '@/services/vehicles/vehicleMasterSource'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

type Mode = 'arquivo' | 'fipe' | 'demanda'

function canConsult(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminVehicleMasterConsultPage() {
  useDocumentTitle('Consultar mestre | Admin FAL')
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const allowed = canConsult(user?.role)

  const demandaQ = searchParams.get('demanda')?.trim() || ''
  const [mode, setMode] = useState<Mode>(demandaQ ? 'demanda' : 'arquivo')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<MasterDiffCandidate[] | null>(null)
  const [statusFilter, setStatusFilter] = useState<MasterDiffStatus | ''>('')
  const [applyMsg, setApplyMsg] = useState<string | null>(null)
  const [touchedModelIds, setTouchedModelIds] = useState<string[]>([])

  const [brands, setBrands] = useState<FipeCodeName[]>([])
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([])
  const [brandFilter, setBrandFilter] = useState('')
  /** modelsByBrandId[brandId] = modelos FIPE daquela marca */
  const [modelsByBrandId, setModelsByBrandId] = useState<Record<string, FipeCodeName[]>>({})
  /** selectedModelKeys = `${brandId}::${modelId}` */
  const [selectedModelKeys, setSelectedModelKeys] = useState<string[]>([])
  const [modelFilter, setModelFilter] = useState('')
  /** yearsByModelKey[brandId::modelId] */
  const [yearsByModelKey, setYearsByModelKey] = useState<Record<string, FipeYearOption[]>>({})
  /** yearSelected[`${brandId}::${modelId}::${yearCode}`] */
  const [yearSelected, setYearSelected] = useState<Record<string, boolean>>({})
  const [loadingKeys, setLoadingKeys] = useState<Record<string, boolean>>({})
  const [demandaText, setDemandaText] = useState(demandaQ)
  const demandaAutoKey = useRef<string | null>(null)

  useEffect(() => {
    if (!demandaQ || !allowed) return
    setMode('demanda')
    setDemandaText(demandaQ)
    if (demandaAutoKey.current === demandaQ) return
    demandaAutoKey.current = demandaQ
    let cancelled = false
    ;(async () => {
      setBusy(true)
      setError(null)
      setApplyMsg(null)
      setTouchedModelIds([])
      setCandidates(null)
      try {
        const out = await buildCandidatesFromDemandaQuery(demandaQ)
        if (cancelled) return
        if (out.fileErrors.length) {
          setError(out.fileErrors.join(' · '))
          toast.push(out.fileErrors[0]!, 'error')
          return
        }
        if (!out.candidates.length) {
          setError('Nenhuma linha válida para comparar.')
          return
        }
        setCandidates(out.candidates)
        toast.push(
          `${out.candidates.length} candidato(s)${out.skipped ? ` · ${out.skipped} ignorados` : ''}`,
          'success',
        )
      } catch (err) {
        if (cancelled) return
        const msg = toUserMessage(err, 'Falha ao preparar prévia')
        setError(msg)
        toast.push(msg, 'error')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // toast estável o bastante; não colocar em deps (recria e cancela a busca).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ?demanda= / allowed
  }, [demandaQ, allowed])

  const filteredBrands = useMemo(() => {
    const q = brandFilter.trim().toLowerCase()
    if (!q) return brands
    return brands.filter((b) => b.name.toLowerCase().includes(q))
  }, [brands, brandFilter])

  const modelEntries = useMemo(() => {
    const q = modelFilter.trim().toLowerCase()
    const out: Array<{ key: string; brandId: string; brandName: string; model: FipeCodeName }> = []
    for (const bid of selectedBrandIds) {
      const bName = brands.find((b) => b.code === bid)?.name ?? bid
      for (const m of modelsByBrandId[bid] ?? []) {
        if (q && !m.name.toLowerCase().includes(q) && !bName.toLowerCase().includes(q)) continue
        out.push({ key: `${bid}::${m.code}`, brandId: bid, brandName: bName, model: m })
      }
    }
    return out
  }, [selectedBrandIds, modelsByBrandId, brands, modelFilter])

  const yearEntries = useMemo(() => {
    const out: Array<{
      key: string
      brandName: string
      modelName: string
      year: FipeYearOption
    }> = []
    for (const mk of selectedModelKeys) {
      const [bid, mid] = mk.split('::')
      const bName = brands.find((b) => b.code === bid)?.name ?? bid ?? ''
      const mName =
        (bid ? modelsByBrandId[bid] : undefined)?.find((m) => m.code === mid)?.name ?? mid ?? ''
      for (const y of yearsByModelKey[mk] ?? []) {
        out.push({
          key: `${mk}::${y.code}`,
          brandName: bName,
          modelName: mName,
          year: y,
        })
      }
    }
    return out
  }, [selectedModelKeys, yearsByModelKey, brands, modelsByBrandId])

  if (!allowed) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-fal-muted">Sem permissão para consultar o mestre.</p>
        <Link to="/admin/veiculos/integracoes">Voltar a Integrações</Link>
      </div>
    )
  }

  async function loadDiff(builder: () => Promise<{
    candidates: MasterDiffCandidate[]
    fileErrors: string[]
    skipped: number
  }>) {
    setBusy(true)
    setError(null)
    setApplyMsg(null)
    setTouchedModelIds([])
    try {
      const out = await builder()
      if (out.fileErrors.length) {
        setError(out.fileErrors.join(' · '))
        setCandidates(null)
        toast.push(out.fileErrors[0]!, 'error')
        return
      }
      if (!out.candidates.length) {
        setError('Nenhuma linha válida para comparar.')
        setCandidates(null)
        return
      }
      setCandidates(out.candidates)
      toast.push(
        `${out.candidates.length} candidato(s)${out.skipped ? ` · ${out.skipped} ignorados` : ''}`,
        'success',
      )
    } catch (err) {
      const msg = toUserMessage(err, 'Falha ao preparar prévia')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onFile(file: File) {
    const name = file.name.toLowerCase()
    const text = await file.text()
    // Heurística: dump fipeX costuma ter marca/modelo; CSV FAL tem Ano início.
    const looksFal =
      /ano\s*in[ií]cio/i.test(text.slice(0, 400)) ||
      /montadora,\s*modelo/i.test(text.slice(0, 200))
    if (looksFal || name.includes('mestre') || name.includes('fal')) {
      await loadDiff(() => buildCandidatesFromFalCsvFile(file))
    } else {
      await loadDiff(() => buildCandidatesFromFipeXText(text))
    }
  }

  async function ensureBrands() {
    if (brands.length) return
    setBusy(true)
    setError(null)
    try {
      setBrands(await fipeListBrands())
    } catch (err) {
      setError(toUserMessage(err, 'Falha ao listar marcas FIPE'))
    } finally {
      setBusy(false)
    }
  }

  async function toggleBrand(id: string, on: boolean) {
    if (!on) {
      setSelectedBrandIds((prev) => prev.filter((x) => x !== id))
      setSelectedModelKeys((prev) => prev.filter((k) => !k.startsWith(`${id}::`)))
      setYearsByModelKey((prev) => {
        const next = { ...prev }
        for (const k of Object.keys(next)) {
          if (k.startsWith(`${id}::`)) delete next[k]
        }
        return next
      })
      setYearSelected((prev) => {
        const next = { ...prev }
        for (const k of Object.keys(next)) {
          if (k.startsWith(`${id}::`)) delete next[k]
        }
        return next
      })
      return
    }
    setSelectedBrandIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    if (modelsByBrandId[id]?.length) return
    setLoadingKeys((prev) => ({ ...prev, [`brand:${id}`]: true }))
    setError(null)
    try {
      const list = await fipeListModels(id)
      setModelsByBrandId((prev) => ({ ...prev, [id]: list }))
    } catch (err) {
      setError(toUserMessage(err, 'Falha ao listar modelos FIPE'))
      setSelectedBrandIds((prev) => prev.filter((x) => x !== id))
    } finally {
      setLoadingKeys((prev) => {
        const next = { ...prev }
        delete next[`brand:${id}`]
        return next
      })
    }
  }

  async function toggleModel(brandId: string, modelId: string, on: boolean) {
    const key = `${brandId}::${modelId}`
    if (!on) {
      setSelectedModelKeys((prev) => prev.filter((x) => x !== key))
      setYearsByModelKey((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setYearSelected((prev) => {
        const next = { ...prev }
        for (const k of Object.keys(next)) {
          if (k.startsWith(`${key}::`)) delete next[k]
        }
        return next
      })
      return
    }
    setSelectedModelKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
    if (yearsByModelKey[key]?.length) return
    setLoadingKeys((prev) => ({ ...prev, [key]: true }))
    setError(null)
    try {
      const ys = await fipeListYears(brandId, modelId)
      setYearsByModelKey((prev) => ({ ...prev, [key]: ys }))
    } catch (err) {
      setError(toUserMessage(err, 'Falha ao listar anos FIPE'))
      setSelectedModelKeys((prev) => prev.filter((x) => x !== key))
    } finally {
      setLoadingKeys((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  async function onFipeBuild() {
    if (!selectedBrandIds.length || !selectedModelKeys.length) {
      setError('Marque ao menos uma montadora e um modelo.')
      return
    }
    const selections: Array<{ brandName: string; modelName: string; years: FipeYearOption[] }> = []
    for (const mk of selectedModelKeys) {
      const [bid, mid] = mk.split('::')
      if (!bid || !mid) continue
      const brandName = brands.find((b) => b.code === bid)?.name
      const modelName = modelsByBrandId[bid]?.find((m) => m.code === mid)?.name
      if (!brandName || !modelName) continue
      const ys = (yearsByModelKey[mk] ?? []).filter((y) => yearSelected[`${mk}::${y.code}`])
      if (ys.length) selections.push({ brandName, modelName, years: ys })
    }
    if (!selections.length) {
      setError('Marque ao menos um ano (por modelo).')
      return
    }
    const rows = fipeSelectionToIntelligenceRows({ selections })
    await loadDiff(() => buildCandidatesFromIntelligenceRows(rows))
  }

  async function onDemandaBuild() {
    const q = demandaText.trim()
    if (!q) {
      setError('Informe um termo (ex.: Gol, HB20 1.0, Volkswagen Gol 2018).')
      return
    }
    await loadDiff(() => buildCandidatesFromDemandaQuery(q))
  }

  async function onApply() {
    if (!candidates?.length) return
    setBusy(true)
    setError(null)
    setApplyMsg(null)
    try {
      const result = await applySelectedMasterCandidates(candidates)
      const meta: VehicleMasterSyncMeta = {
        at: new Date().toISOString(),
        upserted: result.upserted,
        productionMerged: result.productionMerged,
        errors: result.errors,
        skipped: result.skipped,
        source: 'consult_selective',
      }
      writeVehicleMasterSyncMeta(meta)
      setTouchedModelIds(result.modelIds)
      setApplyMsg(
        `Aplicado: ${result.upserted} upserts · ${result.productionMerged} vidas · ${result.skipped} fora da seleção · ${result.errors} erros.`,
      )
      toast.push(
        result.errors ? 'Apply com erros — veja o relatório.' : 'Mestre atualizado (selecionados).',
        result.errors ? 'error' : 'success',
      )
      if (result.messages.length) setError(result.messages.slice(0, 5).join(' · '))
    } catch (err) {
      const msg = toUserMessage(err, 'Falha ao aplicar selecionados')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  function openGuide(modelId: string) {
    setGuideBridge(VEHICLES_OPEN_GUIDE_KEY, modelId)
    navigate(`/admin/veiculos?model=${encodeURIComponent(modelId)}`)
  }

  function openCadastroReview() {
    navigate('/admin/veiculos?quality=review')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-0 text-[28px] font-extrabold text-fal-fg">Consultar e escolher</h1>
          <p className="m-0 text-sm text-fal-muted">
            Compare com o mestre, edite na lista, marque o que entra e grave só o selecionado. Sem
            PVC.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-semibold text-fal-fg"
            to="/admin/veiculos/integracoes"
          >
            Integrações
          </Link>
          <Link
            className="rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-semibold text-fal-fg"
            to="/admin/veiculos"
          >
            Veículos
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Origem da consulta">
        {(
          [
            ['arquivo', 'Arquivo'],
            ['fipe', 'FIPE'],
            ['demanda', 'Demanda'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={`min-h-11 rounded-[10px] border px-3 text-sm font-bold ${
              mode === id ? ADMIN_SEGMENT_ON : ADMIN_SEGMENT_OFF
            }`}
            onClick={() => {
              setMode(id)
              if (id === 'fipe') void ensureBrands()
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'arquivo' ? (
        <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
          <p className="m-0 text-sm text-fal-muted">
            CSV FAL (Montadora, Modelo, …) ou dump fipeX. Prévia com seleção antes de gravar.
          </p>
          <input
            className="mt-3 block w-full text-sm"
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
              e.target.value = ''
            }}
          />
        </div>
      ) : null}

      {mode === 'fipe' ? (
        <div
          className="space-y-3 rounded-[14px] border border-fal-line bg-fal-surface p-4"
          onFocusCapture={() => void ensureBrands()}
        >
          <p className="m-0 text-sm text-fal-muted">
            Marque várias montadoras e modelos + anos → Montar prévia. “Comfortline / Highline”
            vira duas linhas. Identificação: 1.0 / 8V / 16V / Turbo = motor · Tiggo 5X = modelo ·
            trim = versão · 4x4/AWD = tração.
          </p>
          <div>
            <Input
              label="Filtrar montadoras"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              placeholder="Ex.: Volkswagen, Hyundai…"
              onFocus={() => void ensureBrands()}
            />
            <ul className="mt-2 max-h-40 list-none space-y-1 overflow-y-auto p-0">
              {filteredBrands.map((b) => {
                const on = selectedBrandIds.includes(b.code)
                const loading = Boolean(loadingKeys[`brand:${b.code}`])
                return (
                  <li key={b.code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={busy || loading}
                      onChange={(e) => void toggleBrand(b.code, e.target.checked)}
                    />
                    <span>
                      {b.name}
                      {loading ? <span className="text-fal-muted"> · carregando…</span> : null}
                    </span>
                  </li>
                )
              })}
              {!brands.length && !busy ? (
                <li className="text-sm text-fal-muted">Foque aqui ou clique para carregar marcas.</li>
              ) : null}
            </ul>
          </div>
          {selectedBrandIds.length ? (
            <div>
              <Input
                label="Filtrar modelos (todas as montadoras marcadas)"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                placeholder="Ex.: HB20, Gol…"
              />
              <ul className="mt-2 max-h-48 list-none space-y-1 overflow-y-auto p-0">
                {modelEntries.map((entry) => {
                  const on = selectedModelKeys.includes(entry.key)
                  const loading = Boolean(loadingKeys[entry.key])
                  return (
                    <li key={entry.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={busy || loading}
                        onChange={(e) =>
                          void toggleModel(entry.brandId, entry.model.code, e.target.checked)
                        }
                      />
                      <span>
                        <span className="text-fal-muted">{entry.brandName} · </span>
                        {entry.model.name}
                        {loading ? <span className="text-fal-muted"> · anos…</span> : null}
                      </span>
                    </li>
                  )
                })}
                {!modelEntries.length ? (
                  <li className="text-sm text-fal-muted">
                    {Object.keys(loadingKeys).some((k) => k.startsWith('brand:'))
                      ? 'Carregando modelos…'
                      : 'Nenhum modelo (ajuste o filtro ou as montadoras).'}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
          {yearEntries.length ? (
            <div>
              <p className="m-0 text-sm font-semibold text-fal-fg">
                Montadora · Modelo · Ano · Combustível
              </p>
              <ul className="mt-2 max-h-56 list-none space-y-1 overflow-y-auto p-0">
                {yearEntries.map((entry) => (
                  <li key={entry.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(yearSelected[entry.key])}
                      onChange={(e) =>
                        setYearSelected((prev) => ({
                          ...prev,
                          [entry.key]: e.target.checked,
                        }))
                      }
                    />
                    <span>
                      {entry.brandName} · {entry.modelName} · {entry.year.year}
                      {entry.year.fuel ? ` · ${entry.year.fuel}` : ''}{' '}
                      <span className="text-fal-muted">({entry.year.name})</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                className="mt-2"
                disabled={busy}
                onClick={() => void onFipeBuild()}
              >
                Montar prévia
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'demanda' ? (
        <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
          <p className="m-0 text-sm text-fal-muted">
            Qualquer termo: montadora, modelo, motor, versão ou combustível. Um só termo basta (ex.:
            Gol).
          </p>
          <div className="mt-3">
            <Input
              label="Demanda"
              value={demandaText}
              onChange={(e) => setDemandaText(e.target.value)}
              placeholder="Ex.: Gol, HB20, 1.0, Comfortline, Volkswagen"
              hint="Qualquer termo — não precisa montadora+modelo"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onDemandaBuild()
                }
              }}
            />
          </div>
          <Button
            type="button"
            className="mt-3"
            disabled={busy}
            onClick={() => void onDemandaBuild()}
          >
            Comparar com mestre
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {applyMsg ? <p className="text-sm text-fal-success">{applyMsg}</p> : null}
      {busy ? <p className="text-sm text-fal-muted">Processando…</p> : null}

      {touchedModelIds.length || applyMsg ? (
        <div className="flex flex-wrap gap-2">
          {applyMsg ? (
            <Button type="button" variant="light" size="sm" onClick={openCadastroReview}>
              Ver no cadastro
            </Button>
          ) : null}
          {touchedModelIds.slice(0, 8).map((id) => (
            <Button key={id} type="button" variant="light" size="sm" onClick={() => openGuide(id)}>
              Abrir guia
            </Button>
          ))}
        </div>
      ) : null}

      {candidates ? (
        <VehicleMasterConsultPreview
          rows={candidates}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onChange={setCandidates}
          onApply={() => void onApply()}
          busy={busy}
          allowed={allowed}
          onAssistMessage={(msg, kind) => toast.push(msg, kind === 'error' ? 'error' : 'success')}
        />
      ) : null}
    </div>
  )
}
