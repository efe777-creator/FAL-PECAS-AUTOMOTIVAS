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

  it('Card M15: selo após título (não overlay); Oferta absoluta na foto; Incompatível visível', () => {
    const card = readFileSync(src('components/product/ProductCard.tsx'), 'utf8')
    expect(card).toMatch(/cardSeal\.kind !== 'hide' \|\| cardSeal\.label/)
    expect(card).toMatch(/CompatibilityStateBadge/)
    // Gate: selo NÃO volta para cima da foto (não tapa Oferta/peça).
    expect(card).not.toMatch(/absolute top-2 left-2[\s\S]*CompatibilityStateBadge/)
    expect(card).not.toMatch(/pointer-events-none absolute[\s\S]*CompatibilityStateBadge/)
    const titleIdx = card.indexOf('title={displayName}')
    const sealIdx = card.indexOf('<CompatibilityStateBadge')
    const refIdx = card.indexOf('formatReferenciaFromProduct(product)')
    expect(titleIdx).toBeGreaterThan(-1)
    expect(sealIdx).toBeGreaterThan(titleIdx)
    expect(refIdx).toBeGreaterThan(sealIdx)
    // Oferta permanece no canto da mídia.
    expect(card).toMatch(/showOfertaBadge/)
    expect(card).toMatch(/absolute top-3\.5 left-3\.5/)
    expect(card).toMatch(/formatOfertaBadgeLabel/)
    expect(card).toMatch(/shadow-none/)
  })

  it('PDP M1: container 1440 só via maxWidth pdp; grid 55/45; galeria 4:3', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    expect(page).toMatch(/maxWidth=\"pdp\"/)
    expect(page).toMatch(/minmax\(0,55fr\).*minmax\(0,45fr\)/s)
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
    const priceIdx = page.indexOf('formatStorePriceLabel(storefrontPrice, listPrice)')
    // Ignora import: usa a ocorrência no JSX do buy-box (depois do CompatVerdictSummary).
    const priceJsxIdx = page.indexOf(
      'formatStorePriceLabel(storefrontPrice, listPrice)',
      verdictIdx,
    )
    const buyIdx = page.indexOf('onClick={onBuyNow}')
    expect(verdictIdx).toBeGreaterThan(-1)
    expect(priceJsxIdx).toBeGreaterThan(verdictIdx)
    expect(buyIdx).toBeGreaterThan(priceJsxIdx)
    expect(priceIdx).toBeGreaterThan(-1)
    expect(page).toMatch(/Copiar link/)
    expect(page).toMatch(/navigator\.clipboard/)
    expect(page.match(/href="#pdp-detalhes"/g)?.length).toBe(1)

    const pay = readFileSync(src('components/product/StorePaymentMethodsBlock.tsx'), 'utf8')
    expect(pay).toMatch(/<details/)
    expect(pay).toMatch(/Formas de pagamento/)
    expect(page).toMatch(/PaymentConditionHint/)
  })

  it('PDP M8: thumb amarela; lupa na mídia; veredito framed rounded-fal', () => {
    const gallery = readFileSync(src('components/product/ProductGallery.tsx'), 'utf8')
    expect(gallery).toMatch(/border-fal-yellow/)
    expect(gallery).toMatch(/viewBox="0 0 24 24"/)

    const summary = readFileSync(src('components/product/CompatVerdictSummary.tsx'), 'utf8')
    expect(summary).toMatch(/rounded-fal/)
    expect(summary).toMatch(/dark:bg-fal-success\/15/)
  })

  it('PDP M7: badge marca; Add primary + Comprar dark; Favoritar/WA; barra mobile', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    expect(page).toMatch(/Marca: \{brandName\}/)
    expect(page).toMatch(/PdpPurchaseBar/)
    expect(page).toMatch(/variant="primary"[\s\S]*?onClick=\{onAddToCart\}/)
    expect(page).toMatch(/variant="dark"[\s\S]*?onClick=\{onBuyNow\}/)
    expect(page).toMatch(/Favoritar/)
    expect(page).toMatch(/Alterar veículo/)
    expect(page).toMatch(/55fr/)
    expect(page).not.toMatch(/absolute top-4 right-4.*Favoritar/s)

    const bar = readFileSync(src('components/product/PdpPurchaseBar.tsx'), 'utf8')
    expect(bar).toMatch(/onBuyNow/)
    expect(bar).toMatch(/lg:hidden/)
    expect(bar).toMatch(/COMPRAR_AGORA_LABEL/)
  })

  it('PDP M6: acordeões sob galeria; 4 seções; sem eco veredito', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    expect(page).toMatch(/PdpAccordion/)
    expect(page).toMatch(/Aplicação e compatibilidade/)
    expect(page).toMatch(/Conteúdo da embalagem/)
    expect(page).toMatch(/id="pdp-detalhes"/)
    // Fonte: galeria → buy-box → acordeão; CSS order + lg:col garante layout.
    const galleryIdx = page.indexOf('<ProductGallery')
    const buyStickyIdx = page.indexOf('lg:sticky lg:top-20')
    const accIdx = page.indexOf('<PdpAccordion')
    expect(galleryIdx).toBeGreaterThan(-1)
    expect(buyStickyIdx).toBeGreaterThan(galleryIdx)
    expect(accIdx).toBeGreaterThan(buyStickyIdx)
    expect(page).toMatch(/order-1/)
    expect(page).toMatch(/order-2/)
    expect(page).toMatch(/order-3/)
    expect(page).toMatch(/lg:col-start-1 lg:row-start-2/)

    const acc = readFileSync(src('components/product/PdpAccordion.tsx'), 'utf8')
    expect(acc).toMatch(/aria-expanded/)
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

  it('PDP M13: disponível+qty antes do frete; grid 55/45; thumbs verticais lg', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    const availIdx = page.indexOf('✓</span> Disponível')
    const shipIdx = page.indexOf('<ProductShippingQuoteBlock')
    const addIdx = page.indexOf('onClick={onAddToCart}')
    expect(availIdx).toBeGreaterThan(-1)
    expect(shipIdx).toBeGreaterThan(availIdx)
    expect(addIdx).toBeGreaterThan(shipIdx)
    expect(page).toMatch(/minmax\(0,55fr\).*minmax\(0,45fr\)/s)

    const gallery = readFileSync(src('components/product/ProductGallery.tsx'), 'utf8')
    expect(gallery).toMatch(/lg:flex-col/)
    expect(gallery).toMatch(/lg:flex-row/)
  })

  it('PDP M14: densidade fold + tokens FAL + CTAs primary→dark + frete compacto', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    expect(page).toMatch(/py-2 sm:py-3/)
    expect(page).toMatch(/lg:sticky lg:top-20/)
    expect(page).toMatch(/variant="primary"[\s\S]*?h-10[\s\S]*?onClick=\{onAddToCart\}/)
    expect(page).toMatch(/variant="dark"[\s\S]*?h-10[\s\S]*?onClick=\{onBuyNow\}/)
    expect(page).not.toMatch(/StorePaymentMethodsBlock/)
    expect(page).toMatch(/PdpPaymentIcons/)
    expect(page).toMatch(/order-1/)
    expect(page).toMatch(/order-2/)
    expect(page).toMatch(/order-3/)

    const icons = readFileSync(src('components/product/PdpPaymentIcons.tsx'), 'utf8')
    expect(icons).toMatch(/min-height:820px/)
    expect(icons).toMatch(/Formas de pagamento aceitas/)

    const ship = readFileSync(src('components/product/ProductShippingQuoteBlock.tsx'), 'utf8')
    expect(ship).toMatch(/Preferir retirada na loja/)
    expect(ship).toMatch(/showShipOptions/)
    expect(ship).toMatch(/pdp-shipping-cep/)

    const css = readFileSync(src('styles/index.css'), 'utf8')
    expect(css).toMatch(/--fal-yellow:\s*#f2c84b/i)
    expect(css).toMatch(/--fal-navy:\s*#303846/i)
    expect(css).toMatch(/--fal-bg:\s*#f4f6f7/i)
    expect(css).toMatch(/--fal-bg:\s*#0e1116/i)
    expect(css).toMatch(/--fal-fg:\s*#f3f5f7/i)
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

    // Acordeão não embute o form local; VehicleSelector fica no buy-box.
    const accStart = page.indexOf('<PdpAccordion')
    expect(accStart).toBeGreaterThan(-1)
    const accordionSlice = page.slice(accStart, page.indexOf('</PdpAccordion>') + 20)
    expect(accordionSlice).not.toMatch(/VehicleSelector/)
    expect(accordionSlice).not.toMatch(/Verificar nesta página/)
    expect(page).toMatch(/Verificar nesta página/)

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
