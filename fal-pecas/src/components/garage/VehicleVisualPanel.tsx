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
  readVisualViewerMode,
  resolveViewerMode,
  writeVisualViewerMode,
  type VisualViewerMode,
} from '@/lib/visualViewerPrefs'
import { canUseWebGL } from '@/lib/webglSupport'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const VehicleViewer3D = lazy(() => import('./VehicleViewer3D'))

/** Silhueta 2D SVG — sem WebGL/Three. Marcadores = preview G7 (não criam fato). */
function VehicleSilhouette2D({
  payload,
  parts,
}: {
  payload: VehicleVisualPayload
  parts: VisualPartPreview[]
}) {
  const body = payload.bodyColorHex
  const accent = payload.accentHex
  const opacity =
    payload.finish === 'matte' ? 0.92 : payload.finish === 'metallic' ? 0.88 : 1
  const wheelR = payload.wheelStyle === 'sport' ? 18 : payload.wheelStyle === 'offroad' ? 20 : 16
  const installedCount = parts.filter((p) => p.state === 'instalada').length
  const pendingCount = parts.filter((p) => p.state !== 'instalada').length

  return (
    <div className="overflow-hidden rounded-fal border border-fal-line bg-gradient-to-b from-fal-bg to-fal-surface p-4">
      <svg
        viewBox="0 0 320 140"
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label="Pré-visualização 2D do veículo"
      >
        <defs>
          <linearGradient id="fal-body-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={payload.finish === 'metallic' ? 0.35 : 0.12} />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {/* sombra */}
        <ellipse cx="160" cy="118" rx="110" ry="8" fill="#000" opacity="0.12" />
        {/* carroceria */}
        <g opacity={opacity}>
          <path
            d="M48 88 L72 62 Q90 48 120 46 L200 46 Q240 48 262 66 L278 88 Z"
            fill={body}
          />
          <path
            d="M48 88 L72 62 Q90 48 120 46 L200 46 Q240 48 262 66 L278 88 Z"
            fill="url(#fal-body-shine)"
          />
          {/* teto / vidro */}
          <path
            d="M100 62 L118 50 L198 50 L230 66 L100 66 Z"
            fill={accent}
            opacity="0.45"
          />
          {/* faixa inferior */}
          <rect x="52" y="86" width="220" height="8" rx="2" fill={accent} opacity="0.7" />
        </g>
        {/* rodas */}
        <circle cx="95" cy="100" r={wheelR} fill="#1a1a1a" />
        <circle cx="95" cy="100" r={wheelR - 6} fill="#444" />
        <circle cx="95" cy="100" r="4" fill={accent} />
        <circle cx="230" cy="100" r={wheelR} fill="#1a1a1a" />
        <circle cx="230" cy="100" r={wheelR - 6} fill="#444" />
        <circle cx="230" cy="100" r="4" fill={accent} />
        {payload.label ? (
          <text
            x="160"
            y="30"
            textAnchor="middle"
            fill="currentColor"
            className="fill-fal-fg"
            style={{ fontSize: 12, fontWeight: 800 }}
          >
            {payload.label}
          </text>
        ) : null}
        {/* marcadores commerce — só leitura */}
        {installedCount > 0 ? (
          <circle cx="290" cy="40" r="10" fill="#1b7a4a" opacity="0.9" />
        ) : null}
        {pendingCount > 0 ? (
          <circle cx="290" cy="64" r="10" fill="#b8860b" opacity="0.9" />
        ) : null}
      </svg>
      <p className="m-0 mt-2 text-center text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
        Visual 2D · preview FAL read-only · não é registro técnico
        {installedCount || pendingCount
          ? ` · ${installedCount} instalada(s) · ${pendingCount} pendente(s)`
          : ''}
      </p>
    </div>
  )
}

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewerPref, setViewerPref] = useState<VisualViewerMode>(() => readVisualViewerMode())
  const [webglOk, setWebglOk] = useState(false)

  useEffect(() => {
    setWebglOk(canUseWebGL())
  }, [])

  const effectiveMode = useMemo(
    () => resolveViewerMode(viewerPref, webglOk),
    [viewerPref, webglOk],
  )

  function setViewerMode(mode: VisualViewerMode) {
    setViewerPref(mode)
    writeVisualViewerMode(mode)
  }

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [row, preview] = await Promise.all([
        getMyVisualConfig(vehicleIdentityId),
        listVisualPartPreviews(membershipId),
      ])
      if (row) setPayload(row.payload)
      setParts(preview)
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
        Camada visual ligada à identity. Pintura/rodas e o preview de peças <strong>não</strong>{' '}
        criam bought/instalação. Preview lê G7 existente (commerce FAL). Config privada não migra
        na transferência sem opt-in.
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

      {effectiveMode === '3d' ? (
        <Suspense fallback={<VehicleSilhouette2D payload={payload} parts={parts} />}>
          <VehicleViewer3D payload={payload} parts={parts} />
        </Suspense>
      ) : (
        <VehicleSilhouette2D payload={payload} parts={parts} />
      )}

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
