import { describe, expect, it } from 'vitest'
import {
  buildMeqOptionId,
  isMeqOptionId,
  parseMeqOptionId,
} from '@/lib/meShippingOptionId'

describe('meShippingOptionId', () => {
  it('build/parse roundtrip', () => {
    const id = buildMeqOptionId('b1ad6622-50b0-4e96-b395-730544e60085', 1)
    expect(id).toBe('meq:b1ad6622-50b0-4e96-b395-730544e60085:1')
    expect(parseMeqOptionId(id)).toEqual({
      quoteId: 'b1ad6622-50b0-4e96-b395-730544e60085',
      serviceId: 1,
    })
    expect(isMeqOptionId(id)).toBe(true)
  })

  it('rejeita mock e formato inválido', () => {
    expect(parseMeqOptionId('mock:economic')).toBeNull()
    expect(parseMeqOptionId('meq:only')).toBeNull()
    expect(isMeqOptionId('own:fal')).toBe(false)
  })
})
