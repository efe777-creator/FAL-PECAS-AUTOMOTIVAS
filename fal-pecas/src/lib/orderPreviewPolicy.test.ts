import { describe, expect, it } from 'vitest'
import {
  isAllowedOrderPreviewAction,
  isPdfStubDisabled,
  ORDER_PREVIEW_ACTION_IDS,
} from './orderPreviewPolicy'

describe('orderPreviewPolicy', () => {
  it('lista branca não inclui mutações', () => {
    for (const id of ['ship', 'cancel', 'packing', 'me-purchase', 'advance']) {
      expect(isAllowedOrderPreviewAction(id)).toBe(false)
    }
  })

  it('permite ações de navegação e print', () => {
    expect(ORDER_PREVIEW_ACTION_IDS).toContain('open-full')
    expect(ORDER_PREVIEW_ACTION_IDS).toContain('print-separation')
    expect(isAllowedOrderPreviewAction('open-preview')).toBe(true)
  })

  it('PDF fica stub desabilitado', () => {
    expect(isPdfStubDisabled()).toBe(true)
  })
})
