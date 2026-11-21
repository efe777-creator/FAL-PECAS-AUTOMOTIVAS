import { describe, expect, it } from 'vitest'
import {
  mergeKitGalleryWithComponentImages,
  pickPrimaryStoragePath,
  sortProductImagePaths,
} from '@/services/products/productImages'

describe('pickPrimaryStoragePath (MARCHA PDP-A)', () => {
  it('usa is_primary quando presente', () => {
    expect(
      pickPrimaryStoragePath([
        { product_id: 'p1', storage_path: 'a.jpg', sort_order: 0, is_primary: false },
        { product_id: 'p1', storage_path: 'b.jpg', sort_order: 1, is_primary: true },
      ]),
    ).toBe('b.jpg')
  })

  it('fallback menor sort_order', () => {
    expect(
      pickPrimaryStoragePath([
        { product_id: 'p1', storage_path: 'z.jpg', sort_order: 2, is_primary: false },
        { product_id: 'p1', storage_path: 'a.jpg', sort_order: 0, is_primary: false },
      ]),
    ).toBe('a.jpg')
  })

  it('vazio → null (não inventa)', () => {
    expect(pickPrimaryStoragePath([])).toBeNull()
  })
})

describe('sortProductImagePaths (MARCHA PDP-B)', () => {
  it('primary primeiro, depois sort_order', () => {
    expect(
      sortProductImagePaths([
        { product_id: 'p1', storage_path: 'c.jpg', sort_order: 2, is_primary: false },
        { product_id: 'p1', storage_path: 'a.jpg', sort_order: 0, is_primary: false },
        { product_id: 'p1', storage_path: 'b.jpg', sort_order: 5, is_primary: true },
      ]),
    ).toEqual(['b.jpg', 'a.jpg', 'c.jpg'])
  })

  it('N=1 retorna um path', () => {
    expect(
      sortProductImagePaths([
        { product_id: 'p1', storage_path: 'only.jpg', sort_order: 0, is_primary: true },
      ]),
    ).toEqual(['only.jpg'])
  })

  it('vazio → [] (sem chrome / sem inventar)', () => {
    expect(sortProductImagePaths([])).toEqual([])
  })
})

describe('mergeKitGalleryWithComponentImages (Notes #1)', () => {
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
