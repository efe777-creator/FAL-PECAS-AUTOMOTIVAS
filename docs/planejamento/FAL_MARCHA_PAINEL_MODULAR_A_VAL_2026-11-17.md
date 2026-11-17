# MARCHA VAL — Painel Modular Avançado (Marcha A)

**Data:** 2026-11-17  
**Spec:** [2026-11-17-painel-modular-avancado-design.md](../superpowers/specs/2026-11-17-painel-modular-avancado-design.md)

## Entregue

| Item | Status |
|------|--------|
| Spec + glossário financeiro pré-B | PASS |
| Layout versionado localStorage (chave separada dos pins) | PASS |
| Registry available/active + roles F8/caixa | PASS |
| DataProvider falha isolada + refresh manual | PASS |
| react-grid-layout 2.3.0 + edit mode + breakpoints | PASS |
| Widgets extraídos do monólito | PASS |
| Sem charts / shadcn / tabela Supabase | PASS |

## Testes automatizados

```bash
cd fal-pecas && npx vitest run src/lib/adminDashboardLayout.test.ts src/lib/adminDashboardWidgets.test.ts src/lib/adminDashboardPrefs.test.ts
```

Esperado: layout sanitize/fallback/dedupe/empty + auth F8 + pins.

## Smoke manual (eFe)

1. `/admin` dark/light — grade carrega; Atualizar muda timestamp  
2. Personalizar → drag handle / resize / Remover → Concluir → F5 persiste  
3. + Widget só lista autorizados; operador sem caixa/GMV  
4. Reset layout restaura Ops-first  
5. Nenhum controle muda status/etiqueta  
6. Mobile: 1 coluna, sem drag  

## Marcha B (não nesta entrega)

RPC diária + Recharts + seletor de período.
