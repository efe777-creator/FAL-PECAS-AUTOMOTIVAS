import { describe, expect, it } from 'vitest'
import { isLikelyImageFile, skuKeyFromImageFilename } from './skuFromImageFilename'

describe('skuKeyFromImageFilename', () => {
  it('usa o basename sem extensão', () => {
    expect(skuKeyFromImageFilename('BRD5605.jpg')).toBe('BRD5605')
    expect(skuKeyFromImageFilename(String.raw`C:\fotos\ABC-99.PNG`)).toBe('ABC-99')
  })

  it('remove só sufixo de galeria _N', () => {
    expect(skuKeyFromImageFilename('BRD5605_1.webp')).toBe('BRD5605')
    expect(skuKeyFromImageFilename('BRD5605_12.jpeg')).toBe('BRD5605')
  })

  it('preserva hífen no SKU', () => {
    expect(skuKeyFromImageFilename('SKU-1.jpg')).toBe('SKU-1')
  })

  it('retorna null se vazio', () => {
    expect(skuKeyFromImageFilename('')).toBeNull()
    expect(skuKeyFromImageFilename('.jpg')).toBeNull()
  })
})

describe('isLikelyImageFile', () => {
  it('aceita mime ou extensão', () => {
    expect(isLikelyImageFile({ name: 'x.bin', type: 'image/png' })).toBe(true)
    expect(isLikelyImageFile({ name: 'x.jpg', type: '' })).toBe(true)
    expect(isLikelyImageFile({ name: 'x.csv', type: 'text/csv' })).toBe(false)
  })
})
