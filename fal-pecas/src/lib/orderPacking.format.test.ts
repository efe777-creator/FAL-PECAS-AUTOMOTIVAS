import { describe, expect, it } from 'vitest'
import {
  formatContractedDims,
  listContractedVolumeRaw,
  parseVolumeDims,
  volumesFromContractedMeta,
} from './orderPacking'

describe('formatContractedDims / parseVolumeDims', () => {
  it('formata objeto ME único', () => {
    const text = formatContractedDims({
      me: { volumes: { lengthCm: 20, widthCm: 15, heightCm: 10, weightKg: 1 } },
    })
    expect(text).toContain('20×15×10')
    expect(text).toContain('1 kg')
  })

  it('lista raw aceita array e objeto', () => {
    expect(listContractedVolumeRaw({ volumes: { lengthCm: 1, widthCm: 1, heightCm: 1, weightKg: 1 } })).toHaveLength(1)
    expect(
      listContractedVolumeRaw({
        quote: { volumes: [{ length_cm: 2, width_cm: 2, height_cm: 2, weight_kg: 2 }] },
      }),
    ).toHaveLength(1)
  })

  it('parseVolumeDims rejeita incompleto', () => {
    expect(parseVolumeDims({ lengthCm: 10 })).toBeNull()
  })

  it('volumesFromContractedMeta cobre me.volumes objeto', () => {
    const vols = volumesFromContractedMeta({
      me: { volumes: { lengthCm: 16, widthCm: 11, heightCm: 2, weightKg: 0.3 } },
    })
    expect(vols[0]?.widthCm).toBe(11)
  })
})
