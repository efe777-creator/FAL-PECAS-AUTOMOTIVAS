# FAL — VAL Marcha 14 (medidas + antiregresso)

**Data:** 2026-11-20  
**Branch:** `dev`  
**Rota:** `/produto/tdi1002`  
**Antiregress:** **37/37 PASS** (novo contrato `PDP M14`)

---

## Medidas (browser)

| Viewport | leftPct | fold Add | fold Comprar | Cores CTA | Notas |
|----------|---------|----------|--------------|-----------|-------|
| 1440×900 | **55** | OK | OK | Add `#f2c84b` / Comprar `#303846` | order disponível→frete→CTAs OK |
| 1366×768 | **55** | OK | **OK** | idem | ícones pagamento `display:none`; microcorte `space-y-1` |
| Tokens CSS | — | — | — | yellow `#f2c84b`, navy `#303846`, bg light `#f4f6f7` / dark `#0e1116` | travados no M14 |

---

## Contratos antiregress M14 (fonte)

- Densidade: `py-2 sm:py-3`, sticky `lg:top-20`, CTAs `h-10`
- Grid canônico `minmax(0,55fr)_minmax(0,45fr)` (M1 atualizado)
- Sem `StorePaymentMethodsBlock` no buy first-paint; `PdpPaymentIcons` com gate `min-height:820px`
- Frete: `Preferir retirada` + `showShipOptions` + `pdp-shipping-cep`
- Tokens `--fal-yellow/navy/bg/fg` light+dark em `index.css`
- Ordem mobile `order-1/2/3` preservada

---

## Veredito

Medidas alinhadas à referência de densidade; **Comprar agora** entra na dobra em 768h. Antiregress reforçado para impedir regressão de proporção/cores/densidade.
