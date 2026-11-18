import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  getMyVisualConfig,
  upsertVisualConfig,
} from '@/services/garage/vehicleVisualConfigService'
import {
  DEFAULT_VISUAL_PAYLOAD,
  FINISH_LABEL,
  WHEEL_STYLE_LABEL,
  type VehicleVisualPayload,
  type VisualFinish,
  type VisualWheelStyle,
} from '@/services/garage/vehicleVisualTypes'
import { useCallback, useEffect, useState } from 'react'

/** Silhueta 2D SVG — sem WebGL/Three. */
function VehicleSilhouette2D({ payload }: { payload: VehicleVisualPayload }) {
  const body = payload.bodyColorHex
  const accent = payload.accentHex
  const opacity =
    payload.finish === 'matte' ? 0.92 : payload.finish === 'metallic' ? 0.88 : 1
  const wheelR = payload.wheelStyle === 'sport' ? 18 : payload.wheelStyle === 'offroad' ? 20 : 16

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
      </svg>
      <p className="m-0 mt-2 text-center text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
        Visual 2D · não é registro técnico
      </p>
    </div>
  )
}

export function VehicleVisualPanel({
  vehicleIdentityId,
  seedColorHex,
}: {
  vehicleIdentityId: string
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const row = await getMyVisualConfig(vehicleIdentityId)
      if (row) setPayload(row.payload)
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar visual'), 'error')
    } finally {
      setLoading(false)
    }
  }, [vehicleIdentityId, toast])

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
        Camada visual ligada à identity. Pintura/rodas aqui <strong>não</strong> criam evento de
        instalação nem mutam G7. Config privada não migra na transferência sem opt-in.
      </p>

      <VehicleSilhouette2D payload={payload} />

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
