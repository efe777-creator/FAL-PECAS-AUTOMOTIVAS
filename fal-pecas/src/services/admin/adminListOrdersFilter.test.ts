import { describe, expect, it } from 'vitest'
import type { AdminListOrdersOpts } from './adminOrderService'

/** Espelha a precedência de filtros de adminListOrders (CP-CEN-040). */
function resolveListFilter(
  filterStatus: string | null | undefined,
  opts?: AdminListOrdersOpts,
): { mode: string; value?: unknown } {
  if (opts?.problems) return { mode: 'problems' }
  if (opts?.statuses && opts.statuses.length > 0) {
    return { mode: 'statuses', value: [...opts.statuses] }
  }
  if (filterStatus) return { mode: 'status', value: filterStatus }
  const extra: Record<string, string> = {}
  if (opts?.cancellationRequest) extra.cancellationRequest = opts.cancellationRequest
  if (opts?.customerDecision) extra.customerDecision = opts.customerDecision
  if (Object.keys(extra).length) return { mode: 'extra', value: extra }
  return { mode: 'none' }
}

describe('adminListOrders filter precedence (CP-CEN-040)', () => {
  it('prioriza problems sobre statuses e status único', () => {
    expect(
      resolveListFilter('enviado', {
        problems: true,
        statuses: ['cancelado'],
      }).mode,
    ).toBe('problems')
  })

  it('usa statuses in() quando informado', () => {
    expect(
      resolveListFilter(null, {
        statuses: ['confirmado', 'em_separacao'],
      }),
    ).toEqual({ mode: 'statuses', value: ['confirmado', 'em_separacao'] })
  })

  it('cai no status único legado', () => {
    expect(resolveListFilter('enviado', {})).toEqual({ mode: 'status', value: 'enviado' })
  })

  it('cancellation pending sem status = filtro só de cancel request', () => {
    expect(
      resolveListFilter(null, { cancellationRequest: 'pending' }),
    ).toEqual({ mode: 'extra', value: { cancellationRequest: 'pending' } })
  })
})
