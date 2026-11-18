/** Payload 2D — Etapa 1. Sem meshes/3D. Visual ≠ fato 2A. */

export type VisualWheelStyle = 'stock' | 'sport' | 'offroad' | 'classic'

export type VisualFinish = 'solid' | 'metallic' | 'matte'

export type VehicleVisualPayload = {
  bodyColorHex: string
  accentHex: string
  wheelStyle: VisualWheelStyle
  finish: VisualFinish
  label: string
  notes: string
}

export const DEFAULT_VISUAL_PAYLOAD: VehicleVisualPayload = {
  bodyColorHex: '#1e3a5f',
  accentHex: '#c4a35a',
  wheelStyle: 'stock',
  finish: 'solid',
  label: '',
  notes: '',
}

export const WHEEL_STYLE_LABEL: Record<VisualWheelStyle, string> = {
  stock: 'Original',
  sport: 'Esportiva',
  offroad: 'Off-road',
  classic: 'Clássica',
}

export const FINISH_LABEL: Record<VisualFinish, string> = {
  solid: 'Sólida',
  metallic: 'Metálica',
  matte: 'Fosca',
}

export function normalizeVisualPayload(raw: unknown): VehicleVisualPayload {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const wheel = o.wheelStyle
  const finish = o.finish
  return {
    bodyColorHex:
      typeof o.bodyColorHex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(o.bodyColorHex)
        ? o.bodyColorHex
        : DEFAULT_VISUAL_PAYLOAD.bodyColorHex,
    accentHex:
      typeof o.accentHex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(o.accentHex)
        ? o.accentHex
        : DEFAULT_VISUAL_PAYLOAD.accentHex,
    wheelStyle:
      wheel === 'sport' || wheel === 'offroad' || wheel === 'classic' || wheel === 'stock'
        ? wheel
        : 'stock',
    finish: finish === 'metallic' || finish === 'matte' || finish === 'solid' ? finish : 'solid',
    label: typeof o.label === 'string' ? o.label.slice(0, 40) : '',
    notes: typeof o.notes === 'string' ? o.notes.slice(0, 500) : '',
  }
}

/** Garantia de contrato: salvar visual não é evento de instalação. */
export function visualSaveCreatesInstallationEvent(): false {
  return false
}
