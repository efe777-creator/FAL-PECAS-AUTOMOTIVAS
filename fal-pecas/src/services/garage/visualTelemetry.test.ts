import { describe, expect, it } from 'vitest'
import {
  clearVisualTelemetry,
  listVisualTelemetry,
  recordVisualTelemetry,
  telemetryHasNoPii,
} from './visualTelemetry'

describe('visualTelemetry', () => {
  it('registra evento sem PII e mantém ring buffer', () => {
    clearVisualTelemetry()
    const ev = recordVisualTelemetry({
      source: 'glb',
      outcome: 'ok',
      assetCode: 'argo-hatch',
      durationMs: 120,
      reducedMotion: false,
    })
    expect(telemetryHasNoPii(ev)).toBe(true)
    expect(listVisualTelemetry()).toHaveLength(1)
    clearVisualTelemetry()
    expect(listVisualTelemetry()).toHaveLength(0)
  })
})
