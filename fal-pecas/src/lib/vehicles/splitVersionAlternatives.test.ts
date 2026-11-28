import { describe, expect, it } from 'vitest'
import { splitVersionAlternatives } from './splitVersionAlternatives'

describe('splitVersionAlternatives', () => {
  it('sem barra → uma parte', () => {
    expect(splitVersionAlternatives('Comfortline')).toEqual(['Comfortline'])
    expect(splitVersionAlternatives('')).toEqual([''])
    expect(splitVersionAlternatives(null)).toEqual([''])
  })

  it('barra e pipe → N partes', () => {
    expect(splitVersionAlternatives('Comfortline / Highline')).toEqual([
      'Comfortline',
      'Highline',
    ])
    expect(splitVersionAlternatives('LT|LTZ|Premier')).toEqual(['LT', 'LTZ', 'Premier'])
    expect(splitVersionAlternatives('A / B / C')).toEqual(['A', 'B', 'C'])
  })
})
