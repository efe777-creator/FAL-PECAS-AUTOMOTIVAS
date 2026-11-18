import { describe, expect, it } from 'vitest'
import { unlinkDoesNotDeleteFile } from './evidenceTypes'

describe('evidenceTypes', () => {
  it('desvincular não apaga arquivo', () => {
    expect(unlinkDoesNotDeleteFile()).toBe(true)
  })
})
