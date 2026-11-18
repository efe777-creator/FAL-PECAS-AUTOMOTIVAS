import { describe, expect, it } from 'vitest'
import {
  pickMyVisualConfigRow,
  previousOwnerPrivateVisibleAsMine,
  shareGrantsVisualEdit,
  transferInheritsPrivateVisualConfig,
  transferWizardPromotesPrivateVisual,
} from './visualPrivacyContract'

describe('visualPrivacyContract', () => {
  it('transferência não herda private_owner visual', () => {
    expect(transferInheritsPrivateVisualConfig()).toBe(false)
    expect(transferWizardPromotesPrivateVisual()).toBe(false)
  })

  it('share não concede edição visual', () => {
    expect(shareGrantsVisualEdit()).toBe(false)
  })

  it('pickMyVisualConfigRow ignora config do owner anterior', () => {
    const rows = [
      { ownerCustomerId: 'prev', visibility: 'private_owner' as const },
      { ownerCustomerId: 'new', visibility: 'private_owner' as const },
    ]
    expect(pickMyVisualConfigRow(rows, 'new')?.ownerCustomerId).toBe('new')
    expect(pickMyVisualConfigRow(rows, 'prev')?.ownerCustomerId).toBe('prev')
    expect(pickMyVisualConfigRow(rows, null)).toBeNull()
  })

  it('private_owner do anterior não é “minha” para o novo', () => {
    const prev = { ownerCustomerId: 'prev', visibility: 'private_owner' as const }
    expect(previousOwnerPrivateVisibleAsMine(prev, 'new')).toBe(false)
    expect(previousOwnerPrivateVisibleAsMine(prev, 'prev')).toBe(true)
  })
})
