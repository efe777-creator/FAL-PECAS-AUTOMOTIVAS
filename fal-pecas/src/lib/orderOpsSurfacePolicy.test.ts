import { describe, expect, it } from 'vitest'
import {
  canStaffFinalizeAnalysis,
  isExpeditionOrLater,
  isInAnalysis,
  isInSeparation,
  isNeedsReception,
} from '@/lib/orderOpsGates'
import {
  resolveOrderOpsPendencia,
  resolveOrderOpsSubstatus,
} from '@/lib/orderOpsTaxonomy'
import { resolveOrderOpsPresentation } from '@/lib/orderOpsSurfacePolicy'
import {
  createOrderOpsActionRunner,
  actionCancelOrder,
} from '@/lib/orderOpsActions'
import { beforeEach, vi } from 'vitest'

vi.mock('@/services/admin/adminOrderService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/admin/adminOrderService')>()
  return {
    ...actual,
    staffCanCancel: vi.fn(),
    adminCancelOrder: vi.fn(),
  }
})

import { adminCancelOrder, staffCanCancel } from '@/services/admin/adminOrderService'

describe('orderOpsSurfacePolicy (I1 parity)', () => {
  it('mesma presentation para mesmo input (hub ≡ dash ≡ full)', () => {
    const input = {
      status: 'em_analise' as const,
      wave: 1 as const,
      canCancel: false,
      analysisMode: 'all_ok' as const,
    }
    const a = resolveOrderOpsPresentation(input)
    const b = resolveOrderOpsPresentation(input)
    expect(a).toEqual(b)
    expect(a.blocks).toContain('analysisPanel')
    expect(a.blocks).toContain('itemsInlineOps')
    expect(a.primaryActionId).toBeNull()
    expect(a.pendenciaActionsDeferred).toBe(true)
  })

  it('aguardando_decisao mantém finalize no rail (sem withdraw duplicado)', () => {
    const p = resolveOrderOpsPresentation({
      status: 'aguardando_decisao',
      customerDecision: 'authorized',
      wave: 1,
    })
    expect(p.primaryActionId).toBe('finalize-to-separation')
    expect(p.secondaryActionIds).not.toContain('withdraw-customer-decision')
    expect(p.blocks).toContain('analysisPanel')
  })

  it('separação sem analysisPanel (print só no rail)', () => {
    const p = resolveOrderOpsPresentation({
      status: 'em_separacao',
      wave: 1,
    })
    expect(p.blocks).not.toContain('analysisPanel')
    expect(p.primaryActionId).toBe('complete-separation')
    expect(p.secondaryActionIds).toContain('print-separation')
  })

  it('expedição no surface: slot + CTAs de retirada', () => {
    const ship = resolveOrderOpsPresentation({
      status: 'pronto_para_envio',
      wave: 1,
    })
    expect(ship.blocks).toContain('expeditionSlot')
    expect(ship.blocks).not.toContain('packing')

    const auth = resolveOrderOpsPresentation({
      status: 'pronto_para_envio',
      wave: 1,
      storePickup: true,
      pickupAuthorized: false,
    })
    expect(auth.blocks).toContain('storePickup')
    expect(auth.primaryActionId).toBeNull()

    const pick = resolveOrderOpsPresentation({
      status: 'pronto_para_envio',
      wave: 1,
      storePickup: true,
      pickupAuthorized: true,
    })
    expect(pick.primaryActionId).toBeNull()
    expect(pick.blocks).toContain('storePickup')
  })

  it('wave 2 registra packing no mesmo surface', () => {
    const p = resolveOrderOpsPresentation({
      status: 'pronto_para_envio',
      wave: 2,
    })
    expect(p.blocks).toContain('packing')
    expect(p.blocks).not.toContain('wave2Placeholder')
  })

  it('cancel aparece só com canCancel', () => {
    const no = resolveOrderOpsPresentation({
      status: 'aguardando_pagamento',
      wave: 1,
      canCancel: false,
    })
    const yes = resolveOrderOpsPresentation({
      status: 'aguardando_pagamento',
      wave: 1,
      canCancel: true,
    })
    expect(no.secondaryActionIds).not.toContain('cancel-order')
    expect(yes.primaryActionId === 'cancel-order' || yes.secondaryActionIds.includes('cancel-order')).toBe(
      true,
    )
  })
})

describe('orderOpsGates', () => {
  it('needs reception / analysis / separation / expedition', () => {
    expect(isNeedsReception('pagamento_aprovado')).toBe(true)
    expect(isInAnalysis('em_analise')).toBe(true)
    expect(isInSeparation('em_separacao')).toBe(true)
    expect(isExpeditionOrLater('pronto_para_envio')).toBe(true)
  })

  it('canStaffFinalizeAnalysis alinhado ao detalhe', () => {
    expect(
      canStaffFinalizeAnalysis({
        status: 'em_analise',
        analysisMode: 'all_ok',
      }),
    ).toBe(true)
    expect(
      canStaffFinalizeAnalysis({
        status: 'em_analise',
        analysisMode: 'incomplete',
      }),
    ).toBe(false)
    expect(
      canStaffFinalizeAnalysis({
        status: 'aguardando_decisao',
        customerDecision: 'authorized',
        analysisMode: 'incomplete',
      }),
    ).toBe(true)
  })
})

describe('orderOpsTaxonomy', () => {
  it('substatus não substitui status', () => {
    const sub = resolveOrderOpsSubstatus({
      status: 'aguardando_decisao',
      customerDecision: 'authorized',
    })
    expect(sub?.id).toBe('customer_authorized')
  })

  it('pendência usa next step', () => {
    const p = resolveOrderOpsPendencia({ status: 'pagamento_aprovado' })
    expect(p.title.length).toBeGreaterThan(0)
  })
})

describe('orderOpsActions I2/I3', () => {
  beforeEach(() => {
    vi.mocked(staffCanCancel).mockReset()
    vi.mocked(adminCancelOrder).mockReset()
  })

  it('I2: cancel sem permissão não chama mutate', async () => {
    vi.mocked(staffCanCancel).mockResolvedValue(false)
    const runner = createOrderOpsActionRunner()
    const fb = { ok: vi.fn(), error: vi.fn() }
    const ok = await actionCancelOrder(runner, 'oid', 'motivo teste', fb)
    expect(ok).toBe(false)
    expect(adminCancelOrder).not.toHaveBeenCalled()
    expect(fb.error).toHaveBeenCalled()
  })

  it('I3: segunda chamada concurrent é no-op', async () => {
    const runner = createOrderOpsActionRunner()
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    const first = runner.runExclusive(async () => {
      await gate
      return 'a'
    })
    const second = runner.runExclusive(async () => 'b')
    expect(await second).toBeUndefined()
    release()
    expect(await first).toBe('a')
  })
})
