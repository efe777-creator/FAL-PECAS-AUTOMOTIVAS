# Relatório — Uso real Catálogo Adaptive

Data: 2026-11-21 · branch **`dev`** · sessão staff `127.0.0.1:5173`  
Spec: [FAL_SPEC_CATALOGO_PRECOS_WORKSPACE_2026-11-21.md](./FAL_SPEC_CATALOGO_PRECOS_WORKSPACE_2026-11-21.md) · VAL: [FAL_MARCHA_CATALOGO_ADAPTIVE_WORKSPACE_VAL_2026-11-21.md](./FAL_MARCHA_CATALOGO_ADAPTIVE_WORKSPACE_VAL_2026-11-21.md)

## Veredito

**Os três hubs Adaptive funcionam no uso real** (lista + guia + full). Domínio intocado.  
Há **ajustes de UX/densidade e 1 gap de spec** (criação rápida de produto na guia) antes de considerar a marcha “operador-pronta” sem atrito.

---

## Sessão executada

| Jornada | O que foi feito | Resultado |
|---------|-----------------|-----------|
| **Produtos** | Hub Adaptive → Abrir guia → ações (cadastro/listas/Liberar/available/arquivar) → seleção 2 → lote na guia (classificar/medidas) → filtro Kits → cadastro `/admin/kits/:id` → ficha abas | **PASS** |
| **Kits ficha** | Abas Geral…Logística; Composição com H2 + 3 itens + Enter/reorder/qty; Aplicações PVC (cascata montadora) | **PASS** |
| **Kits hub** | Novo kit (guia mínima código/nome/categoria); Abrir guia → BOM na guia; preço sugerido | **PASS** (com gaps UX abaixo) |
| **Preços** | Abrir guia Base → QuickAdjust + Abrir lista completa + Import; kits-manual só “Hub Kits” (sem Abrir guia); F8 4 abas | **PASS** |
| **Central** | `/admin/pedidos` Abrir guia → OrderOps (Geral/Itens/…) compact | **PASS** |
| **Painel KPI** | Fix `@container` 2×2 (sessão anterior) | **PASS** |
| **Promo** | Itens (98) / Kits (1) | **PASS** (sessão anterior) |
| **PDP kit preço** | Não E2E nesta rodada | **PENDENTE** |

---

## Gaps / melhorias (priorizados)

### P1 — atrito no uso diário

| # | Achado | Evidência | Ajuste sugerido |
|---|--------|-----------|-----------------|
| 1 | ~~Kits: form na guia intercepta lista~~ | — | **FIX v1.0.1** — cards no primary compact (`admin-kits-list-mobile`) |
| 2 | ~~BOM flash empty~~ | — | **FIX v1.0.1** — `loadingBom` / “Carregando composição…” |
| 3 | **Spec: “Novo SKU guia curta”** ainda só `/admin/produtos/novo` | Hub Produtos sem criação rápida na guia (só Kits tem) | Opcional **v1.1** |

### P2 — polish / vocabulário

| # | Achado | Ajuste |
|---|--------|--------|
| 4 | ~~Title Preços~~ | **FIX v1.0.1** — `Listas de preço \| Admin FAL` |
| 5 | ~~Hint Enter compact~~ | **FIX v1.0.1** — hint na composição compact |
| 6 | Multi-guia Produtos: código existe; smoke só 1 guia nesta sessão | Smoke `+ Guia` / 2 SKUs empilhados |
| 7 | Liberar no kit já disponível fica disabled (correto) — preflight menos visível na guia | Toast/checklist curto quando `!canRelease` |

### P3 — fora do núcleo / ok diferir

| # | Item | Nota |
|---|------|------|
| 8 | PDP kit preço vitrine | Regressão loja — smoke fino separado |
| 9 | Criar kit + linkar 2 itens **persistindo** rascunho novo | Não executado de propósito (evitar lixo no banco); form + BOM em kit existente cobrem o caminho |
| 10 | Edit preço na guia Base (salvar 1 célula) | QuickAdjust abriu com Editar; save pontual não exercitado E2E |

---

## Matriz Spec §10 (aceite)

| Critério | Status |
|----------|--------|
| Lista+guia sem perder filtros (produtos) | **PASS** (filtros visíveis com lote aberto) |
| Ações AS-IS alcançáveis | **PASS** (hubs + full + import links) |
| Criar kit + linkar na mesma sessão | **PARCIAL** (UI create+BOM ok; create+save+2 itens não persistido nesta rodada) |
| Picker BOM Enter/merge/reorder | **PASS** (ficha; guia usa mesmo section) |
| Apps PVC na ficha kit | **PASS** |
| Central split inalterado | **PASS** |
| Promo itens/kits | **PASS** |
| Preço vitrine | **PENDENTE** |

---

## Hotfix incluso nesta marcha (Painel)

Overlap KPI “Pedidos no período” com primary ~490px: breakpoints de viewport → 1 coluna.  
**Fix:** `@container` + `@min-[17rem]:grid-cols-2` / `@min-[36rem]:grid-cols-4` em `WidgetExecSummary`.

---

## Próximos passos recomendados (dev)

1. **P1.1** compact Kits — lista clicável com create/BOM aberto.  
2. **P1.2** loading state BOM na guia.  
3. Decidir **P1.3** (novo produto na guia) vs defer.  
4. Smoke PDP kit + save 1 preço na guia Base.  
5. Commit só sob pedido eFe · sem main.

**Assinatura:** uso real + estudo 2026-11-21.
