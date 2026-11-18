import { describe, expect, it } from 'vitest'
import {
  assetReadyForPublicViewer,
  compatMatchesIdentity,
  visualAssetsNeverWrite2A,
} from './vehicleVisualAssetTypes'

describe('vehicleVisualAssetTypes', () => {
  it('nunca escreve 2A', () => {
    expect(visualAssetsNeverWrite2A()).toBe(true)
  })

  it('IA sem commercial_ok não vai ao viewer público', () => {
    expect(
      assetReadyForPublicViewer({
        status: 'approved',
        source: 'ai',
        commercialOk: false,
      }),
    ).toBe(false)
    expect(
      assetReadyForPublicViewer({
        status: 'approved',
        source: 'first_party',
        commercialOk: true,
      }),
    ).toBe(true)
  })

  it('compat exige approved e respeita ano/modelo', () => {
    const id = {
      manufacturerId: 'm1',
      modelId: 'mo1',
      versionId: 'v1',
      year: 2018,
    }
    expect(
      compatMatchesIdentity(
        {
          manufacturerId: 'm1',
          modelId: 'mo1',
          versionId: null,
          yearFrom: 2015,
          yearTo: 2020,
          status: 'approved',
        },
        id,
      ),
    ).toBe(true)
    expect(
      compatMatchesIdentity(
        {
          manufacturerId: 'm1',
          modelId: 'mo1',
          versionId: null,
          yearFrom: 2019,
          yearTo: 2020,
          status: 'approved',
        },
        id,
      ),
    ).toBe(false)
    expect(
      compatMatchesIdentity(
        {
          manufacturerId: 'm1',
          modelId: 'mo1',
          versionId: null,
          yearFrom: null,
          yearTo: null,
          status: 'revoked',
        },
        id,
      ),
    ).toBe(false)
  })
})
