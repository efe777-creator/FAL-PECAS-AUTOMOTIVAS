# FAL — Plano · Facilitar alteração pelas guias Adaptive

**Data:** 2026-11-21 · **Branch:** `dev`  
**Status:** **ESTUDO / PLANEJAMENTO** (sem implementação nesta marcha)  
**Intenção (eFe):** a guia deve ser o caminho natural para **alterar** categoria, aplicação e preços — menos saltos para ficha completa / hubs só para “ver”.  
**REF Notes:** [FAL_ANALISE_ERROS_NOTES_211136_REF_2026-11-21.md](./FAL_ANALISE_ERROS_NOTES_211136_REF_2026-11-21.md) (trilha paralela; #4 archive/filtro se alinha à guia Produto)  
**VAL pontes existentes:** [FAL_MARCHA_UI_LAYOUT_v111_PONTES_GUIA_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v111_PONTES_GUIA_VAL_2026-11-21.md)

---

## 1. O que já existe (mapa)

| Hub | WorkSurface | O que a guia já edita | O que a guia só ponteia |
|-----|-------------|----------------------|-------------------------|
| **Produtos** | `ProductWorkSurface` | Identidade, **Preço Lista Base**, **Categoria** (cascata) | Aplicações (lista + “Abrir guia”), Kits, Relacionados |
| **Aplicações** | `ApplicationWorkSurface` | Criar / período / trocar veículo / bulk | Produto (bridge `PRODUCTS_OPEN_GUIDE_KEY` + ficha) |
| **Classificação** | `CategoryWorkSurface` | Criar/editar cat/grupo/subgrupo + medidas default | — (é o destino da cascata) |
| **Preços** | `PriceListWorkSurface` | Consulta + ajuste rápido (`PriceListQuickAdjustPanel`) | Lista completa / formação / import |
| **Kits** | `KitWorkSurface` | Composição/preço kit | — |

**Infra comum**

- Shell: `AdaptiveWorkspace` (split / expanded / fullscreen + prefs por módulo).
- Pontes one-shot: `adminGuideBridges.ts` → `products` · `applications` · `kits` (sessionStorage).
- Seções produto: `fal.products.guideSections` (default aberto: `identidade` + `preco` — **categoria/aplicações começam fechadas**).

---

## 2. Diagnóstico de fricção (alterar pela guia)

### Alta (bate na intenção)

1. **Aplicações no produto = só leitura + salto**  
   Na guia Produto não dá para editar ano/motor/versão nem adicionar PVC; só “Abrir guia” → hub Aplicações. Quebra o fluxo “estou no produto, ajusto aplicação”.

2. **Preço na guia Produto = só Lista Base**  
   Promo / outras listas / formação ficam no hub Preços. Sem ponte `PRICES_OPEN_GUIDE_KEY` + SKU focado, o operador sai do contexto do item.

3. **Seções críticas fechadas por default**  
   Categoria e aplicações não abrem sozinhas → descoberta fraca para a intenção “alterar classificação/PVC”.

### Média

4. **Bridges incompletos**  
   Falta `PRICES_OPEN_GUIDE_KEY` e `CATEGORIES_OPEN_GUIDE_KEY` (ou deep-link `?guide=` / `?focus=`). Classificação não “recebe” foco a partir do produto.

5. **Vocabulário misto**  
   “Abrir guia” / “Cadastro completo” / “Gerir no cadastro” / “Hub X” — ok após v1.1.1, mas ainda exige saber qual hub edita o quê.

6. **Cascata PVC na guia Apps**  
   Loads sequenciais maker→model→versions (já atenuado pelo cache #3 da árvore loja; admin ainda usa `adminListModels`/`adminListVersions` por passo).

### Baixa / fora desta onda

7. Ficha completa (`/admin/produtos/:id`) continua necessária para imagens, status fino, kit BOM longo — **não eliminar**; só não deve ser o default para cat/app/preço Base.

---

## 3. Princípios (contrato de intenção)

1. **Guia-first para mutações curtas** — categoria, preço Base, período PVC, swap veículo: salváveis **sem** sair do Adaptive.
2. **Hub para volume / visão** — lista, bulk massivo, import, formação de preço.
3. **Ficha para cadastro profundo** — mídia, textos longos, flags, abas.
4. **Uma ponte, um verbo** — “Abrir guia …” sempre com destino explícito; never dead-end.
5. **Seção aberta = intenção** — se o operador veio para alterar cat/app/preço, a seção relevante **abre** (query ou bridge hint).

---

## 4. Plano de implantação (fases)

### Fase 0 — Contrato + antiregress (docs)

- Este documento como fonte.  
- Estender `falUiLayoutAntiregress` quando houver novas keys de bridge / seções.  
- **Gate:** `pnpm test:ui-layout-antiregress` + `tsc`.

### Fase 1 — Descoberta na guia Produto (baixo risco)

- Default sections: incluir `categoria` aberta (manter `identidade`+`preco`).  
- Hint de seção: “Salvar aqui” vs “Abrir hub para…” padronizado.  
- Query opcional `?section=categoria|preco|aplicacoes` ao abrir produto na guia.  
- **Não** muda regras de negócio.

### Fase 2 — Aplicações sem sair do produto (valor alto)

Opção recomendada (incremental):

- Em `ProductWorkSurface` seção aplicações:  
  - editar **anos** inline (chamar `adminUpdateApplicationYears`);  
  - botão “Adicionar aplicação” abre mini-fluxo (reusa cascata PVC) **ou** bridge com `APPLICATIONS_OPEN_GUIDE_KEY` + modo create pré-SKU.  
- Manter “Abrir guia” para swap veículo / bulk.

Opção alternativa (maior): embutir slice de `ApplicationWorkSurface` em modo `focus` dentro do produto — mais UI, mais risco.

### Fase 3 — Preços e classificação com ponte de volta

- `PRICES_OPEN_GUIDE_KEY` (+ opcional SKU em session/`?q=`) a partir da guia Produto (“Ajustar em Preços”).  
- `CATEGORIES_OPEN_GUIDE_KEY` ou `?focusCategoryId=` a partir da cascata (“Editar nó na Classificação”).  
- Guia Preços: ao consumir bridge, focar Lista Base/Promo + destacar linha do SKU no quick adjust.

### Fase 4 — Intenção por URL / chip

- Chips “Filtros / intenção”: `section`, `productId`, `q` (padrão já parcialmente em apps/produtos).  
- Limpar zera bridges + seções extras (higiene v1.1.1).

### Fase 5 — VAL + smoke

- Matriz: alterar cat na guia → lista atualiza; editar ano PVC na guia produto; preço Base na guia; ponte Preços com SKU.  
- Sem `main`/prod sem OK.

---

## 5. Fora de escopo (agora)

- Redesign visual do Adaptive shell.  
- Unificar ficha e guia num único editor.  
- Portal B2B / Notes #14–#18.  
- Erro Notes #4 (ativos/inativos) — **próxima marcha de código** no hub Produtos; pode compartilhar UX de filtros da lista, não desta fase de plano.

---

## 6. Ordem sugerida de marchas de código

| Marcha | Entrega | Risco |
|--------|----------|-------|
| G1 | Fase 1 (defaults + `?section=`) | Baixo |
| G2 | Fase 2 anos inline + add bridge create | Médio |
| G3 | Fase 3 bridges preços/classificação | Médio |
| G4 | Fase 4–5 VAL | Baixo |

---

## 7. Decisão pedida ao eFe (antes de codar G1+)

1. **Apps na guia Produto:** só anos inline **ou** embutir surface completa?  
2. **Preço:** manter Base-only na guia Produto + ponte Preços, ou também Promo inline?  
3. **Default sections:** abrir `categoria` sempre, ou só quando `?section=` / bridge?

*Nesta marcha: só estudo + plano commitados na `dev`. Implementação após OK nas decisões.*
