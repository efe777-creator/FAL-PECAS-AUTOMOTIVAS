# VAL — Marcha 3: Trocar peça M32

**Data:** 2026-11-19 · **Branch:** `dev`  
**Canônico:** E.4 Trocar peça (M32)  
**Pré-req:** gate E.4 + avisos cart/checkout

## Aceite

| Critério | Status |
|----------|--------|
| Lista só Compatível / Compatível similar | PASS (código + vitest) |
| Prefere mesma categoria; exclui origem e itens do carrinho | PASS (código) |
| Modal Substituir no carrinho | PASS (código) |
| Linha incompatível no cart → Trocar peça | PASS (código) |
| Gate incompatível → cancel = abre modal do 1º item | PASS (código) |

## Comandos

```bash
npx vitest run src/services/compatibility/
```

## Smoke

1. Fit ativo + peça incompatível no carrinho → badge Incompatível + **Trocar peça**.
2. Modal lista alternativas; escolher → Substituir → item trocado.
3. Finalizar com incompatível → cancelar com “Trocar no carrinho” → abre modal.

**Assinatura:** MARCHA 3 Trocar peça M32 · 2026-11-19
