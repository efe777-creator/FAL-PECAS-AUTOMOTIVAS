# FAL-IMP-11 expandido — Diagnóstico visual + importação

**Data:** 2026-10-09  
**Modo:** SOMENTE LEITURA — **STOP antes de implementação**  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Separado de:** VAL-11 A–D (1º viewport / FIND-007 quantitativo) — **não reabre** esse fechamento  

**Refs:** mockup responsável · PRD · IMP-03/05/06/07/08/10 · `entityNormalize` · `productImportCore` · `applicationImportCore`

---

## 1. Resumo executivo

| Área | Veredito |
|------|----------|
| FIND-007 lista vazia | Já **não** se reproduz em wtbp (VAL-11); residual visual permanece |
| Card vs mockup | **Gap grande** — estrutura atual ≠ modelo aprovado |
| PDP vs mockup | **Gap médio-grande** — falta galeria, apps tabeladas, “A partir de”, copy pagamento |
| Capitalização | Utilitários IMP-02 existem; **exibição loja** quase não aplica title-case |
| Import | Pipeline multi-kind **existe** (produto, apps, custo, preço, HF bundle) + histórico IMP-06; não é “do zero” |
| Próximo | Plano mínimo §13 — **aguardar aprovação** |

---

## 2. Estado FIND-007

| Aspecto | Status |
|---------|--------|
| Quantitativo (RPC/UI vazia) | **Fechado** VAL-11 — 100 produtos / cards no viewport |
| Visual / modelo mockup | **Aberto** neste diagnóstico (novo escopo) |

Não declarar FIND-007 “reaberto” como lista vazia.

---

## 3. Ambiente verificado

- Runtime: `wtbp…` (CLI linked + app localhost)  
- Código: `ProductCard`, `ProductPage`, `compatibilitySummary`, `entityNormalize`, imports  
- HF: **não** usado como verdade  

---

## 4. Evidências FIND-007 (histórico + atual)

| Evidência | Tipo |
|-----------|------|
| RPC `total_count=100`; UI 24 cards | **Fato** VAL-11 |
| `inViewAtTop` 0→3 após A–D | **Fato** VAL-11 |
| Mockup card com apps agrupadas / “Ver produto” / “A partir de” | **Relato** visual responsável 2026-10-09 |
| Gaps §7 | **Fato** código vs mockup |

---

## 5. Fluxo atual de listagem

```text
CatalogPage → searchCatalog → RPC search_products (published)
  → enrich commercial_ref / posicao / lado
  → attachCompatibilitySummaries (compact)
  → attachResolvedPrices
  → ProductCard
```

Elegibilidade listagem = `published`. Compra = `is_available` + preço (IMP-11 C / PRD).

---

## 6. Matriz elegibilidade / preço

| Critério | Listagem | Compra | Fonte |
|----------|----------|--------|-------|
| `status=published` | Sim (RPC) | Pré-requisito | SQL search |
| `is_available` | Não filtra (badge) | Sim (card) | DTO |
| Preço resolve > 0 | Não exige na RPC | Liberar hard (IMP-10) | resolve RPC |
| “A partir de” | **Ausente** | — | Mockup |

---

## 7. Card / PDP vs modelo visual

### 7.1 Card — gap analysis

| Elemento mockup | Atual | Gap |
|-----------------|-------|-----|
| Imagem real | Placeholder 🧩 | Alto |
| Nome comercial | `product.name` (raw) | Médio (casing) |
| “Código FAL: …” | “Código referência: …” | Médio (rótulo PRD D-REF) |
| Seção “Aplicação” + maker em destaque | Linha `compatibilitySummary` flat | Alto |
| Apps: modelo · motor · período colunado | Texto único `Maker Model Year` | Alto |
| “A partir de R$ …” | Só `R$ …` (ou Indisponível) | Médio |
| “Condições de pagamento…” | Ausente | Médio |
| CTA “Ver produto” | “Ver” + “Adicionar” | Médio (CTA diferente) |
| Favoritar / qty no card | Presente (extra) | Fora do mockup |

### 7.2 PDP

| Elemento | Atual | Gap |
|----------|-------|-----|
| Galeria + thumbs | Placeholder único | Alto |
| Breadcrumb cat | Parcial | Baixo |
| Apps tabeladas por maker | Summary / lista | Alto |
| Descrição curta/longa accordion | Campos se existirem | Médio |
| Em estoque | Via available | Baixo |
| Spec detalhada prévia no projeto | **Lacuna:** não localizado artefato PDP formal além do mockup/PRD | **Hipótese** — pedir ref se houver |

**Regra:** não inventar apps/imagens/descrições.

---

## 8. Normalização / capitalização

| Política mockup/PRD | Utilitário | Uso atual |
|---------------------|------------|-----------|
| Categorias MAIÚSCULAS | `formatCategoryName` | Admin categorias (**fato**) |
| Maker/modelo comercial | `formatCatalogDisplayName` (só trim) | Admin veículos/marcas — **não** title-case automático |
| Match | `normalizeEntityMatchKey` | Import apps, admin |
| Nome produto na loja | — | Exibe DB raw — **gap** se CADASTRO ALL CAPS |
| Código FAL / SKU | `productIdentity` | Sem title-case |

**Não alterar** `entityNormalize` nesta marcha. Plano futuro: exibição loja opcional `toCommercialCase` **ou** normalizar na importação/admin.

---

## 9. Mapa do fluxo de importação (existente)

```text
CSV/XLSX → parse/validate/mapColumns
  → preview (productImportCore | applicationImportCore | price/cost)
  → apply (RPCs SQL / services)
  → imports / import_items (histórico — IMP-06 UI /admin/importacoes)
```

| Kind (types) | UI admin | Core |
|--------------|----------|------|
| Catálogo produtos | `AdminProductImportPage` | `productImportCore` + apply SQL |
| Aplicações | `AdminApplicationsImportPage` | `applicationImportCore` |
| Custo / conversão | Supplier import pages | cost/conversion |
| Preço lista | `PriceImportWizard` | price import |
| HF bundle | `AdminHfBundleImportPage` | bundle |
| Histórico unificado | `AdminImportsPage` | `adminImportHistoryService` |

Anti-auto-publish / `is_available` não setado no import — **congelado** (IMP-10).

---

## 10. Matriz de campos (catálogo)

| Campo | Origem atual | Obrig. criar | Obrig. liberar | Obrig. mockup | Normalização | Ausência |
|-------|--------------|--------------|----------------|---------------|--------------|----------|
| Nome | import/admin | Sim | Sim (hard) | Sim | trim; casing gap | Bloqueia |
| commercial_ref | IMP-03 | Soft | Hard (ou sku) | “Código FAL” | identity | Fallback sku |
| sku | import | Sim | Soft | Técnico | — | — |
| category_id | import L3 | Soft | Hard | Breadcrumb | formatCategoryName admin | Bloqueia liberar |
| brand | import | Soft | Soft | Fabricante peça | formatCatalogDisplayName | Oculta linha |
| Imagens | storage/parcial | Não | Soft aviso | Sim mockup | — | Placeholder |
| Desc curta/longa | admin/opcional | Não | Não | Sim mockup | — | Esconde bloco |
| PVC apps | import apps | Não | Soft aviso | Sim mockup | year_start/end | APPS_EMPTY |
| Custo | import custo | Não | Indireto preço | Não | DIV-002 | Liberar falha preço |
| Preço resolve | listas | Não | Hard >0 | “A partir de” | RPC | Indisponível/liberar |
| is_available | Liberar | Não | Resultado | Compra | — | Badge |
| status | admin/import | published p/ vitrine | — | — | — | Fora da lista |

---

## 11. Lacunas para automação

1. Prévia unificada “produto+apps+preço” em um wizard (hoje pipelines separados).  
2. Title-case / casing na ingestão de nomes.  
3. Imagens em massa com proveniência.  
4. Apps agrupadas na vitrine (UI) sem inventar dados.  
5. Match ambíguo → fila humana (já parcial em apps).  
6. Rótulo “Código FAL” vs “Código referência” (decisão copy).  

---

## 12. Causas / relatos / hipóteses

| ID | Tipo | Conteúdo |
|----|------|----------|
| V1 | **Fato** | Card otimizado para densidade grade, não para mockup editorial |
| V2 | **Fato** | Apps = string compacta, não tabela por maker |
| V3 | **Fato** | Sem imagens reais na maioria |
| V4 | **Fato** | Import multi-pipeline + histórico já existem |
| V5 | **Hipótese** | Casing ALL CAPS no nome vem da fonte CSV, não da UI |
| V6 | **Relato** | Spec PDP antiga além do mockup pode existir — não encontrada nesta marcha |

---

## 13. Plano mínimo de correção (priorizado) — **não implementar agora**

| Prio | Item | Dependência |
|------|------|-------------|
| P1 | Card: apps agrupadas por maker (dados PVC); empty fiel | IMP-05 dados |
| P1 | Copy preço: “A partir de” **só** se regra multi-preço existir; senão manter preço único resolvido | Decisão eFe |
| P2 | CTA alinhado (“Ver produto” vs Adicionar) | UX |
| P2 | Rótulo Código FAL vs referência | Decisão copy |
| P2 | Linha “condições de pagamento” (estática) | Copy |
| P3 | Galeria PDP quando houver image URLs | Dados imagens |
| P3 | Casing na importação de nomes | entityNormalize extensão |
| P3 | Wizard import “completo” | Escopo grande — F11-ish |

**Fora:** F11 mestre, carga massiva apps, MP, frete, repair, reabrir Liberar.

---

## 14. Critérios de aceite (implementação futura)

- Card reflete mockup **sem inventar** apps/imagens.  
- Preço = resolve canônico (FIND-006 alinhado).  
- Capitalização conforme política, match ≠ display.  
- Import com prévia + histórico; sem auto-available.  
- Regressão VAL-11 viewport + IMP-07 rótulos.

---

## 15. Testes futuros

- Vitest formatadores de app agrupada.  
- Snapshot card com/sem PVC.  
- Import preview: duplicata commercial_ref.  
- Browser wtbp: card + PDP amostra.

---

## 16. Decisões humanas (perguntas originais — histórico)

| # | Pergunta original |
|---|-------------------|
| D1 | Rótulo Código FAL vs Código referência? |
| D2 | “A partir de” com preço único? |
| D3 | CTA card? |
| D4 | Title-case na importação vs exibição? |
| D5 | Spec PDP antiga a anexar? |

---

## 17. Decisões D1–D5 registradas (eFe — 2026-10-09)

| ID | Tema | Diretriz oficial |
|----|------|------------------|
| **D1** | Identificação no card | Exibir **`Referência: {código}`** (ex. `Referência: TRW1234`). Não presumir que a referência comercial seja um campo distinto inventado — usar a identidade já definida (`commercial_ref` com fallback `sku`, IMP-03). |
| **D2** | Preço | Prefixo **“A partir de”** **somente** quando houver **variação real** de preço aplicável; caso contrário, preço único resolvido sem o prefixo. |
| **D3** | CTA card | **“Ver produto”** → navega para a página detalhada (`/produto/:id`). |
| **D4** | Capitalização | Title case comercial na **exibição** (ex.: `Terminal de Direção`, `Chevrolet`, `Celta`). Categorias permanecem MAIÚSCULAS (IMP-02). Match continua via `normalizeEntityMatchKey`. |
| **D5** | PDP | **Revisar spec anterior** antes de definir/aprovar alterações de layout do PDP. |

**Estado:** decisões registradas. **Implementação ainda bloqueada** até aprovação explícita do plano mínimo (§20).

---

## 18. Etapa 1 — Revisão da especificação anterior (PDP / produto público)

### 18.1 Fontes localizadas (**fato**)

| Fonte | O que define | O que **não** define |
|-------|--------------|----------------------|
| [PRD §24 Catálogo público](../entrada/FAL_PRD_3.0.md) | Mesmo produto mestre; apps; imagens; preço resolvido; `is_available`; busca por código referência | Layout visual do card/PDP; wireframe |
| [ESPECIFICACAO_FASE3 §10–15, §24](./ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md) | Campos: sku/name, short_description/description, refs N, apps N:N, images, incompleto sem imagem; contrato tela “Produto público → getProductById” | Wireframe UI; “A partir de”; CTA “Ver produto” |
| [RELATORIO_FASE3](./RELATORIO_FASE3_COMPLETO_2026-10-03.md) | PDP entrega: preço, disponibilidade, apps, refs, CTA carrinho; cards sem foto real (🧩); polish residual | Mockup editorial |
| [IMP-07 VAL](./FAL_IMP_07_CARD_PDP_VAL_2026-10-09.md) | Rótulos fabricante/apps vazias; `displayPrice`; **sem redesign** | Layout mockup 2026-10-09 |
| Mockup responsável (imagem 2026-10-09) | Card + coluna PDP + item: imagem, nome, código, apps por maker, preço, CTA | Não é spec Fase 3; é referência visual nova |
| Spec UI PDP dedicada (wireframe FAL) | — | **Não encontrada** no repositório (`docs/`, PRD, Fase 3, IMP-07) |

### 18.2 Convergências (spec anterior × mockup × código)

| Tema | Spec/PRD/F3 | Mockup | Código atual |
|------|-------------|--------|--------------|
| Um produto mestre na loja | Sim | Sim | Sim |
| Apps a partir de PVC | Sim; não inventar | Lista por maker | Summary compacto / lista flat |
| Imagem opcional; incompleto | F3 CA-10 | Imagem dominante | Placeholder 🧩 |
| Preço + disponibilidade | PRD / F3 | Preço + “Em estoque” | `displayPrice` + available |
| short/long description | F3 campos | Accordions no mockup PDP | Campos existem; PDP **não** renderiza descrições hoje (**fato** ProductPage) |
| Referências N | F3 | Código no card | Card: commercial_ref; PDP: refs + commercial_ref |

### 18.3 Divergências

| Tema | Spec anterior | Mockup | Código |
|------|---------------|--------|--------|
| Rótulo do código | “código referência” (PRD/IMP-03) | “Código FAL” | “Código referência” → **D1** = `Referência:` |
| CTA card | F3: detalhe + carrinho na PDP | “Ver produto” | Ver + Adicionar → **D3** |
| “A partir de” | Não na F3/PRD | Sempre no mockup | Ausente → **D2** (condicional) |
| Apps UI | Dados N:N; UI admin | Tabela por maker + motor + período | String `Maker Model Year` |
| Galeria | product_images N | Thumbs | Uma área placeholder |
| Title case | F3 não manda title-case na loja | Nome ALL CAPS no desenho; caixa de regras pede comercial | Raw DB → **D4** |

### 18.4 Pontos não especificados (lacunas — **fato** documental)

1. Wireframe PDP oficial anterior ao mockup **não existe** no repo.  
2. Quando exatamente “variação real de preço” (D2): lista vs promo? min de variantes? → detalhar no aceite.  
3. PDP: manter “Adicionar ao carrinho” (F3/relatório) além do fluxo a partir do card — **sim por expectativa F3**, mas fora do contrato de **card** desta marcha.  
4. Copy “Condições de pagamento disponíveis no site” — só no mockup; não no PRD/F3.  
5. Agrupamento visual de apps (colunas motor/período) — dados PVC suportam; UI não.

**Conclusão D5:** a “especificação anterior” do PDP é **contratual/de domínio** (PRD + Fase 3 + relatório), não um layout aprovado. O mockup 2026-10-09 é a primeira referência visual detalhada. **PDP layout permanece congelado** até aprovação de um contrato PDP derivado (pós-aprovação deste plano), alinhado a F3 (refs, apps, imagens, descrições, preço, disponibilidade, CTA compra).

---

## 19. Etapa 2 — Contrato visual do **card** (consolidado; PDP não redefinido)

Escopo autorizado a **propor** (não implementar):

| Bloco | Contrato |
|-------|----------|
| Imagem | Principal se existir; senão placeholder (sem inventar foto) |
| Nome | Title case comercial (D4) na **exibição** |
| Identificação | `Referência: {commercial_ref \|\| sku}` (D1) |
| Aplicações | Agrupar por fabricante (montadora); modelo + motor/versão quando houver; período `year_start`/`year_end` (formato coerente IMP-05); empty = `APPS_EMPTY_LABEL`; **não inventar** |
| Fabricante da peça | Opcional (`product_brands`) — IMP-07 |
| Preço | `displayPrice` / resolve; prefixo “A partir de” **somente** se D2 aplicável |
| CTA | Botão/link **Ver produto** → `/produto/:id` (D3) |
| Fora do card nesta proposta | Adicionar ao carrinho (fica na PDP); redesign F11; copy pagamento (pendente decisão se P2) |

**PDP:** manter comportamento atual até contrato PDP explícito aprovado (D5). Melhorias de dados (descrições já no schema, galeria se URLs) só após esse gate.

---

## 20. Etapa 3 — Importação / dados (validação; sem novo pipeline)

| Achado | Tipo |
|--------|------|
| Pipelines separados: catalog, applications, cost, conversion, price_list + histórico IMP-06 | **Fato** (§9 deste doc) |
| Reaproveitar cores existentes; não criar importador universal | **Diretriz** PRD §25 |
| Title case (D4): preferir **exibição** (+ opcional normalização na import em marcha futura) sem mudar match key | **Plano** |
| Apps em massa = operação de dados FIND-004 — **fora** desta correção visual mínima | **Fato** residual |
| Imagens: Storage F3 existe; cobertura baixa — não inventar | **Fato** |

---

## 21. Plano mínimo de correção (para aprovação)

| # | Entrega | Notas |
|---|---------|-------|
| M1 | Card: rótulo `Referência:` (D1) | `productLabels` / formatador |
| M2 | Card: CTA único/primário **Ver produto** (D3) | Link PDP; Adicionar fora do card ou secundário só se eFe pedir depois |
| M3 | Card: apps agrupadas por montadora (dados PVC) | Formatter + UI; sem inventar |
| M4 | Exibição title case (D4) para nome / maker / modelo no card | Helper display; não alterar `normalizeEntityMatchKey` |
| M5 | “A partir de” (D2) | Só se regra de variação for definida no aceite (ex.: `listPrice > resolved + ε`); senão omitir |
| M6 | Doc: contrato PDP v0.1 (pós-aprovação) | Derivado F3+PRD+mockup; **antes** de código PDP |
| — | **Não** nesta marcha | Schema, migrations, import massa, MP, frete, repair, reabrir IMP-02…10 / VAL-11 A–D |

### Critérios de aceite (quando autorizado)

- [ ] Card wtbp: `Referência:` + Ver produto + apps fiéis ao PVC  
- [ ] Sem “A partir de” em preço único; com prefixo só se variação comprovada  
- [ ] Title case na UI sem quebrar busca/match  
- [ ] PDP inalterada até M6 aprovado  
- [ ] Regressão FIND-006 / IMP-07 / VAL-11 viewport  
- [ ] Vitest formatadores de app / labels  

### Riscos

- Dados PVC pobres → card “vazio” de apps (FIND-004) — não preencher.  
- Title case em marcas (BMW, TRW) — whitelist ou preservar tokens conhecidos.  
- Remover “Adicionar” do card pode mudar conversão — D3 explícito.

---

## 22. STOP (atualizado)

| Item | Status |
|------|--------|
| Diagnóstico visual/import inicial (§1–16) | Preservado |
| D1–D5 | **Registradas** (§17) |
| Revisão spec PDP anterior (§18) | **Concluída** — wireframe UI antigo **ausente**; domínio F3/PRD = fonte |
| Contrato card (§19) + plano mínimo (§21) | **Propostos** |
| Implementação código | **Bloqueada** até aprovação explícita eFe do §21 |

**Aguardando:** aprovação (ou ajuste) do plano mínimo M1–M6.
