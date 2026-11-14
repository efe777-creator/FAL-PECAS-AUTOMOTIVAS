import { describe, expect, it } from 'vitest'
import { hasAllSecureFieldContainers } from './mpSecureFieldsState'

describe('hasAllSecureFieldContainers', () => {
  it('confirma montagem apenas quando os três Secure Fields existem', () => {
    expect(
      hasAllSecureFieldContainers([
        'cardNumberSecureField_container',
        'expirationDateSecureField_container',
      ]),
    ).toBe(false)

    expect(
      hasAllSecureFieldContainers([
        'cardNumberSecureField_container',
        'expirationDateSecureField_container',
        'securityCodeSecureField_container',
      ]),
    ).toBe(true)
  })
})
