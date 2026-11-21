# FAL Marcha — UI Layout v1.1.0 Aplicações VAL

**Data:** 2026-11-21 · Branch: **`dev`**  
**Padrão:** FAL-UI-LAYOUT **v1.1.0** (MINOR)  
**Estudo:** [FAL_ESTUDO_APLICACOES_WORKSPACE_TOBE_2026-11-21.md](./FAL_ESTUDO_APLICACOES_WORKSPACE_TOBE_2026-11-21.md)  
**Resultado:** **PASS** (smoke UI + antiregress)

## Entrega

Hub `/admin/aplicacoes` no zin Adaptive:

| Peça | Contrato |
|------|----------|
| Shell | `AdaptiveWorkspace` `moduleKey="applications"` |
| Primary | Lista + filtros compactos + Abrir guia / + Guia |
| Contextual | `ApplicationWorkSurface` (criar / período / veículo / bulk) |
| Import | CTA → importar-aplicacoes (fora do split) |

## Garantia automatizada

```bash
pnpm test:ui-layout-antiregress   # 25/25 PASS
pnpm exec tsc --noEmit            # TSC_OK
```

Locks **FL16** · **FL17**.

## Smoke (uso real · 127.0.0.1:5173)

- [x] Filtros compactos; Mais filtros → Recolher; chip `Montadora: Renault`; botão `Filtros (1)`
- [x] Abrir guia → superfície PVC (resumo · período · trocar veículo · Abrir cadastro · Excluir)
- [x] Editar período → PATCH `product_vehicle_compatibility` **204** + reload lista
- [x] Nova aplicação **na guia** (`Nova aplicação na guia`; sem form mid-page)
- [x] + Guia empilha 2 apps (Sandero + Logan · Guias abertas)
- [x] Excluir na guia (lote): seleção → guia `Lote · 1` com CTA Excluir seleção (**não executado** delete destrutivo)
- [x] Guia Produto → Hub Aplicações `?q=PVI1035` (input + URL)
- [x] Import planilha → `/admin/produtos/importar-aplicacoes`
- [x] Central / Painel regressão (Adaptive + Abrir guia / KPI)

## Usabilidade observada

| Achado | Severidade | Nota |
|--------|------------|------|
| Viewport ~745px: guia em overlay (primary compact) | info | Comportamento Adaptive esperado |
| Motorização/Versão vazias quando configs sem `engine` | baixo | Swap maker/modelo preenche; refinar motor só quando houver opções |
| Toast de sucesso some rápido | info | Ação confirmada pelo network 204 |
| `q=` não vira chip (só montadora/modelo/motor/versão) | info | Alinhado ao código atual; busca permanece no input |

## Fora deste VAL

- Delete real unitário/lote (confirm dialog)
- Swap veicular completo com persistência
- Cascata compartilhada hub↔ficha (Fase 3 backlog)

**Assinatura:** marcha Aplicações Adaptive v1.1 · VAL PASS · 2026-11-21 · eFe / Cursor
