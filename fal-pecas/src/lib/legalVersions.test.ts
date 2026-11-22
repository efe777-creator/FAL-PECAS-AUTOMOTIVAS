import { describe, expect, it } from 'vitest'
import {
  LEGAL_ACCEPTANCE_KINDS,
  LEGAL_POLICY_CARDS,
  buildLegalAcceptancePayload,
  legalVersionFor,
} from './legalVersions'
import { LEGAL_COPY } from './legalCopy'

describe('legalVersions #14', () => {
  it('expõe 8 cards de política com paths únicos', () => {
    expect(LEGAL_POLICY_CARDS).toHaveLength(8)
    const paths = new Set(LEGAL_POLICY_CARDS.map((c) => c.path))
    expect(paths.size).toBe(8)
  })

  it('tem copy para cada kind', () => {
    for (const card of LEGAL_POLICY_CARDS) {
      expect(LEGAL_COPY[card.kind]?.title).toBeTruthy()
      expect(legalVersionFor(card.kind)).toBeTruthy()
    }
  })

  it('monta payload de aceite com 4 versões', () => {
    const p = buildLegalAcceptancePayload('2026-11-22T12:00:00.000Z')
    expect(LEGAL_ACCEPTANCE_KINDS).toHaveLength(4)
    expect(p.terms_version).toBeTruthy()
    expect(p.commercial_version).toBeTruthy()
    expect(p.privacy_version).toBeTruthy()
    expect(p.returns_version).toBeTruthy()
    expect(p.accepted_at).toBe('2026-11-22T12:00:00.000Z')
  })
})
