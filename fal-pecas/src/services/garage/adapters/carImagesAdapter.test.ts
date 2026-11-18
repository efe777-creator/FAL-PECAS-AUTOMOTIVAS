import { describe, expect, it } from 'vitest'
import {
  buildCarImagesPublicImageUrl,
  carImagesGlbMetaUrl,
  nearestCarImagesPaint,
} from './carImagesAdapter'

describe('carImagesAdapter', () => {
  it('monta URL pública com make/model/year/view', () => {
    const url = buildCarImagesPublicImageUrl(
      { make: 'Fiat', model: 'Palio', year: 2015, view: 'front34', width: 800 },
      'ci_test',
    )
    expect(url).toContain('make=Fiat')
    expect(url).toContain('model=Palio')
    expect(url).toContain('year=2015')
    expect(url).toContain('key=ci_test')
  })

  it('mapeia vermelho FAL para paint red', () => {
    expect(nearestCarImagesPaint('#d20f0f')).toBe('red')
  })

  it('monta path GLB por geração', () => {
    expect(carImagesGlbMetaUrl('fiat', 'palio', '178-2011-2017')).toContain(
      '/vehicles/fiat/palio/178-2011-2017/model',
    )
  })
})
