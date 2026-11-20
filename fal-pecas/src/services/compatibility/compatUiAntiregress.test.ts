import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  compatSealDisplayLabel,
  needsCompatPurchaseConfirm,
} from '@/services/compatibility/compatCopy'
import {
  resolveCardSeal,
  type CompatibilityVerdict,
} from '@/services/compatibility/compatibilityEngine'

const root = resolve(__dirname, '../../..')
const src = (...parts: string[]) => resolve(root, 'src', ...parts)

const incompatible: CompatibilityVerdict = {
  state: 'unconfirmed',
  label: 'x',
  evidences: [
    { code: 'no_intersection', detail: 'Nenhuma aplicação PVC cruza com o veículo informado' },
  ],
}

/**
 * Anti-regressão estável (sem browser): contratos de UI/copy E.1–E.7
 * que já quebraram ou duplicaram na frente compat.
 */
describe('compat UI anti-regressão (contratos fonte)', () => {
  it('PDP: um CompatVerdictSummary no buy-box; detalhes sem status incompat duplicado', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    expect(page).toMatch(/CompatVerdictSummary/)
    expect(page).toMatch(/incompatEmphasis/)

    const detalhesIdx = page.indexOf('id="pdp-detalhes"')
    expect(detalhesIdx).toBeGreaterThan(-1)
    const afterDetalhes = page.slice(detalhesIdx)
    // Status longo só no buy-box (via summary); detalhes não reimprime o texto.
    expect(afterDetalhes).not.toMatch(/Incompatível com o veículo ativo/)
    expect(afterDetalhes).not.toMatch(/compatMotivo\(/)
  })

  it('Modal E.7: sheet mobile + centro desktop + slot footer', () => {
    const modal = readFileSync(src('components/common/Modal.tsx'), 'utf8')
    expect(modal).toMatch(/items-end/)
    expect(modal).toMatch(/md:items-center/)
    expect(modal).toMatch(/rounded-t-2xl/)
    expect(modal).toMatch(/md:rounded-2xl/)
    expect(modal).toMatch(/footer\?:/)
    expect(modal).toMatch(/safe-area-inset-bottom/)
  })

  it('ConfirmDialog e M32 usam ModalActions (CTAs únicos)', () => {
    const actions = readFileSync(src('components/common/ModalActions.tsx'), 'utf8')
    expect(actions).toMatch(/export function ModalActions/)
    expect(actions).toMatch(/flex-col gap-2/)
    expect(actions).toMatch(/sm:flex-row/)

    const confirm = readFileSync(src('components/common/ConfirmDialog.tsx'), 'utf8')
    expect(confirm).toMatch(/ModalActions/)

    const m32 = readFileSync(src('components/cart/ReplaceCartItemModal.tsx'), 'utf8')
    expect(m32).toMatch(/ModalActions/)
    expect(m32).toMatch(/footer=\{/)
  })

  it('Card: selo Incompatível entra no showSeal (não some no hide com label)', () => {
    const card = readFileSync(src('components/product/ProductCard.tsx'), 'utf8')
    expect(card).toMatch(/cardSeal\.kind !== 'hide' \|\| cardSeal\.label/)
    expect(card).toMatch(/CompatibilityStateBadge/)
  })

  it('Badge card trata hide com label (não retorna null cego)', () => {
    const badge = readFileSync(src('components/product/CompatibilityStateBadge.tsx'), 'utf8')
    expect(badge).toMatch(/hide: 'border-fal-danger/)
    expect(badge).toMatch(/seal\.kind === 'hide' && !seal\.label/)
  })
})

describe('compat UI anti-regressão (motor/copy)', () => {
  it('no_intersection → hide + label Incompatível (visível no card)', () => {
    expect(resolveCardSeal(incompatible)).toEqual({ kind: 'hide', label: 'Incompatível' })
    expect(compatSealDisplayLabel(incompatible)).toBe('Incompatível')
  })

  it('incompatível não exige confirmDialog de compra (só similar/check)', () => {
    expect(needsCompatPurchaseConfirm(incompatible)).toBe(false)
  })

  it('sem veredito → hide sem label (badge some)', () => {
    expect(resolveCardSeal(null)).toEqual({ kind: 'hide', label: '' })
  })
})
