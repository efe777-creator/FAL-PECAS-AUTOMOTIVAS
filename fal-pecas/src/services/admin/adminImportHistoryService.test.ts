import { describe, expect, it } from 'vitest'
import { formatImportReportSummary } from './adminImportHistoryService'

describe('formatImportReportSummary', () => {
  it('vazio', () => {
    expect(formatImportReportSummary(null)).toBe('—')
    expect(formatImportReportSummary({})).toBe('—')
  })

  it('campos comuns', () => {
    expect(formatImportReportSummary({ created: 1, updated: 99, skipped: 1, failed: 0 })).toBe(
      'created: 1 · updated: 99 · skipped: 1 · failed: 0',
    )
  })
})
