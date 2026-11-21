import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  placeholderVehicleImage,
  resolveVehicleDisplayImage,
} from '@/services/customers/vehicleImageResolver'
import {
  getMyVisualConfig,
  upsertVisualConfig,
} from '@/services/garage/vehicleVisualConfigService'
import type { CustomerSavedVehicle, ResolvedVehicleImage } from '@/types'
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
import { VehicleImageFrame } from '@/components/garage/VehicleImageFrame'
import { VehicleVisualizationEngine } from '@/components/garage/VehicleVisualizationEngine'
import {
  readVisualViewerMode,
  writeVisualViewerMode,
  type VisualViewerMode,
} from '@/lib/visualViewerPrefs'
import { canUseWebGL } from '@/lib/webglSupport'
import { isSmokeOrPlaceholderGlb } from '@/services/garage/visualizationEngine'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export function VehicleVisualPanel({
  vehicleIdentityId,
  membershipId,
  seedColorHex,
  vehicle,
}: {
  vehicleIdentityId: string
  membershipId: string
  seedColorHex?: string | null
  /** Para fallback 2D stock/placeholder quando não há GLB aprovado. */
  vehicle?: Pick<
    CustomerSavedVehicle,
    'id' | 'makerName' | 'modelName' | 'year' | 'colorHex' | 'primaryAssetId'
  >
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
  const [stockImage, setStockImage] = useState<ResolvedVehicleImage>(() =>
    placeholderVehicleImage(),
  )
  useEffect(() => {
    setWebglOk(canUseWebGL())
  }, [])

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
      const [row, preview, facts, asset, img] = await Promise.all([
        getMyVisualConfig(vehicleIdentityId),
        listVisualPartPreviews(membershipId),
        listVisualInstallFacts({ vehicleIdentityId, membershipId }),
        findApprovedVisualAssetForIdentity(vehicleIdentityId),
        vehicle
          ? resolveVehicleDisplayImage({ vehicle: vehicle as CustomerSavedVehicle })
          : Promise.resolve(placeholderVehicleImage()),
      ])
      if (row) setPayload(row.payload)
      setParts(preview)
      setInstallFacts(facts)
      setApprovedAsset(asset)
      setStockImage(img)
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar visual'), 'error')
    } finally {
      setLoading(false)
    }
  }, [vehicleIdentityId, membershipId, vehicle, toast])

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

  const realGlb =
    Boolean(approvedAsset) && !isSmokeOrPlaceholderGlb(approvedAsset?.code)
  const glbPaintLocked = realGlb && viewerPref === '3d'
  const show3dStage = viewerPref === '3d' && realGlb

  if (loading) return <Loading label="Carregando visualização…" />

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-fal-muted">
        Visualização do veículo. A aparência <strong>não altera</strong> o histórico técnico.
      </p>

      <VehicleImageFrame
        image={stockImage}
        colorHex={vehicle?.colorHex ?? payload.bodyColorHex}
        title={
          vehicle
            ? [vehicle.makerName, vehicle.modelName].filter(Boolean).join(' ')
            : 'Veículo'
        }
        className="min-h-[220px] sm:min-h-[300px]"
      />

      {!realGlb ? (
        <p className="m-0 text-xs text-fal-muted">
          Modelo 3D completo ainda não disponível para este veículo — usamos a imagem
          ilustrativa acima.
        </p>
      ) : null}

      {show3dStage ? (
        <VehicleVisualizationEngine
          payload={payload}
          modelParts={modelParts}
          orphanInstallCount={orphans.length}
          syncEnabled={syncInstall}
          preferredMode="3d"
          webglOk={webglOk}
          hasApprovedGlb={realGlb}
          approvedAsset={realGlb ? approvedAsset : null}
        />
      ) : null}

      <details className="rounded-fal border border-fal-line bg-fal-surface">
        <summary className="cursor-pointer list-none px-4 py-3 font-extrabold marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex min-h-10 items-center justify-between gap-2">
            Opções e aparência
            <span className="text-xs font-semibold text-fal-muted">abrir</span>
          </span>
        </summary>
        <div className="space-y-3 border-t border-fal-line px-4 py-3">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Modo de visualização"
          >
            <span className="text-xs font-semibold text-fal-muted" id="fal-visual-viewer-label">
              Modo:
            </span>
            {(
              [
                { id: '2d' as const, label: 'Imagem' },
                { id: '3d' as const, label: '3D', disabled: !realGlb },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                disabled={'disabled' in mode ? Boolean(mode.disabled) : false}
                aria-pressed={viewerPref === mode.id || (mode.id === '2d' && viewerPref === 'auto')}
                aria-describedby="fal-visual-viewer-label"
                className={`min-h-10 rounded-[10px] border px-3 text-sm font-bold disabled:opacity-50 ${
                  viewerPref === mode.id || (mode.id === '2d' && viewerPref === 'auto')
                    ? 'border-fal-accent bg-fal-accent/10 text-fal-fg'
                    : 'border-fal-line bg-fal-bg text-fal-muted'
                }`}
                onClick={() => setViewerMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
            {!realGlb ? (
              <span className="text-xs font-semibold text-fal-muted">
                3D disponível quando houver modelo aprovado
              </span>
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
              <span className="font-extrabold text-fal-fg">Espelhar peças instaladas</span>
              <span className="mt-0.5 block text-xs text-fal-muted">
                Mostra no modelo as instalações que você declarou. Não altera o histórico.
                {installFacts.length
                  ? ` · ${installFacts.length} instalação(ões)`
                  : ' · nenhuma ainda'}
              </span>
            </span>
          </label>

          <form
            onSubmit={onSave}
            className="grid gap-2 rounded-fal border border-fal-line bg-fal-bg/40 p-3 sm:grid-cols-2"
          >
            {glbPaintLocked ? (
              <p className="m-0 sm:col-span-2 text-xs text-fal-muted">
                Com modelo 3D, a pintura personalizada vale só na imagem/silhueta. O modelo 3D da
                biblioteca não muda de cor nesta versão — use o modo Imagem para ajustar cores.
              </p>
            ) : null}
            <fieldset disabled={glbPaintLocked} className="contents disabled:opacity-50">
              <label className="block text-sm font-semibold">
                Cor da carroceria
                <input
                  type="color"
                  className="mt-1 h-10 w-full cursor-pointer rounded-[10px] border border-fal-line bg-fal-bg disabled:cursor-not-allowed"
                  value={payload.bodyColorHex}
                  onChange={(ev) => patch({ bodyColorHex: ev.target.value })}
                />
              </label>
              <label className="block text-sm font-semibold">
                Cor de destaque
                <input
                  type="color"
                  className="mt-1 h-10 w-full cursor-pointer rounded-[10px] border border-fal-line bg-fal-bg disabled:cursor-not-allowed"
                  value={payload.accentHex}
                  onChange={(ev) => patch({ accentHex: ev.target.value })}
                />
              </label>
              <label className="block text-sm font-semibold">
                Rodas
                <select
                  className="mt-1 min-h-10 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm disabled:cursor-not-allowed"
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
                  className="mt-1 min-h-10 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm disabled:cursor-not-allowed"
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
            </fieldset>
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
      </details>

      {syncInstall && orphans.length > 0 ? (
        <section className="space-y-2">
          <h3 className="m-0 text-sm font-extrabold">Instalações sem peça vinculada</h3>
          <ul className="m-0 list-none space-y-1 p-0">
            {orphans.map((f) => (
              <li
                key={f.id}
                className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2 text-xs font-semibold text-fal-muted"
              >
                <span className="font-extrabold text-fal-fg">{f.title}</span>
                {' · '}
                {f.validationState}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="m-0 text-sm font-extrabold">Peças no visual</h3>
        {!parts.length ? (
          <EmptyState
            title="Nenhuma peça no modelo"
            description="Compras e instalações declaradas aparecem aqui só como prévia no visual 3D."
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
                    {syncInstall && mirroredKeys.has(p.key) ? ' · no visual' : ''}
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

    </div>
  )
}
