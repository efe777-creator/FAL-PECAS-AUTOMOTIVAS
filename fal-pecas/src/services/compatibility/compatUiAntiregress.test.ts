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

  it('Store dark: CartButton e tokens fg no .dark', () => {
    const cart = readFileSync(src('components/navigation/CartButton.tsx'), 'utf8')
    expect(cart).toMatch(/text-fal-navy dark:text-fal-fg/)

    const css = readFileSync(src('styles/index.css'), 'utf8')
    expect(css).toMatch(/\.dark\s*\{/)
    expect(css).toMatch(/--fal-fg:\s*#f3f5f7/i)
    expect(css).toMatch(/--fal-bg:\s*#0e1116/i)
    expect(css).toMatch(/--color-fal-fg:\s*var\(--fal-fg\)/)
  })

  it('Card M15: selo após título (não overlay); Kit nas infos; -N% na mídia; Incompatível visível', () => {
    const card = readFileSync(src('components/product/ProductCard.tsx'), 'utf8')
    expect(card).toMatch(/cardSeal\.kind !== 'hide' \|\| cardSeal\.label/)
    expect(card).toMatch(/CompatibilityStateBadge/)
    expect(card).not.toMatch(/pointer-events-none absolute[\s\S]*CompatibilityStateBadge/)
    const titleIdx = card.indexOf('title={displayName}')
    const sealIdx = card.indexOf('<CompatibilityStateBadge')
    const refIdx = card.indexOf('formatReferenciaFromProduct(product)')
    expect(titleIdx).toBeGreaterThan(-1)
    expect(sealIdx).toBeGreaterThan(titleIdx)
    expect(refIdx).toBeGreaterThan(sealIdx)
    // Overlay da mídia = só -N% (promo); Kit fica nas infos acima do título.
    const mediaBlockIdx = card.indexOf('absolute top-2 left-2 z-[1]')
    expect(mediaBlockIdx).toBeGreaterThan(-1)
    expect(mediaBlockIdx).toBeLessThan(titleIdx)
    expect(card).toMatch(/showMediaPct/)
    expect(card).toMatch(/formatDiscountPercentLabel/)
    expect(card).not.toMatch(/formatOfertaBadgeLabel/)
    const kitIdx = card.indexOf('variant="kit"')
    expect(kitIdx).toBeGreaterThan(mediaBlockIdx)
    expect(kitIdx).toBeLessThan(titleIdx)
    expect(card).toMatch(/variant="promo"/)
    expect(card).toMatch(/shadow-none/)
    const badge = readFileSync(src('components/common/Badge.tsx'), 'utf8')
    expect(badge).toMatch(/BadgeVariant/)
    expect(badge).toMatch(/kit:/)
    expect(badge).toMatch(/promo:/)
  })

  it('Card Notes #7 CTAs: wrappers sm (sem hidden no Button — evita vazamento inline-flex)', () => {
    const card = readFileSync(src('components/product/ProductCard.tsx'), 'utf8')
    expect(card).toMatch(/flex flex-col gap-1\.5 sm:hidden/)
    expect(card).toMatch(/hidden sm:flex sm:flex-col sm:gap-2/)
    expect(card).not.toMatch(/hidden sm:inline-flex/)
    expect(card).not.toMatch(/className="sm:hidden"/)
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

    // Veredito/Trocar só no buy-box — acordeão apps não ecoa veículo+Trocar.
    const accordionSlice = page.slice(accIdx, page.indexOf('</PdpAccordion>') + 20)
    expect(accordionSlice).not.toMatch(/>Trocar</)
    expect(accordionSlice).not.toMatch(/Veículo:/)
    expect(accordionSlice).not.toMatch(/to="\/garagem"/)

    // Notes #9: PDP não usa rota morta /garagem; Ver mais preserva veículo.
    expect(page).not.toMatch(/to="\/garagem"/)
    expect(page).toMatch(/to="\/conta\/veiculos"/)
    expect(page).toMatch(/buildCatalogBrowseHref/)
    expect(page).toMatch(/filter:\s*effectiveVehicleFilter/)

    const acc = readFileSync(src('components/product/PdpAccordion.tsx'), 'utf8')
    expect(acc).toMatch(/aria-expanded/)

    const cart = readFileSync(src('pages/Cart/CartPage.tsx'), 'utf8')
    expect(cart).not.toMatch(/navigate\('\/garagem'/)
    expect(cart).toMatch(/navigate\('\/conta\/veiculos'/)

    const router = readFileSync(src('app/router.tsx'), 'utf8')
    expect(router).toMatch(/path:\s*'garagem'/)
    expect(router).toMatch(/Navigate to="\/conta\/veiculos"/)
  })

  it('Cart layout P0: sticky mobile CTAs; total empilhado mobile; sem Ver produto redundante', () => {
    const cart = readFileSync(src('pages/Cart/CartPage.tsx'), 'utf8')
    expect(cart).toMatch(/STICKY_BOTTOM|bottom-\[calc\(56px/)
    expect(cart).toMatch(/flex-col gap-2\.5/)
    expect(cart).not.toMatch(/w-\[min\(100%,220px\)\]/)
    expect(cart).toMatch(/hidden lg:block/)
    expect(cart).toMatch(/sm:grid-cols-\[86px_minmax\(0,1fr\)_auto\]/)
    expect(cart).toMatch(/text-sm font-black text-fal-ink sm:hidden/)
    expect(cart).not.toMatch(/>\s*Ver produto\s*</)
    expect(cart).toMatch(/Continuar comprando/)
  })

  it('Cart frete UI: padrão PDP M5 (Calcular frete + CEP + Consultar); motor conjunto intacto', () => {
    const ship = readFileSync(src('components/cart/CartShippingQuoteBlock.tsx'), 'utf8')
    expect(ship).toMatch(/Calcular frete/)
    expect(ship).toMatch(/Consultar/)
    expect(ship).toMatch(/variant="dark"/)
    expect(ship).toMatch(/Digite seu CEP|placeholder="Digite seu CEP"/)
    expect(ship).toMatch(/loadCartLogistics/)
    expect(ship).toMatch(/quoteStorefrontShippingEnvelope/)
    expect(ship).toMatch(/saveShippingQuoteHandoff/)
    expect(ship).not.toMatch(/Consultar fretes/)
    expect(ship).not.toMatch(/Entrega e frete/)
    expect(ship).not.toMatch(/Nº \(frete próprio\)/)
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

  it('PDP M4: verify compat via mini-menu (placa|manual); sheet mobile; equiv cinza sem CTA', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    expect(page).toMatch(/localVehicleFilter/)
    expect(page).toMatch(/setLocalVehicleFilter/)
    expect(page).not.toMatch(/setActiveFilter/)
    expect(page).toMatch(/verifyCompatOpen/)
    expect(page).toMatch(/Verificar compatibilidade/)
    expect(page).toMatch(/VehiclePlateSearch/)
    expect(page).toMatch(/localOnly/)
    expect(page).toMatch(/verifySheetOpen/)
    expect(page).toMatch(/Completar ano, motor ou versão/)
    expect(page).toMatch(/surface="equiv"/)
    expect(page).toMatch(/fitFilter=\{effectiveVehicleFilter\}/)
    expect(page).toMatch(/listIntelligentRelatedForPdp/)
    expect(page).toMatch(/relatedPvcById/)
    // Seção related também passa fit + pvc batch (não só equiv).
    expect(page).toMatch(/related\.map\(\(item\) => \(/)
    expect(page).toMatch(/pvcRows=\{\s*\n\s*effectiveVehicleFilter/)

    // Acordeão não embute o seletor; buy-box usa botão + modal.
    const accStart = page.indexOf('<PdpAccordion')
    expect(accStart).toBeGreaterThan(-1)
    const accordionSlice = page.slice(accStart, page.indexOf('</PdpAccordion>') + 20)
    expect(accordionSlice).not.toMatch(/VehiclePlateSearch/)
    expect(accordionSlice).not.toMatch(/Verificar compatibilidade/)
    // Form embutido antigo (sempre aberto) não deve voltar.
    expect(page).not.toMatch(/title="Informar veículo"/)

    // Hierarquia textos: disclaimer de garagem 1× no modal; emptyHint sem eco.
    expect(page).toMatch(/emptyHint="Verifique a compatibilidade pela placa ou seleção manual\."/)
    expect(page).not.toMatch(/Placa ou montadora\/modelo — só nesta página\./)
    const modalDisclaimerHits = page.match(
      /Só nesta página — não altera a Minha Garagem\.|Só reavalia esta página — não altera o veículo ativo no header\./g,
    )
    expect(modalDisclaimerHits?.length).toBe(2)

    // Badge Marca; sem Fabricante eco na linha de referência.
    expect(page).toMatch(/Marca: \{brandName\}/)
    expect(page).not.toMatch(/FABRICANTE_LABEL/)

    const plate = readFileSync(src('components/vehicle/VehiclePlateSearch.tsx'), 'utf8')
    expect(plate).toMatch(/localOnly/)
    expect(plate).toMatch(/if \(localOnly\)/)
    // Manual localOnly não repete disclaimer de garagem (já no modal PDP).
    expect(plate).not.toMatch(
      /localOnly\s*\n\s*\? 'Só para esta página — não altera o veículo ativo na Minha Garagem\.'/,
    )

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

  it('PDP related intelligence: wiring único + sem pad de categoria + localOnly não muta garagem', () => {
    const page = readFileSync(src('pages/Product/ProductPage.tsx'), 'utf8')
    // Um caminho: inteligência direta; sem mergeRelatedProducts legado na PDP.
    expect(page).toMatch(/listIntelligentRelatedForPdp/)
    expect(page).not.toMatch(/mergeRelatedProducts/)
    expect(page).not.toMatch(/listRelatedProductsForPdp/)
    expect(page).toMatch(/vehicleFilter: effectiveVehicleFilter/)
    expect(page).toMatch(/loadPvcEvidenceByProductIds/)

    const svc = readFileSync(src('services/products/productService.ts'), 'utf8')
    expect(svc).toMatch(/listIntelligentRelatedForPdp/)
    expect(svc).toMatch(/relatedProductsIntelligence/)
    // listRelatedProductsForPdp permanece só como fachada delegada.
    expect(svc).toMatch(/export async function listRelatedProductsForPdp/)

    const intel = readFileSync(src('services/products/relatedProductsIntelligence.ts'), 'utf8')
    expect(intel).toMatch(/isEligibleRelatedRow/)
    expect(intel).toMatch(/isOppositeSidePair/)
    expect(intel).toMatch(/countPvcOverlap/)
    expect(intel).toMatch(/rankRelatedCandidates/)
    // Qualidade > quantidade: não preenche com check/categoria irrelevante.
    expect(intel).toMatch(/export function isEligibleRelatedRow/)

    const plate = readFileSync(src('components/vehicle/VehiclePlateSearch.tsx'), 'utf8')
    // Early-return localOnly antes de syncActiveToFilter / saveToGarage.
    const localOnlyIdx = plate.indexOf('if (localOnly)')
    const syncIdx = plate.indexOf('syncActiveToFilter(next)', localOnlyIdx)
    const returnIdx = plate.indexOf('return', localOnlyIdx)
    expect(localOnlyIdx).toBeGreaterThan(-1)
    expect(returnIdx).toBeGreaterThan(localOnlyIdx)
    expect(syncIdx).toBeGreaterThan(returnIdx)
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
