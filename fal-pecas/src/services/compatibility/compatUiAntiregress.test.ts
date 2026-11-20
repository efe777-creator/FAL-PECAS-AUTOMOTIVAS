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

  it('PDP M1: container 1440 só via maxWidth pdp; grid 45/55; galeria 4:3', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    expect(page).toMatch(/maxWidth=\"pdp\"/)
    expect(page).toMatch(/45fr/)
    expect(page).toMatch(/55fr/)
    expect(page).toMatch(/lg:sticky/)

    const container = readFileSync(src('components/layout/Container.tsx'), 'utf8')
    expect(container).toMatch(/max-w-\[1440px\]/)
    expect(container).toMatch(/max-w-\[1240px\]/)

    const frame = readFileSync(src('components/product/ProductMediaFrame.tsx'), 'utf8')
    expect(frame).toMatch(/aspect-\[4\/3\]/)
  })

  it('PDP M2: hover zoom fino na galeria; lightbox contador + nav + Escape', () => {
    const gallery = readFileSync(src('components/product/ProductGallery.tsx'), 'utf8')
    expect(gallery).toMatch(/\(hover: hover\) and \(pointer: fine\)/)
    expect(gallery).toMatch(/scale\(2\)/)
    expect(gallery).toMatch(/transformOrigin/)
    expect(gallery).toMatch(/ProductImageLightbox/)

    const lightbox = readFileSync(src('components/product/ProductImageLightbox.tsx'), 'utf8')
    expect(lightbox).toMatch(/Imagem \{index \+ 1\} de \{urls\.length\}/)
    expect(lightbox).toMatch(/aria-live="polite"/)
    expect(lightbox).toMatch(/Escape/)
    expect(lightbox).toMatch(/ArrowRight/)
    expect(lightbox).toMatch(/ArrowLeft/)
    expect(lightbox).toMatch(/h-11/)
  })

  it('PDP M3: pag colapsável; compat antes do preço; copiar link; 1 âncora', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    const verdictIdx = page.indexOf('<CompatVerdictSummary')
    const priceIdx = page.indexOf('text-3xl font-black')
    const buyIdx = page.indexOf('onClick={onBuyNow}')
    expect(verdictIdx).toBeGreaterThan(-1)
    expect(priceIdx).toBeGreaterThan(verdictIdx)
    expect(buyIdx).toBeGreaterThan(priceIdx)
    expect(page).toMatch(/Copiar link/)
    expect(page).toMatch(/navigator\.clipboard/)
    expect(page.match(/href="#pdp-detalhes"/g)?.length).toBe(1)

    const pay = readFileSync(src('components/product/StorePaymentMethodsBlock.tsx'), 'utf8')
    expect(pay).toMatch(/<details/)
    expect(pay).toMatch(/Formas de pagamento/)
    expect(page).toMatch(/PaymentConditionHint/)
  })

  it('PDP M5: frete compacto CEP + Consultar; handoff preservado', () => {
    const ship = readFileSync(src('components/product/ProductShippingQuoteBlock.tsx'), 'utf8')
    expect(ship).toMatch(/Calcular frete/)
    expect(ship).toMatch(/Consultar/)
    expect(ship).toMatch(/variant="dark"/)
    expect(ship).toMatch(/saveShippingQuoteHandoff/)
    expect(ship).toMatch(/quoteStorefrontShippingEnvelope/)
    expect(ship).toMatch(/Digite seu CEP|placeholder="Digite seu CEP"/)
  })

  it('PDP M4: form local sem chip; sheet mobile; equiv cinza sem CTA', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    expect(page).toMatch(/localVehicleFilter/)
    expect(page).toMatch(/setLocalVehicleFilter/)
    expect(page).not.toMatch(/setActiveFilter/)
    expect(page).toMatch(/<VehicleSelector/)
    expect(page).toMatch(/onConfirm=\{\(filter\) => setLocalVehicleFilter\(filter\)\}/)
    expect(page).toMatch(/verifySheetOpen/)
    expect(page).toMatch(/Completar ano, motor ou versão/)
    expect(page).toMatch(/surface="equiv"/)
    expect(page).toMatch(/fitFilter=\{effectiveVehicleFilter\}/)

    const detalhesIdx = page.indexOf('id="pdp-detalhes"')
    const afterDetalhes = page.slice(detalhesIdx)
    expect(afterDetalhes).not.toMatch(/setVerifyApplied/)
    expect(afterDetalhes).not.toMatch(/Verificar nesta página/)

    const card = readFileSync(src('components/product/ProductCard.tsx'), 'utf8')
    expect(card).toMatch(/surface === 'equiv'/)
    expect(card).toMatch(/equivIncompatible/)
    expect(card).toMatch(/showPurchaseCtas/)
    expect(card).toMatch(/tone=\{equivIncompatible \? 'neutral' : 'default'\}/)

    const badge = readFileSync(src('components/product/CompatibilityStateBadge.tsx'), 'utf8')
    expect(badge).toMatch(/tone === 'neutral'/)
    expect(badge).toMatch(/CARD_STYLES_NEUTRAL_HIDE/)
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
