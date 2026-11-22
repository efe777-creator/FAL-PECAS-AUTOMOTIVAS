import { describe, expect, it } from 'vitest'
import { splitApiModelo } from '@/services/plates/splitApiModelo'

/** Espelho da regra Edge PLATE_FIPE_ASSIST (multi-candidato). */
function fipeAmbiguous(
  entries: Array<{ codigo: string; modelo: string; score: number }>,
): boolean {
  if (entries.length < 2) return false
  const a = entries[0]!
  const b = entries[1]!
  return a.score >= 40 && b.score >= 40 && a.score - b.score <= 15
}

describe('FIPE assist multi-candidato', () => {
  it('empate de score → ambiguous', () => {
    const entries = [
      { codigo: '001', modelo: 'KWID ZEN 1.0', score: 80 },
      { codigo: '002', modelo: 'KWID INTENSE 1.0', score: 78 },
    ]
    expect(fipeAmbiguous(entries)).toBe(true)
    const cands = entries.map((e) => splitApiModelo(e.modelo).model)
    expect(cands[0]).toBeTruthy()
    expect(cands[1]).toBeTruthy()
  })

  it('score dominante não ambígua', () => {
    expect(
      fipeAmbiguous([
        { codigo: '001', modelo: 'GOL 1.0', score: 95 },
        { codigo: '002', modelo: 'GOL 1.6', score: 40 },
      ]),
    ).toBe(false)
  })
})
