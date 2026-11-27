import { describe, expect, it } from 'vitest'
import {
  decideAttributeEnrichment,
  planTechAttributeEnrichment,
} from './enrichVehicleAttributes'

describe('decideAttributeEnrichment', () => {
  it('NULL recebe Manual → enrich', () => {
    expect(decideAttributeEnrichment(null, 'manual')).toEqual({
      kind: 'enrich',
      next: 'manual',
    })
  })

  it('Manual + Manual → unchanged', () => {
    expect(decideAttributeEnrichment('manual', 'Manual')).toEqual({ kind: 'unchanged' })
  })

  it('Manual + Automática → conflict', () => {
    expect(decideAttributeEnrichment('manual', 'automatica')).toEqual({
      kind: 'conflict',
      current: 'manual',
      incoming: 'automatica',
    })
  })

  it('incoming vazio → skip', () => {
    expect(decideAttributeEnrichment('manual', null)).toEqual({ kind: 'skip' })
  })
})

describe('planTechAttributeEnrichment', () => {
  it('enriquece só NULL e lista conflitos', () => {
    const plan = planTechAttributeEnrichment(
      { transmission: 'manual', fuel: null, traction: null },
      { transmission: 'automatica', fuel: 'Flex', traction: '4x2' },
    )
    expect(plan.patch).toEqual({ fuel: 'Flex', traction: '4x2' })
    expect(plan.conflicts).toEqual([
      { attribute: 'transmission', current: 'manual', incoming: 'automatica' },
    ])
    expect(plan.enriched).toEqual(['fuel', 'traction'])
  })

  it('dois NULL não criam segunda identidade (só patch)', () => {
    const plan = planTechAttributeEnrichment(
      { transmission: null },
      { transmission: null },
    )
    expect(plan.patch).toEqual({})
    expect(plan.conflicts).toEqual([])
  })
})
