import { describe, expect, it } from 'vitest'
import { mergeKitGalleryWithComponentImages } from './productImages'

describe('mergeKitGalleryWithComponentImages', () => {
  it('mantém capa do kit e acrescenta fotos dos itens sem duplicar', () => {
    expect(
      mergeKitGalleryWithComponentImages(
        ['https://cdn/kit-capa.jpg', 'https://cdn/kit-extra.jpg'],
        [
          'https://cdn/item-a.jpg',
          'https://cdn/kit-capa.jpg',
          null,
          'https://cdn/item-b.jpg',
          '  ',
        ],
      ),
    ).toEqual([
      'https://cdn/kit-capa.jpg',
      'https://cdn/kit-extra.jpg',
      'https://cdn/item-a.jpg',
      'https://cdn/item-b.jpg',
    ])
  })

  it('funciona só com fotos dos componentes quando kit sem galeria', () => {
    expect(
      mergeKitGalleryWithComponentImages([], ['https://cdn/a.jpg', undefined, 'https://cdn/a.jpg']),
    ).toEqual(['https://cdn/a.jpg'])
  })
})
