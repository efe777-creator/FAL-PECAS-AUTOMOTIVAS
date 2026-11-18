import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  getMyVisualConfig,
  upsertVisualConfig,
} from '@/services/garage/vehicleVisualConfigService'
import {
  listVisualPartPreviews,
  VISUAL_PART_STATE_LABEL,
  type VisualPartPreview,
} from '@/services/garage/vehicleVisualPartPreview'
import {
  DEFAULT_VISUAL_PAYLOAD,
  FINISH_LABEL,
  WHEEL_STYLE_LABEL,
  type VehicleVisualPayload,
  type VisualFinish,
  type VisualWheelStyle,
} from '@/services/garage/vehicleVisualTypes'
import {
  orphanInstallFacts,
  partsForModelReflection,
  type VisualInstallFact,
} from '@/services/garage/visualInstallSync'
import { findApprovedVisualAssetForIdentity } from '@/services/garage/vehicleVisualAssetService'
import type { VehicleVisualAsset } from '@/services/garage/vehicleVisualAssetTypes'
import { listVisualInstallFacts } from '@/services/garage/visualInstallSyncService'
import {
  readSyncInstallEnabled,
  writeSyncInstallEnabled,
} from '@/lib/visualInstallSyncPrefs'
import { VehicleVisualizationEngine } from '@/components/garage/VehicleVisualizationEngine'
import {
  readVisualViewerMode,
  writeVisualViewerMode,
  type VisualViewerMode,
} from '@/lib/visualViewerPrefs'
import {
  isVisualXrEnvEnabled,
  readVisualXrUserOptIn,
  writeVisualXrUserOptIn,
} from '@/lib/visualXrGate'
import { canUseWebGL } from '@/lib/webglSupport'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export function VehicleVisualPanel({
  vehicleIdentityId,
  membershipId,
  seedColorHex,
}: {
  vehicleIdentityId: string
  membershipId: string
  seedColorHex?: string | null
}) {
  const toast = useToast()
  const [payload, setPayload] = useState<VehicleVisualPayload>(() => ({
    ...DEFAULT_VISUAL_PAYLOAD,
    bodyColorHex:
      seedColorHex && /^#[0-9A-Fa-f]{6}$/.test(seedColorHex)
        ? seedColorHex
        : DEFAULT_VISUAL_PAYLOAD.bodyColorHex,
  }))
  const [parts, setParts] = useState<VisualPartPreview[]>([])
  const [installFacts, setInstallFacts] = useState<VisualInstallFact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewerPref, setViewerPref] = useState<VisualViewerMode>(() => readVisualViewerMode())
  const [syncInstall, setSyncInstall] = useState(() => readSyncInstallEnabled())
  const [webglOk, setWebglOk] = useState(false)
  const [approvedAsset, setApprovedAsset] = useState<VehicleVisualAsset | null>(null)
  const [xrEnvOn] = useState(() => isVisualXrEnvEnabled())
  const [xrOptIn, setXrOptIn] = useState(() => readVisualXrUserOptIn())

  useEffect(() => {
    setWebglOk(canUseWebGL())
  }, [])

  function toggleXrOptIn(next: boolean) {
    setXrOptIn(next)
    writeVisualXrUserOptIn(next)
  }

  const modelParts = useMemo(
    () => partsForModelReflection(parts, installFacts, syncInstall),
    [parts, installFacts, syncInstall],
  )
  const orphans = useMemo(
    () => (syncInstall ? orphanInstallFacts(installFacts, parts) : []),
    [syncInstall, installFacts, parts],
  )
  const mirroredKeys = useMemo(() => new Set(modelParts.map((p) => p.key)), [modelParts])

  function setViewerMode(mode: VisualViewerMode) {
    setViewerPref(mode)
    writeVisualViewerMode(mode)
  }

  function toggleSyncInstall(next: boolean) {
    setSyncInstall(next)
    writeSyncInstallEnabled(next)
  }

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [row, preview, facts, asset] = await Promise.all([
        getMyVisualConfig(vehicleIdentityId),
        listVisualPartPreviews(membershipId),
        listVisualInstallFacts({ vehicleIdentityId, membershipId }),
        findApprovedVisualAssetForIdentity(vehicleIdentityId),
      ])
      if (row) setPayload(row.payload)
      setParts(preview)
      setInstallFacts(facts)
      setApprovedAsset(asset)
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar visual'), 'error')
    } finally {
      setLoading(false)
    }
  }, [vehicleIdentityId, membershipId, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  function patch(p: Partial<VehicleVisualPayload>) {
    setPayload((prev) => ({ ...prev, ...p }))
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await upsertVisualConfig({
        vehicleIdentityId,
        payload,
        visibility: 'private_owner',
      })
      toast.push('Aparência salva (não altera histórico técnico)', 'success')
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao salvar visual'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando aparência…" />

  return (
    <div className="space-y-4">
      <p className="m-0 text-xs text-fal-muted">
        Camada visual (2B). O <strong>Visualization Engine</strong> escolhe 2D, 3D procedural ou
        GLB aprovado (e XR só com gate). Pintura/preview <strong>não</strong> criam fato 2A. Sync
        instalação e XR são opt-in.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-fal-muted">Viewer:</span>
        {(['auto', '2d', '3d'] as VisualViewerMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`rounded-[8px] border px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
              viewerPref === mode
                ? 'border-fal-accent bg-fal-accent/10 text-fal-fg'
                : 'border-fal-line bg-fal-bg text-fal-muted'
            }`}
            onClick={() => setViewerMode(mode)}
          >
            {mode}
          </button>
        ))}
        {!webglOk ? (
          <span className="text-[11px] font-semibold text-fal-muted">WebGL indisponível · 2D</span>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-fal border border-fal-line bg-fal-bg/40 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={syncInstall}
          onChange={(ev) => toggleSyncInstall(ev.target.checked)}
        />
        <span>
          <span className="font-extrabold text-fal-fg">Refletir instalações 2A no modelo</span>
          <span className="mt-0.5 block text-xs text-fal-muted">
            Opt-in. Lê G7 `installed_declared` + eventos `instalacao` (exceto rejeitado/contestado).
            Não cria nem altera histórico técnico.
            {installFacts.length
              ? ` · ${installFacts.length} fato(s) elegível(is)`
              : ' · nenhum fato de instalação ainda'}
          </span>
        </span>
      </label>

      {xrEnvOn ? (
        <label className="flex cursor-pointer items-start gap-2 rounded-fal border border-fal-accent/40 bg-fal-accent/5 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={xrOptIn}
            onChange={(ev) => toggleXrOptIn(ev.target.checked)}
          />
          <span>
            <span className="font-extrabold text-fal-fg">XR experimental (Fase C)</span>
            <span className="mt-0.5 block text-xs text-fal-muted">
              Opt-in local. Requer dispositivo com WebXR. Não altera histórico técnico. Default off.
              {xrOptIn ? ' · ativo nesta máquina' : ' · desligado'}
            </span>
          </span>
        </label>
      ) : null}

      <VehicleVisualizationEngine
        key={`xr-${xrOptIn ? '1' : '0'}`}
        payload={payload}
        modelParts={modelParts}
        orphanInstallCount={orphans.length}
        syncEnabled={syncInstall}
        preferredMode={viewerPref}
        webglOk={webglOk}
        hasApprovedGlb={Boolean(approvedAsset)}
        approvedAsset={approvedAsset}
      />

      {syncInstall && orphans.length > 0 ? (
        <section className="space-y-2">
          <h3 className="m-0 text-sm font-extrabold">Instalações 2A no modelo (sem peça G7)</h3>
          <ul className="m-0 list-none space-y-1 p-0">
            {orphans.map((f) => (
              <li
                key={f.id}
                className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2 text-xs font-semibold text-fal-muted"
              >
                <span className="font-extrabold text-fal-fg">{f.title}</span>
                {' · '}
                {f.validationState}
                {' · espelho visual'}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="m-0 text-sm font-extrabold">Peças FAL no veículo (preview)</h3>
        {!parts.length ? (
          <EmptyState
            title="Nenhuma peça FAL vinculada"
            description="Compras/associações G7 aparecem aqui só para preview — declare instalação no pedido ou no histórico."
          />
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {parts.map((p) => (
              <li
                key={p.key}
                className="flex gap-2 rounded-fal border border-fal-line bg-fal-bg/40 p-2"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-[8px] object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-fal-surface text-[10px] font-bold text-fal-muted">
                    FAL
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-extrabold text-fal-fg">{p.name}</p>
                  <p className="m-0 text-xs font-semibold text-fal-muted">
                    {VISUAL_PART_STATE_LABEL[p.state]}
                    {p.sku ? ` · ${p.sku}` : ''}
                    {syncInstall && mirroredKeys.has(p.key) ? ' · no modelo (2A)' : ''}
                  </p>
                  {p.orderId ? (
                    <Link
                      to={`/conta/pedidos/${p.orderId}`}
                      className="text-[11px] font-semibold text-fal-accent underline-offset-2 hover:underline"
                    >
                      Ver pedido
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        onSubmit={onSave}
        className="grid gap-2 rounded-fal border border-fal-line bg-fal-surface p-3 sm:grid-cols-2"
      >
        <label className="block text-sm font-semibold">
          Cor da carroceria
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded-[10px] border border-fal-line bg-fal-bg"
            value={payload.bodyColorHex}
            onChange={(ev) => patch({ bodyColorHex: ev.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Cor de destaque
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded-[10px] border border-fal-line bg-fal-bg"
            value={payload.accentHex}
            onChange={(ev) => patch({ accentHex: ev.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Rodas
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
            value={payload.wheelStyle}
            onChange={(ev) => patch({ wheelStyle: ev.target.value as VisualWheelStyle })}
          >
            {(Object.keys(WHEEL_STYLE_LABEL) as VisualWheelStyle[]).map((k) => (
              <option key={k} value={k}>
                {WHEEL_STYLE_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Acabamento
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
            value={payload.finish}
            onChange={(ev) => patch({ finish: ev.target.value as VisualFinish })}
          >
            {(Object.keys(FINISH_LABEL) as VisualFinish[]).map((k) => (
              <option key={k} value={k}>
                {FINISH_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Apelido visual (opcional)"
          value={payload.label}
          onChange={(ev) => patch({ label: ev.target.value })}
        />
        <Input
          label="Notas visuais"
          value={payload.notes}
          onChange={(ev) => patch({ notes: ev.target.value })}
        />
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={saving}>
            Salvar aparência
          </Button>
        </div>
      </form>
    </div>
  )
}
