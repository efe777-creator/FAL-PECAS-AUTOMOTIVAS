import { describe, expect, it } from 'vitest'
import { detectSiblingModelAmbiguity } from './siblingModelAmbiguity'
import type { VehicleOptionTree } from '@/types'

const tree: VehicleOptionTree = {
  makers: ['Hyundai', 'Renault'],
  modelsByMaker: {
    Hyundai: ['HB20', 'HB20S'],
    Renault: ['Kwid', 'Kwid Intense'],
  },
  yearsByModel: {},
  enginesByModel: {},
  enginesByModelYear: {},
  versionsByModel: {
    'Hyundai|HB20': ['Comfort', 'Premium'],
    'Hyundai|HB20S': ['Diamond'],
    'Renault|Kwid': ['Zen'],
    'Renault|Kwid Intense': [],
  },
}

describe('detectSiblingModelAmbiguity', () => {
  it('HB20 1.0 Comfort não fica ambíguo só porque existe HB20S', () => {
    const r = detectSiblingModelAmbiguity(tree, 'Hyundai', 'HB20 1.0 Comfort')
    expect(r.ambiguous).toBe(false)
    expect(r.reason).toBeNull()
  })

  it('Kwid Intense (irmão no cadastro) continua ambíguo vs Kwid', () => {
    const r = detectSiblingModelAmbiguity(tree, 'Renault', 'Kwid Intense 1.0')
    expect(r.ambiguous).toBe(true)
    expect(r.reason).toBe('split_family')
    expect(r.ranks.some((x) => x.model === 'Kwid')).toBe(true)
    expect(r.ranks.some((x) => x.model === 'Kwid Intense')).toBe(true)
  })

  it('pick exato Kwid Intense não reabre família', () => {
    const r = detectSiblingModelAmbiguity(tree, 'Renault', 'Kwid Intense')
    expect(r.ambiguous).toBe(false)
    expect(r.ranks[0]?.model).toBe('Kwid Intense')
  })
})
