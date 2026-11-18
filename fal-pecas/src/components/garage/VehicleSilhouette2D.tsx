import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'

/** Silhueta 2D SVG — adapter fallback do Visualization Engine. */
export function VehicleSilhouette2D({
  payload,
  modelParts,
  orphanInstallCount,
  syncEnabled,
}: {
  payload: VehicleVisualPayload
  modelParts: VisualPartPreview[]
  orphanInstallCount: number
  syncEnabled: boolean
}) {
  const body = payload.bodyColorHex
  const accent = payload.accentHex
  const opacity =
    payload.finish === 'matte' ? 0.92 : payload.finish === 'metallic' ? 0.88 : 1
  const wheelR = payload.wheelStyle === 'sport' ? 18 : payload.wheelStyle === 'offroad' ? 20 : 16
  const mirroredCount = modelParts.length + orphanInstallCount

  return (
    <div className="overflow-hidden rounded-fal border border-fal-line bg-gradient-to-b from-fal-bg to-fal-surface p-4">
      <svg
        viewBox="0 0 320 140"
        className="mx-auto block h-auto w-full max-w-md"
        role="img"
        aria-label="Pré-visualização 2D do veículo. Aparência demonstrativa — não é registro técnico."
      >
        <defs>
          <linearGradient id="fal-body-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={payload.finish === 'metallic' ? 0.35 : 0.12} />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <ellipse cx="160" cy="118" rx="110" ry="8" fill="#000" opacity="0.12" />
        <g opacity={opacity}>
          <path
            d="M48 88 L72 62 Q90 48 120 46 L200 46 Q240 48 262 66 L278 88 Z"
            fill={body}
          />
          <path
            d="M48 88 L72 62 Q90 48 120 46 L200 46 Q240 48 262 66 L278 88 Z"
            fill="url(#fal-body-shine)"
          />
          <path
            d="M100 62 L118 50 L198 50 L230 66 L100 66 Z"
            fill={accent}
            opacity="0.45"
          />
          <rect x="52" y="86" width="220" height="8" rx="2" fill={accent} opacity="0.7" />
        </g>
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
        {syncEnabled && mirroredCount > 0 ? (
          <circle cx="290" cy="40" r="10" fill="#1b7a4a" opacity="0.9" />
        ) : null}
      </svg>
      <p className="m-0 mt-2 text-center text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
        Visual 2D · não é registro técnico
        {syncEnabled
          ? mirroredCount
            ? ` · sync 2A · ${mirroredCount} no modelo`
            : ' · sync 2A ligado · nada a espelhar'
          : ' · sync 2A desligado'}
      </p>
    </div>
  )
}
