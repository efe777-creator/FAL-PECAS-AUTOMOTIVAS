import { describe, expect, it } from 'vitest'
import { formatImportReportSummary } from './adminImportHistoryService'

describe('formatImportReportSummary', () => {
  it('vazio', () => {
    expect(formatImportReportSummary(null)).toBe('—')
    expect(formatImportReportSummary({})).toBe('—')
  })

  it('campos comuns', () => {
    expect(formatImportReportSummary({ created: 1, updated: 99, skipped: 1, failed: 0 })).toBe(
      'Criados: 1 · Atualizados: 99 · Ignorados: 1 · Falhas: 0',
    )
  })
})
