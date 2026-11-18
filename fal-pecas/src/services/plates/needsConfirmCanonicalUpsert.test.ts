import { describe, expect, it } from 'vitest'
import { needsConfirmCanonicalUpsert } from './needsConfirmCanonicalUpsert'

describe('needsConfirmCanonicalUpsert (R4)', () => {
  it('false sem ano', () => {
    expect(
      needsConfirmCanonicalUpsert({
        maker: 'Fiat',
        model: 'Palio',
        year: undefined,
      }),
    ).toBe(false)
  })

  it('true quando faltam IDs e há ano', () => {
    expect(
      needsConfirmCanonicalUpsert({
        maker: 'Fiat',
        model: 'Palio',
        year: '2015',
      }),
    ).toBe(true)
  })

  it('false quando IDs completos e ano igual ao lookup', () => {
    expect(
      needsConfirmCanonicalUpsert(
        {
          maker: 'Fiat',
          model: 'Palio',
          year: '2015',
          manufacturerId: 'm1',
          modelId: 'mo1',
          versionId: 'v1',
        },
        '2015',
      ),
    ).toBe(false)
  })

  it('true quando ano diverge do lookup', () => {
    expect(
      needsConfirmCanonicalUpsert(
        {
          maker: 'Fiat',
          model: 'Palio',
          year: '2016',
          manufacturerId: 'm1',
          modelId: 'mo1',
          versionId: 'v1',
        },
        '2015',
      ),
    ).toBe(true)
  })
})
