# VAL — Painel drag PC/mobile + scroll Central

Data: 2026-11-17  
Branch: `dev`  
Spec: `docs/superpowers/specs/2026-11-17-painel-mobile-personalizar-design.md`

## Critérios

| Critério | Resultado |
|----------|-----------|
| Drag ligado em edição em **todos** os breakpoints (não só ≥768) | PASS (código) |
| Breakpoint derivado de `width` do container | PASS |
| Alça ⋮⋮ com `touch-action: none` + hit ≥44px | PASS |
| Draft até Salvar; Cancelar restaura; Salvar só se dirty | PASS |
| Barra inferior fixa Cancelar/Salvar no `sm` | PASS |
| Highlight combinação (borda + fundo + ring) em edição | PASS |
| Ordem sm/md → shelf pack lg (`applyBreakpointOrderToLgLayout`) | PASS (unit) |
| Banner não diz mais “mobile sem drag” | PASS |
| Lista Central: `fal-admin-scroll` + `max-h-[min(60dvh,640px)]` | PASS |
| Unit layout helpers | a rodar no smoke |

## Smoke manual

1. PC (≥1024 ou área útil estreita com sidebar): Personalizar → arrastar ⋮⋮ → Salvar → F5.  
2. Phone: Personalizar → arrastar ⋮⋮ (coluna) → Cancelar descarta; Salvar grava.  
3. Central `/admin/pedidos`: muitos pedidos → scroll **dentro** da caixa; barra visível.

## Nota sintoma A

Causa raiz provável: `dragEnabled = editing && !isMobile` com `isMobile` pela largura do **container** (&lt;768 com sidebar) desligava o drag no “PC”. Corrigido: `dragEnabled = editing`.
