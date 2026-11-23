/**
 * Anti-regressão: controle ± do carrinho no ProductCard.
 * Já sumiu uma vez (chip “No carrinho: N” sem stepper) — não pode sumir de novo.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')
const card = readFileSync(
  resolve(root, 'src/components/product/ProductCard.tsx'),
  'utf8',
)

describe('ProductCard carrinho anti-regressão', () => {
  it('usa updateQty do CartContext (não só addItem)', () => {
    expect(card).toMatch(/const \{ items, addItem, updateQty \} = useCart\(\)/)
    expect(card).toMatch(/function onDecreaseQty\(/)
    expect(card).toMatch(/async function onIncreaseQty\(/)
    expect(card).toMatch(/updateQty\(product\.id, cartQty - 1\)/)
  })

  it('com item no carrinho: stepper ± com testids e aria-labels (não só chip)', () => {
    expect(card).toMatch(/showPurchaseCtas && inCart/)
    expect(card).toMatch(/data-testid="product-card-cart-qty"/)
    expect(card).toMatch(/data-testid="product-card-cart-dec"/)
    expect(card).toMatch(/data-testid="product-card-cart-inc"/)
    expect(card).toMatch(/aria-label="Diminuir quantidade"/)
    expect(card).toMatch(/aria-label="Aumentar quantidade"/)
    expect(card).toMatch(/onClick=\{onDecreaseQty\}/)
    expect(card).toMatch(/onClick=\{\(e\) => void onIncreaseQty\(e\)\}/)
    expect(card).toMatch(/>\s*−\s*</)
    expect(card).toMatch(/>\s*\+\s*</)
    expect(card).toMatch(/No carrinho/)
    expect(card).toMatch(/\{cartQty\}/)
    // Regressão clássica: chip estático sem controle
    expect(card).not.toMatch(/No carrinho:\s*\{cartQty\}/)
  })

  it('Adicionar ao carrinho some quando já está no carrinho; Comprar agora permanece', () => {
    expect(card).toMatch(/!inCart\s*\?\s*\(/)
    expect(card).toMatch(/ADICIONAR_AO_CARRINHO_LABEL/)
    expect(card).toMatch(/COMPRAR_AGORA_LABEL/)
    expect(card).toMatch(/onClick=\{onBuyNow\}|onClick=\{\(e\) => void onBuyNow\(e\)\}/)
  })

  it('aumento de qty no stepper confirma compat e rastreia add_to_cart', () => {
    const incIdx = card.indexOf('async function onIncreaseQty')
    expect(incIdx).toBeGreaterThan(-1)
    const block = card.slice(incIdx, incIdx + 500)
    expect(block).toMatch(/confirmCompatIfNeeded\('add'\)/)
    expect(block).toMatch(/addItem\(product, 1\)/)
    expect(block).toMatch(/trackAddToCart/)
  })

  it('diminuição zera via updateQty (remove do carrinho quando qty chega a 0)', () => {
    const decIdx = card.indexOf('function onDecreaseQty')
    expect(decIdx).toBeGreaterThan(-1)
    const block = card.slice(decIdx, decIdx + 220)
    expect(block).toMatch(/updateQty\(product\.id, cartQty - 1\)/)
    expect(block).not.toMatch(/addItem/)
  })
})
