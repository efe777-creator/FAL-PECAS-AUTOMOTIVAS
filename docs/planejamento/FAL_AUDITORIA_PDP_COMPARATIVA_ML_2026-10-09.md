# Auditoria PDP × Mercado Livre (com prints) — FAL 3.0

**Data:** 2026-10-09  
**Modo:** somente leitura / proposta — **sem alteração de código**  
**Runtime canônico:** `wtbpwuiayednvlhvuhbh`  
**FIND-004 dados:** ENCERRADO — não reaberto  
**Código FAL auditado:** `ProductPage.tsx` (2 colunas); **MARCHA PDP-A local** (imagem/specs/desc) ainda **não** em `origin`

---

## 1. Resumo executivo

O Mercado Livre organiza a PDP em **galeria com thumbs verticais + ficha + buy-box lateral**, com frete, parcelas, urgência, avaliações e reputação de vendedor.

A FAL já cobre o essencial comercial B2B: **identidade, preço resolvido, aplicações PVC (anos YY + Mais aplicações), carrinho, descrição/especificações/ajuda (PDP-A)**.

**Não copiar** identidade/marketplace ML. **Adaptar** só padrões úteis: galeria multi-imagem, CTA alto (buy-box), tabela de características, descrição expansível.

**Gap principal P1:** galeria + hierarquia de compra → proposta **MARCHA PDP-B**.

---

## 2. Evidências de referência (prints)

Quatro capturas anexadas pelo responsável (sessão 2026-10-09):

| # | Conteúdo observado (FATO — print) |
|---|-----------------------------------|
| 1 | Header ML; widget “compatível com seu veículo” (Marca/Modelo/Ano/Versão); thumbs verticais + imagem grande; título/preço; buy-box com parcelas/frete/timer |
| 2 | Galeria thumbs (+N); buy-box (frete grátis, estoque, Comprar agora / Adicionar ao carrinho); faixa “Produtos relacionados” |
| 3 | “Características do produto” em tabela; cards Compra Garantida / garantia / vendedor / meios de pagamento |
| 4 | Descrição + specs técnicas na descrição; “Ver descrição completa”; meios de pagamento; card relacionados com OFF/frete |

---

## 3. Documentos FAL consultados

| Doc | Uso |
|-----|-----|
| [FAL_CONTRATO_PDP_v0.1](./FAL_CONTRATO_PDP_v0.1_2026-10-09.md) | Domínio aceito; F11 fora |
| [FAL_IMP_11_PDP_VAL](./FAL_IMP_11_PDP_VAL_2026-10-09.md) | VAL domínio |
| [FAL_IMP_11_VISUAL §7.2](./FAL_IMP_11_VISUAL_IMPORT_DIAGNOSTICO_2026-10-09.md) | Gaps mockup |
| [FAL_MARCHA_UI_APPS_ANOS_VAL](./FAL_MARCHA_UI_APPS_ANOS_VAL_2026-10-09.md) | Apps/anos |
| [FAL_MARCHA_PDP_A_VAL](./FAL_MARCHA_PDP_A_VAL_2026-10-09.md) | Wire imagem + specs + ajuda |
| [FAL_AUDITORIA_PDP_COMPLETA_PROPOSTA](./FAL_AUDITORIA_PDP_COMPLETA_PROPOSTA_2026-10-09.md) | Baseline pré-prints (parcialmente superada por A + prints) |

**Molde HTML PDP:** não localizado (só shell Vite). Mockup responsável citado sem artefato versionado.

---

## 4. Inventário FAL atual (FATO código)

| Item | Estado | Arquivo / evidência |
|------|--------|---------------------|
| Rota `/produto/:id` | OK | `router.tsx` |
| Breadcrumb | OK | `ProductPage.tsx` |
| Nome / Referência / marca | OK | `productLabels` |
| Imagem única + placeholder | Parcial | `productImages.ts` + UI 🧩 |
| Preço / disponível / qty / carrinho | OK | `displayPrice`, `CartContext` |
| Apps + anos YY + Mais | OK | `CompatibilityAppsBlock` variant pdp |
| Descrição / Specs / Ajuda | OK (local A) | `ProductPage` + `productSpecs` |
| Layout | 2 colunas; CTA após apps/desc/specs | `lg:grid-cols-2` |
| Relacionados / frete / parcelas / reviews | Ausente / bloqueado | — |

---

## 5. Matriz ML (prints) × FAL

| Bloco ML | FAL hoje | Adaptar? | Prioridade |
|----------|----------|----------|------------|
| Thumbs verticais + imagem grande | 1 slot | Sim — PDP-B | P1 |
| Vídeo na galeria | Ausente | Não (sem asset) | P3 |
| Widget checker Marca/Modelo/Ano/Versão | Lista apps + filtros catálogo | Não clonar; link filtro opcional depois | P2 |
| Buy-box (preço+CTA alto) | CTA baixo no scroll | Sim — reordenar | P1 |
| Frete grátis / chega amanhã / timer | Ausente | **Não** — D-FRETE | Bloqueado |
| Parcelas / meios pagamento | WA se env | **Não** inventar — MP | Bloqueado |
| Avaliações / +vendidos / MAIS VENDIDO | Ausente | **Não** inventar | Bloqueado |
| Características tabela | Specs `dl` (A) | Polish visual | P2 |
| Descrição + “ver completa” | Texto se cadastro | Expandir se longo | P2 |
| Relacionados / quem viu | Ausente | Só com regra (categoria) | P3 |
| Seller reputation | N/A loja própria | Não | — |

**Diferencial FAL a preservar:** aplicações agrupadas + `YY/YY` · `YY/...` + Mais aplicações — superior ao checker genérico ML para peça automotiva B2B.

---

## 6. Arquitetura alvo FAL (não-ML)

**Desktop:** Header → breadcrumb → `[Galeria thumbs | Buy-box: nome, ref, preço, disponível, qty, CTA]` → Aplicações (full width) → Descrição → Especificações → Ajuda → Footer.

**Mobile:** galeria → nome/ref/preço/disponível → qty+CTA → apps → desc → specs → ajuda.

Evitar: frete/parcelas/urgencia fictícios; cartões excessivos; seções vazias; clonar amarelo/azul ML.

---

## 7. Backlog

### P0 operacional
- Commit/push **PDP-A** (ainda só local) — gate git separado.

### P1 — MARCHA PDP-B
| ID | Problema | Resultado | Aceite |
|----|----------|-----------|--------|
| B1 | Sem thumbs/troca | `images[]` + `ProductGallery` | N>1 thumbs; N=1 sem chrome vazio |
| B2 | CTA baixo | Buy-box acima de desc/specs | CTA sem passar specs no mobile |
| B3 | Fallback 🧩 | Placeholder FAL neutro | Sem depender de emoji |
| B4 | Proporção | Área estável `object-contain` | Sem overflow horizontal |

### P2
- Polish tabela specs; descrição “ver completa” se longa; link opcional para filtro veículo no catálogo.

### P3 / bloqueados
- Relacionados (regra); frete; MP/parcelas; reviews; vídeo.

---

## 8. Arquivos (só pós `MARCHA PDP-B`)

- `fal-pecas/src/pages/Product/ProductPage.tsx`
- Novo `ProductGallery.tsx`
- `fal-pecas/src/services/products/productImages.ts` (lista completa na PDP)
- VAL `FAL_MARCHA_PDP_B_VAL_*.md`
- Reusar: `CompatibilityAppsBlock`, `CartContext`, `productLabels`, `productSpecs`

---

## 9. Integridade

- Sem inventar foto, frete, estoque, parcelas, avaliações, apps.
- FIND-004 / PVC / migrations: fora.
- Runtime: apenas `wtbp`.

---

## 10. STOP

**Entrega desta fase:** este relatório.  
**Código:** não alterado.  
**Aguardando autorização explícita:**
- `COMMIT PDP-A` (git feat→dev→main), e/ou  
- `MARCHA PDP-B` (galeria + buy-box).
