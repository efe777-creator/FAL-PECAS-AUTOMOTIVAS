import { describe, expect, it } from 'vitest'
import {
  SEARCH_ARIA_LABEL,
  SEARCH_CATALOG_HINT,
  SEARCH_INPUT_PLACEHOLDER,
} from '@/lib/searchCopy'

describe('searchCopy (Notes #10)', () => {
  it('placeholder e hint priorizam placa + peça', () => {
    expect(SEARCH_INPUT_PLACEHOLDER.toLowerCase()).toContain('placa')
    expect(SEARCH_INPUT_PLACEHOLDER.toLowerCase()).toContain('peça')
    expect(SEARCH_CATALOG_HINT.toLowerCase()).toContain('placa')
    expect(SEARCH_ARIA_LABEL.toLowerCase()).toContain('peças')
  })
})
