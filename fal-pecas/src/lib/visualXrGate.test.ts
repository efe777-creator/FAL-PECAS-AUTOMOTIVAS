import { describe, expect, it } from 'vitest'
import { canUseWebXrApi, isVisualXrEnvEnabled, isVisualXrEnabled } from './visualXrGate'

describe('visualXrGate', () => {
  it('env/opt-in default seguro (sem forçar XR)', () => {
    expect(typeof isVisualXrEnvEnabled()).toBe('boolean')
    expect(typeof isVisualXrEnabled()).toBe('boolean')
    // Sem env=1, enabled composto deve ser false
    if (!isVisualXrEnvEnabled()) {
      expect(isVisualXrEnabled()).toBe(false)
    }
  })

  it('canUseWebXrApi não quebra fora do browser XR', () => {
    expect(typeof canUseWebXrApi()).toBe('boolean')
  })
})
