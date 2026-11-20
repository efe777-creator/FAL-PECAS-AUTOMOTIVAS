# VAL — Marcha 2: gate E.4 + form PDP + decision log lite

**Data:** 2026-11-19 · **Branch:** `dev`  
**Canônico:** E.2 (form) · E.4 (gate) · E.5 (log no snapshot jsonb)  
**Pré-req:** `FAL_MARCHA_COMPAT_AVISOS_CARD_PDP_CHECKOUT_VAL_2026-11-19.md`

## Aceite

| Critério | Status |
|----------|--------|
| Carrinho Finalizar → gate se há similar/A verificar/incompatível | PASS (código) |
| Continuar grava session log; Voltar aborta | PASS (código) |
| Checkout buy-now sem gate prévio → gate no submit | PASS (código) |
| placeOrder anexa `compatDecision` no `vehicle_snapshot` | PASS (código) |
| PDP: form ano+motor+versão + Verificar sem mudar chip | PASS (código) |
| Trocar peça M32 (lista substitutos) | FORA (próxima) |

## Comandos

```bash
npx vitest run src/services/compatibility/
```

## Smoke

1. Fit ativo + item A verificar no carrinho → Finalizar abre gate → Continuar → checkout.
2. Cancelar no gate → permanece no carrinho.
3. Buy now similar → no pagar, gate se ainda não gated.
4. PDP com A verificar → preencher motor → Verificar → badge atualiza; chip header intacto.

**Assinatura:** MARCHA 2 gate E.4 + PDP form + log lite · 2026-11-19
