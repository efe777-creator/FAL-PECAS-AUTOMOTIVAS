# Estudo — Kits: AS-IS + experiência TO-BE (criação e vinculação BOM)

**Data:** 2026-11-21 · **Branch alvo futura:** `dev`  
**Fase:** estudo / extensão do pacote Catálogo–Preços — **sem UI nesta entrega**  
**K0:** hub `/admin/kits` (H8); composição H2; preço H4–H5; PVC H6/H10  

## Premissa

Kits entram no mesmo programa de **experiência de trabalho** (Adaptive como referência), com particularidade: o núcleo da operação é **montar o BOM** (vincular itens + qty), não só listar SKUs. Melhorar criação e vinculação **sem** criar “Kits Ops” paralelo ao Adaptive nem violar K0.

---

## Parte A — AS-IS (resumo normativo)

### A.1 Hub `/admin/kits`

- Lista `productKind: kit`, page 40, filtros q/status.  
- Ações: Preços dos kits, Importar composição, Novo kit.  
- Linha: Editar, Liberar (disabled se available), Arquivar; badge PVC; preview preço.

### A.2 Criação — dois tempos obrigatórios

1. Form: código, SKU, nome, descrições, classificação, `kitPriceMode`, status → **Salvar**.  
2. Só então: banner PVC, **composição**, imagens.

Composição **bloqueada** até `productId` (mensagem explícita no código).

### A.3 Vinculação BOM (`AdminProductKitSection`)

| Capacidade | Fato |
|------------|------|
| Busca | ≥2 chars, debounce 280ms, `productKind: item`, limit 10 |
| Linkar | Clique na lista **ou** Enter/botão com **SKU/ref exato** |
| Dup | Merge qty silencioso |
| Qty | Persist onBlur; inválido silencioso |
| Ordem | `sort_order` no DB; **sem reorder UI** |
| Preview | Soma Base, missing prices, auto/manual, provisório |
| Capa | Auto no add se kit sem foto; botões puxar/substituir |
| H2 UI | Aviso ≥2 linhas ou 1×qty≥2 |

### A.4 Fricções que este TO-BE ataca

1. Gate “salve antes de linkar” atrasa montagem do kit.  
2. Enter não linka por nome — só SKU/ref exato.  
3. Sem feedback de merge de qty.  
4. Sem reorder do BOM.  
5. Sem aplicações PVC na ficha do kit (Liberar exige `hasApplication`).  
6. Modo preço no select persiste fora do Salvar.  
7. Preço/modo editáveis em **três** lugares (form, composição, hub preços).  
8. Busy global trava a seção inteira.

### A.5 PRESERVAR 100%

H1–H11 relevantes; BOM `product_kit_components` + events; merge qty; sync pós-composição; `isKitCompositionPublishable`; Liberar + `compute_kit_is_available`; lista kits-manual; import K10; K8 no **item**; promo H9 fora do hub.

---

## Parte B — TO-BE

### B.1 Decisão de arquitetura

| Camada | Papel |
|--------|-------|
| **Primary** | Hub kits (lista) + Adaptive `moduleKey: 'kits'` |
| **Guia** | Trabalho no kit focado: **Composição em primeiro plano** + resumo preço/status |
| **Full** `/admin/kits/:id` | Cadastro completo: identidade, PVC/apps, imagens, logística, preço |

**Não** absorver Kits dentro do workspace Produtos (só redirect item↔kit).

### B.2 Criação melhorada — “kit rascunho rápido”

**Objetivo:** reduzir atrito do primeiro save sem quebrar modelo `productId` obrigatório no BOM.

| Passo TO-BE | Comportamento |
|-------------|----------------|
| 1. Novo kit | Drawer/guia **Criar kit**: código + nome + categoria (mínimo H1) |
| 2. Salvar rascunho | Insert imediato (`draft`); abre guia já com ID |
| 3. Composição | Painel de vinculação **já disponível** na mesma sessão |
| 4. Enriquecer | Full page ou abas: descrições, imagens, apps PVC, modo preço |

Opcional v1.1: draft “temporário” via API já existente — **sem** composição órfã (sempre productId real).

### B.3 Vinculação de itens — superfície dedicada

```mermaid
flowchart LR
  Search[Busca item] --> Pick[Selecionar candidato]
  Pick --> Qty[Confirmar qty]
  Qty --> BOM[Lista BOM ordenavel]
  BOM --> Preview[Soma e modo preco]
  Preview --> Liberar[Checklist Liberar]
```

**Melhorias normativas (preservando services):**

1. **Picker rico:** resultados com thumb, SKU, ref, preço Base, disponível; Enter seleciona o **primeiro** resultado destacado (não só match exato) — confirmação se ambíguo.  
2. **Multi-add:** marcar vários candidatos + qty padrão → linkar em lote (loop `adminAddKitComponent`).  
3. **Toast de merge:** “Item já no kit — quantidade atualizada para N”.  
4. **Qty:** stepper + Enter persiste; erro toast se ≤0.  
5. **Reorder:** drag ou ↑↓ atualizando `sort_order` (novo endpoint fino ou updates sequenciais — **impl detalha**; contrato BOM preservado).  
6. **Aviso missing Base price** no candidato antes de linkar (não bloqueia; alerta).  
7. **Busy granular:** só linha/ação, não trava busca.  
8. **Barra H2:** progresso “1/2 linhas mínimas” / “ok para publicar (composição)”.

### B.4 Guia Kits (Adaptive)

| Conteúdo guia | Detalhe |
|---------------|---------|
| Header | Nome, status, modo preço, PVC badge |
| Aba Composição | Picker + BOM (núcleo) |
| Aba Resumo | Preview preço, atalho hub preços, Liberar |
| CTA | Abrir cadastro completo |

Stack multi-kit: opcional (comparar 2 kits) — v1 pode ser 1 kit por vez.

### B.5 Full page — abas (espelho Produtos)

| Aba | Conteúdo |
|-----|----------|
| Identidade | Form atual (códigos, nome, desc, categoria, status) |
| Composição | Mesma superfície do B.3 (fonte única de UI) |
| Precificação | Modo auto/manual + atalho `/admin/kits/precos` (evitar 3 UIs divergentes — **um** editor de modo na full + resumo na guia) |
| Mídia | Imagens kitMode |
| Aplicações | **Incluir** `AdminProductApplicationsSection` (fecha gap Liberar) |
| Logística | Medidas se expostas no kit |

### B.6 Preço — unificar pontos de edição

| Hoje | TO-BE |
|------|-------|
| Select form + seção BOM + hub preços | Hub preços = operação em massa; full Precificação = modo do kit; guia = RO + link |

Select no form que chama sync **imediato** deve alinhar com dirty/save (evitar surpresa) — preferir sync no save da aba Precificação **ou** feedback explícito “modo aplicado”.

### B.7 PVC / Liberar

- Apps na full do kit.  
- Banner K5 permanece.  
- Liberar na guia e no hub com mesmo checklist.

### B.8 Import K10

Mantém rota import; TO-BE: atalho “Importar BOM” na guia/full com aviso de **substituição total**.

### B.9 Anti-objetivos

- Composição sem `productId` (órfãos).  
- Permitir kit como componente.  
- Herança PVC dos itens.  
- Duplicar OrderOps.  
- Remover H2/H6/H5.

### B.10 Aceite estudo Kits

- [x] AS-IS criação + vinculação  
- [x] TO-BE picker/BOM/criação rápida  
- [x] Gap PVC na ficha coberto  
- [ ] Gate eFe no SPEC atualizado  

---

## Arquivos-âncora

`AdminKitsPage.tsx`, `AdminKitFormPage.tsx`, `AdminProductKitSection.tsx`, `adminProductKitService.ts`, `adminKitPricingService.ts`, `FAL_KITS_K0_DECISOES_FECHADAS_2026-11-20.md`
