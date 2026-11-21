# FAL — Plano · Facilitar alteração pelas guias Adaptive

**Data:** 2026-11-21 · **Branch:** `dev`  
**Status:** Decisões travadas · **G1 DONE** (mini-menus) · G2–G4 pendentes  
**Intenção:** a guia do produto é o lugar para **alterar** categoria, aplicações (PVC completo) e preços das listas — com mini-menus claros.  
**REF Notes:** [FAL_ANALISE_ERROS_NOTES_211136_REF_2026-11-21.md](./FAL_ANALISE_ERROS_NOTES_211136_REF_2026-11-21.md)  
**VAL pontes:** [FAL_MARCHA_UI_LAYOUT_v111_PONTES_GUIA_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v111_PONTES_GUIA_VAL_2026-11-21.md)

---

## 0. Decisões eFe (2026-11-21) — TRAVADAS

| # | Decisão | Implicação técnica |
|---|--------|-------------------|
| **1** | **Surface completa** de Aplicações **dentro** da guia Produto | Embutir/reusar `ApplicationWorkSurface` (create/focus) no contexto do SKU focado — não só lista + ponte |
| **1b** | Cadastro de aplicação **sempre** com **ano início** e **ano fim** | Já existe em `ApplicationWorkSurface` (`createYearStart`/`createYearEnd` + `validatePvcYearInputs`); ao embutir, **obrigar** o mesmo contrato (não omitir campos) |
| **2** | **Ver e alterar preços das listas** direto na guia | Não só Lista Base: seletor de lista (Base / Promo / outras elegíveis) + editar valor no lugar (padrão `PriceListQuickAdjustPanel` filtrado pelo SKU) |
| **3** | **Categoria com seletores** | Manter/aperfeiçoar `CategoryCascadeSelects` (categoria → grupo → subgrupo) na mini-seção Categoria |
| **UX** | Tudo em **mini-menus** dentro da guia | Hierarquia abaixo; um menu = uma intenção; conteúdo só do menu ativo (ou accordion com um “foco” claro) |

---

## 1. Hierarquia da guia Produto (estudo UX)

### 1.1 Metáfora

```
┌─ Guia · SKU / nome ─────────────────────────────┐
│ [Identidade] [Categoria] [Preços] [Aplicações] … │  ← mini-menus (nav horizontal ou chips)
│─────────────────────────────────────────────────│
│  Painel do menu ativo (única superfície densa)  │
│  … ações Salvar / Fechar / Cadastro completo    │
└─────────────────────────────────────────────────┘
```

- **Lista (primary)** continua browse/filtro.  
- **Guia (contextual)** = edição por intenção.  
- Evitar accordion com 6 blocos abertos ao mesmo tempo (estado atual) → **mini-menus** com **um painel ativo**.

### 1.2 Ordem dos mini-menus (intuitividade)

Ordem sugerida = jornada mental do cadastro comercial:

| Ordem | Mini-menu | Intenção | Conteúdo |
|------:|-----------|----------|----------|
| 1 | **Identidade** | Quem é o item | Nome, SKU/ref, status rápido, liberar/disponível (já parcial) |
| 2 | **Categoria** | Onde classifica | `CategoryCascadeSelects` + Salvar categoria |
| 3 | **Preços** | Quanto custa | Seletor de **lista** + linha(s) do SKU editáveis (Base, Promo, …) |
| 4 | **Aplicações** | Em quais veículos | Surface PVC completa: criar com **ano início/fim**, editar período, swap veículo; lista do SKU |
| 5 | **Kits** | Em quais kits entra | Lista + Abrir guia Kits (ponte existente) |
| 6 | **Relacionados** | Cross-sell | Lista + abrir outra guia produto |

Menus 5–6 ficam “secundários” (menos usados no dia a dia de preço/PVC).

### 1.3 Regras de visualização

1. **Um menu ativo** por vez (chip destacado + `aria-current`). Persistência: `fal.products.guideMenu` (session).  
2. **Deep-link:** `?section=precos|categoria|aplicacoes|identidade` abre o menu certo.  
3. **Densidade:** `data-product-ops-density="compact"`; painel scroll interno; chrome da guia fixo (título + chips + Fechar).  
4. **Feedback:** toast curto por save (“Preço Base atualizado”, “Aplicação criada”, …).  
5. **Escape hatch:** link “Cadastro completo” / “Hub …” no rodapé do painel — nunca no meio do fluxo principal.  
6. **Vazio:** empty state com CTA do próprio menu (“Adicionar aplicação”, “Definir categoria”, “Incluir na lista”).

### 1.4 Mini-menu Preços (detalhe)

```
[ Lista: Base ▾ ]   ← Base | Promo | outras (exclui kits-manual)
SKU focado pré-filtrado
[ valor ] [Salvar]  · origem/badge · abrir formação (secundário)
```

- Reusar lógica de `PriceListQuickAdjustPanel` com `forcedListId` + `q=SKU` / productId.  
- Trocar lista **sem** sair da guia.  
- Validação/autorização: respeitar `allowed` do hub Preços.

### 1.5 Mini-menu Aplicações (detalhe)

```
Modo lista (vínculos do SKU)
  → linha: label · [Editar] → surface focus (anos + swap)
[ + Nova aplicação ]
  → surface create pré-preenchida com SKU do produto
     Montadora → Modelo → Motor → Versão
     Ano início * · Ano fim *   ← obrigatórios no contrato UX
     [Salvar aplicação]
```

- Preferência: **compor** `ApplicationWorkSurface` com `mode` + `forcedSku` props (extensão mínima) em vez de duplicar formulário.  
- Garantia: create path **sempre** renderiza e valida ano início/fim (`validatePvcYearInputs` — já no hub).

### 1.6 Mini-menu Categoria (detalhe)

```
CategoryCascadeSelects (3 níveis)
Resumo do leaf (“Categoria › Grupo › Subgrupo”)
[Salvar categoria]
Link discreto: “Editar nós na Classificação” (ponte futura)
```

---

## 2. Estado atual vs alvo

| Área | Hoje | Alvo |
|------|------|------|
| Layout seções | Accordion multi-aberto | **Mini-menus** 1 ativo |
| Apps | Lista + Abrir guia hub | **Surface completa** no produto + anos início/fim no create |
| Preço | Só Base, campo único | **Multi-lista** ver/editar na guia |
| Categoria | Cascata + salvar (ok) | Manter seletores; menu próprio destacado |
| Bridges | products/apps/kits | Opcional: Classificação; Preços pode ser interno |

---

## 3. Fases de código (atualizadas)

| Marcha | Entrega | Risco |
|--------|---------|-------|
| **G1** | Refator visual: mini-menus + `?section=` + persistência menu; Categoria/Identidade nos menus | **DONE** `dev` |
| **G2** | Menu Preços multi-lista (embed quick-adjust filtrado pelo SKU) | Médio |
| **G3** | Menu Aplicações: embed `ApplicationWorkSurface` + SKU forçado + anos início/fim no create | Médio-alto |
| **G4** | Antiregress FL + VAL smoke guia (cat / preço lista / app com anos) | Baixo |

**Gates:** `pnpm test:ui-layout-antiregress` · `tsc` · testes de `validatePvcYearInputs` / apps se tocados.

---

## 4. Fora de escopo

- Redesign do shell Adaptive (split/fullscreen).  
- Substituir ficha completa.  
- Notes #4 (ativos/inativos) — marcha separada na **lista** primary.  
- `main`/prod sem OK.

---

## 5. Próximo passo

Com decisões travadas: **G1** (esqueleto mini-menus + categoria/identidade) na próxima marcha de implementação, depois G2 preços, G3 aplicações.

*Este doc substitui as “perguntas em aberto” da versão anterior.*
