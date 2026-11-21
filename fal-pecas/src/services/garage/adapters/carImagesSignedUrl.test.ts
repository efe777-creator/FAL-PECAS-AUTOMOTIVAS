import { describe, expect, it } from 'vitest'
import {
  buildCarImagesSignedUrlQuery,
  FAL_CARIMAGES_SIGNED_URL_PATH,
} from './carImagesSignedUrl'

describe('buildCarImagesSignedUrlQuery', () => {
  it('monta make/model/year/view/color sem key', () => {
    const q = buildCarImagesSignedUrlQuery({
      make: 'Fiat',
      model: 'Palio',
      year: 2015,
      view: 'front34',
      color: 'silver',
      width: 800,
    })
    expect(q.get('make')).toBe('Fiat')
    expect(q.get('model')).toBe('Palio')
    expect(q.get('year')).toBe('2015')
    expect(q.get('view')).toBe('front34')
    expect(q.get('color')).toBe('silver')
    expect(q.get('width')).toBe('800')
    expect(q.get('format')).toBe('webp')
    expect(q.has('api_key')).toBe(false)
    expect(q.has('key')).toBe(false)
  })

  it('aceita type=moto', () => {
    const q = buildCarImagesSignedUrlQuery({ make: 'Honda', type: 'moto' })
    expect(q.get('type')).toBe('moto')
  })

  it('path FAL canônico', () => {
    expect(FAL_CARIMAGES_SIGNED_URL_PATH).toBe('/api/carimages-signed-url')
  })
})
