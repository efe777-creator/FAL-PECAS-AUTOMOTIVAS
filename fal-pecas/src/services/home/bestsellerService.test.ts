import { describe, expect, it } from 'vitest'
import { orderIdsByBestsellerRank } from './bestsellerService'

describe('orderIdsByBestsellerRank', () => {
  it('ordena por unitsSold desc e desempata por id', () => {
    expect(
      orderIdsByBestsellerRank(
        ['c', 'a', 'b'],
        [
          { productId: 'a', unitsSold: 10 },
          { productId: 'b', unitsSold: 30 },
          { productId: 'c', unitsSold: 30 },
        ],
      ),
    ).toEqual(['b', 'c', 'a'])
  })

  it('ids sem rank vão ao fim', () => {
    expect(
      orderIdsByBestsellerRank(
        ['x', 'a'],
        [{ productId: 'a', unitsSold: 1 }],
      ),
    ).toEqual(['a', 'x'])
  })
})
