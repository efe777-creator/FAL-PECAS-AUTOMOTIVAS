import { describe, expect, it } from 'vitest'
import {
  HOME_BANNER_IMAGE_IDEAL,
  HOME_BANNER_IMAGE_MOBILE_IDEAL,
  assertHomeBannerImageDimensions,
} from './adminHomeContentService'

describe('assertHomeBannerImageDimensions', () => {
  it('aceita desktop 1376×768', () => {
    expect(() =>
      assertHomeBannerImageDimensions(1376, 768, HOME_BANNER_IMAGE_IDEAL),
    ).not.toThrow()
  })

  it('rejeita desktop fora do exato', () => {
    expect(() =>
      assertHomeBannerImageDimensions(1920, 1080, HOME_BANNER_IMAGE_IDEAL),
    ).toThrow(/esperado 1376 × 768 px, recebido 1920×1080/)
  })

  it('aceita mobile 768×432', () => {
    expect(() =>
      assertHomeBannerImageDimensions(768, 432, HOME_BANNER_IMAGE_MOBILE_IDEAL),
    ).not.toThrow()
  })

  it('rejeita mobile fora do exato', () => {
    expect(() =>
      assertHomeBannerImageDimensions(750, 1334, HOME_BANNER_IMAGE_MOBILE_IDEAL),
    ).toThrow(/esperado 768 × 432 px, recebido 750×1334/)
  })
})
