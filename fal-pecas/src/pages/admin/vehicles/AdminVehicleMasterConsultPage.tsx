import { VehicleMasterConsultPreview } from '@/components/admin/vehicles/VehicleMasterConsultPreview'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
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
  buildCandidatesFromFalCsvFile,
  buildCandidatesFromFipeXText,
  buildCandidatesFromIntelligenceRows,
} from '@/services/vehicles/vehicleMasterConsultService'
import {
  writeVehicleMasterSyncMeta,
  type VehicleMasterSyncMeta,
} from '@/services/vehicles/vehicleMasterSource'
import { useEffect, useMemo, useState } from 'react'
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
  const [models, setModels] = useState<FipeCodeName[]>([])
  const [years, setYears] = useState<FipeYearOption[]>([])
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [yearSelected, setYearSelected] = useState<Record<string, boolean>>({})
  const [demandaText, setDemandaText] = useState(demandaQ)

  useEffect(() => {
    if (demandaQ) {
      setMode('demanda')
      setDemandaText(demandaQ)
    }
  }, [demandaQ])

  const brandName = useMemo(
    () => brands.find((b) => b.code === brandId)?.name ?? '',
    [brands, brandId],
  )
  const modelName = useMemo(
    () => models.find((m) => m.code === modelId)?.name ?? '',
    [models, modelId],
  )

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

  async function onBrandChange(id: string) {
    setBrandId(id)
    setModelId('')
    setModels([])
    setYears([])
    setYearSelected({})
    if (!id) return
    setBusy(true)
    try {
      setModels(await fipeListModels(id))
    } catch (err) {
      setError(toUserMessage(err, 'Falha ao listar modelos FIPE'))
    } finally {
      setBusy(false)
    }
  }

  async function onModelChange(id: string) {
    setModelId(id)
    setYears([])
    setYearSelected({})
    if (!id || !brandId) return
    setBusy(true)
    try {
      setYears(await fipeListYears(brandId, id))
    } catch (err) {
      setError(toUserMessage(err, 'Falha ao listar anos FIPE'))
    } finally {
      setBusy(false)
    }
  }

  async function onFipeBuild() {
    const picked = years.filter((y) => yearSelected[y.code])
    if (!brandName || !modelName || !picked.length) {
      setError('Selecione marca, modelo e ao menos um ano.')
      return
    }
    const rows = fipeSelectionToIntelligenceRows({
      brandName,
      modelName,
      years: picked,
    })
    await loadDiff(() => buildCandidatesFromIntelligenceRows(rows))
  }

  async function onDemandaBuild() {
    const parts = demandaText.trim().split(/\s+/).filter(Boolean)
    if (parts.length < 2) {
      setError('Informe montadora e modelo (ex.: Volkswagen Gol 2018).')
      return
    }
    const yearMatch = demandaText.match(/(19|20)\d{2}/)
    const year = yearMatch?.[0] ?? ''
    const withoutYear = demandaText.replace(/(19|20)\d{2}/, '').trim()
    const toks = withoutYear.split(/\s+/).filter(Boolean)
    const montadora = toks[0] ?? ''
    const modelo = toks.slice(1).join(' ')
    if (!montadora || !modelo) {
      setError('Informe montadora e modelo.')
      return
    }
    await loadDiff(() =>
      buildCandidatesFromIntelligenceRows([
        {
          montadora,
          modelo,
          ano: year || String(new Date().getFullYear()),
          motor: '',
          versao: '',
          combustivel: '',
        },
      ]),
    )
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
        <div className="space-y-3 rounded-[14px] border border-fal-line bg-fal-surface p-4">
          <p className="m-0 text-sm text-fal-muted">
            Consulta pontual via API FIPE (Edge). Selecione anos e monte a prévia.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Marca"
              name="fipe-brand"
              placeholder="—"
              options={brands.map((b) => ({ value: b.code, label: b.name }))}
              value={brandId}
              disabled={busy}
              onChange={(e) => void onBrandChange(e.target.value)}
              onFocus={() => void ensureBrands()}
            />
            <Select
              label="Modelo"
              name="fipe-model"
              placeholder="—"
              options={models.map((m) => ({ value: m.code, label: m.name }))}
              value={modelId}
              disabled={busy || !brandId}
              onChange={(e) => void onModelChange(e.target.value)}
            />
          </div>
          {years.length ? (
            <div>
              <p className="m-0 text-sm font-semibold text-fal-fg">Anos / combustível</p>
              <ul className="mt-2 max-h-48 list-none space-y-1 overflow-y-auto p-0">
                {years.map((y) => (
                  <li key={y.code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(yearSelected[y.code])}
                      onChange={(e) =>
                        setYearSelected((prev) => ({ ...prev, [y.code]: e.target.checked }))
                      }
                    />
                    <span>
                      {y.year}
                      {y.fuel ? ` · ${y.fuel}` : ''}{' '}
                      <span className="text-fal-muted">({y.name})</span>
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
            Texto livre a partir de lookup catálogo 0 (ex.: Volkswagen Gol 2018).
          </p>
          <div className="mt-3">
            <Input
              label="Demanda"
              value={demandaText}
              onChange={(e) => setDemandaText(e.target.value)}
              placeholder="Montadora Modelo Ano"
              hint="Ex.: Volkswagen Gol 2018"
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

      {touchedModelIds.length ? (
        <div className="flex flex-wrap gap-2">
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
        />
      ) : null}
    </div>
  )
}
