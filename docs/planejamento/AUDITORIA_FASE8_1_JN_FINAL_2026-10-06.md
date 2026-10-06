# Auditoria final — Fase 8.1 (gates I→N)

**Data:** 2026-10-06  
**Escopo:** Implementação integrada J–N sobre base I + verificação de conformidade  
**Ambiente:** código local; **sem** `db push`, commit ou push  
**Critério:** comportamento efetivo + testes + integração (não “existe código relacionado”)

---

## A. Resumo executivo

Foram implementados os gates **F8.1-J a F8.1-N** reutilizando RPCs e services existentes. A home (I) passou a abrir o **wizard de importação**. O detalhe ganhou **abas**, **seleção em massa via RPC por item**, **histórico de `imports`**, **wizard 9 etapas** e **configuração**. O catálogo aceita layout **CODIGO|GRUPO|MONTADORA|DESCRICAO** com enrichment client (RPC remoto ainda só sku+name até migration aplicada).

`npm test`: **8 files, 63 tests passed**.  
`npm run build`: **OK**.

---

## B. Fase 8.1 por bloco

| Gate | Status | Evidência |
|------|--------|-----------|
| **I** | Completo (prévio) + import home ligado ao wizard | Cards, CRUD, duplicar/excluir; picker abre `PriceImportWizard` |
| **J** | Completo | Abas Produtos / Formação / Importações / Config em `AdminPriceListDetailPage` |
| **K** | Completo (unitário + build) | `PriceImportWizard` + `classifyPriceImportAction` / modos client-side |
| **L** | Completo (unitário + build) | Checkboxes + recalc/export/preço/remover na seleção via `set_price_list_item_pricing` / delete |
| **M** | Completo parcial | UI histórico `adminListPriceListImports`; perfis em **localStorage**; migration preparada |
| **N** | Completo parcial | Contrato 4 cols + UTF-8 + enrichment attrs/categoria; migration RPC preparada **não aplicada** |

---

## C. Arquivos alterados / novos

### ALTERADOS
- `fal-pecas/src/pages/admin/prices/AdminPriceListsPage.tsx`
- `fal-pecas/src/pages/admin/prices/AdminPriceListDetailPage.tsx`
- `fal-pecas/src/services/admin/adminPriceListService.ts`
- `fal-pecas/src/services/admin/adminCatalogImportService.ts`
- `fal-pecas/src/services/import/contracts.ts`
- `fal-pecas/src/pages/admin/products/AdminProductImportPage.tsx`

### NOVOS
- `fal-pecas/src/pages/admin/prices/PriceImportWizard.tsx`
- `fal-pecas/src/services/admin/priceImportActions.ts`
- `fal-pecas/src/services/admin/priceImportActions.test.ts`
- `fal-pecas/src/services/import/importProfiles.ts`
- `fal-pecas/src/services/import/normalizeText.ts`
- `fal-pecas/src/services/import/normalizeText.test.ts`
- `fal-pecas/src/services/admin/adminPriceListsOverview.test.ts` (I, prévio)
- `docs/planejamento/AUDITORIA_FASE8_1_JN_FINAL_2026-10-06.md` (este arquivo)

### MIGRATIONS PREPARADAS (não aplicadas)
- `fal-pecas/supabase/migrations/20261006120000_fase81m_import_profiles_prepared.sql`
- `fal-pecas/supabase/migrations/20261006130000_fase81n_catalog_grupo_montadora_prepared.sql`

### NÃO ALTERADOS (verificado por escopo)
- RPCs já aplicadas no remoto (arquivos B–F intactos como fonte de runtime)
- `place_order`, estoque F8, F7, `resolve_product_price(s)`
- Sem commit / push / db push

---

## D. Banco

| Item | Situação |
|------|----------|
| RPCs runtime usadas | `set_price_list_pricing_rule`, `recalculate_price_list_items`, `set_price_list_item_pricing`, `adjust_price_list_items`, `apply_price_list_import`, `apply_catalog_import` (versão atual sku+name) |
| RPCs alteradas no remoto | **Nenhuma** (sem push) |
| Migrations novas | 2 preparadas, pendentes de autorização |
| `import_profiles` | Só arquivo SQL + UI localStorage |
| Enrichment grupo/montadora | Client pós-apply até migration N |

---

## E. Testes

```text
npm test → 8 files, 63 tests passed, 0 failed
```

Inclui: overview I, filters, priceImportActions, normalizeText, importParser, pricingFormulas, fase81 e2e/migration.

---

## F. Build

```text
npm run build → tsc -b OK + vite build OK (207 modules)
```

---

## G. Auditoria funcional (fluxos)

| Fluxo | Status | Nota |
|-------|--------|------|
| 1 Home → detalhe → itens → editar → voltar | 🟡 | Código integrado; validação manual no browser pendente |
| 2 Home → import → wizard → preview → apply → histórico | 🟡 | Wizard + histórico no código; apply depende de auth/RPC remoto |
| 3 Detalhe → seleção → massa → atualização | 🟡 | Seleção usa item RPC; confirmado em código |
| 4 Formação → regra → recalc → origem | 🟡 | Abas Formação preservam handlers |
| 5 Catálogo → 4 cols → draft/indisponível | 🟡 | Enrichment client; loja só lista `status=published` |

---

## H. Auditoria de regressão

| Área | Verificação |
|------|-------------|
| Catálogo público | Continua `.eq('status', 'published')` — import draft **não** aparece na loja (esperado) |
| Pedidos / estoque / place_order | Não tocados |
| Resolução de preço | Services/RPCs de resolve não alterados |
| Admin produtos / fornecedores | Import catálogo estendido sem mudar rotas |
| Labels método | Detalhe usa `pricingMethodLabel` / `pricingRuleLabel` do service |

**P0 “ativo no admin / some no site”:** causa estrutural confirmada no código — catálogo exige `published`; import cria `draft` + `is_available=false`. Toggle publicar no admin é o caminho correto; não é bug de “toggle mascara”, e sim regra de publicação. 🟡 se houver caso com `published=true` ainda invisível (precisa smoke com dados reais).

---

## I. Problemas

### Resolvidos
- Detalhe monolítico → abas
- Import home só navegava → wizard
- Falta de classificação de ação no preview → helper derivado
- Massa confundida com adjust global → seleção via item RPC
- Catálogo 2 colunas → contrato 4 + enrichment

### Não resolvidos / limitações
- Limite **500** itens na lista (`adminListPriceListItems`)
- Progresso do apply: contador aproximado (RPC única, sem streaming)
- Perfis só **localStorage** até migration M aplicada
- Enrichment grupo/montadora duplicado com migration N até push
- Wizard etapas 4 (mapeamento manual de colunas) simplificado via aliases do contrato
- Git `safe.directory` pode impedir `git diff` neste ambiente

### Validações manuais pendentes (🟡)
- Smoke browser dos 5 fluxos com usuário admin
- Import real CSV/XLSX 2k linhas
- Duplicar lista com muitos itens
- Aplicar migration N em staging quando autorizado

---

## J. Matriz de conformidade

| Requisito | Status | Evidência | Observação |
|-----------|--------|-----------|------------|
| F8.1-I home cards/CRUD | ✅ | Overview + UI + testes | |
| F8.1-J abas detalhe | ✅ | `AdminPriceListDetailPage` | |
| F8.1-K wizard preços | ✅ | `PriceImportWizard` + testes ações | Mapeamento manual superficial |
| F8.1-L massa seleção | ✅ | Checkboxes + bulk handlers | Não usa adjust/recalc global |
| F8.1-M histórico | ✅ | `adminListPriceListImports` + aba | |
| F8.1-M perfis | ⚠️ | localStorage + SQL preparado | Sync multi-device após push |
| F8.1-N 4 colunas | ⚠️ | Contrato + enrichment client | RPC full após migration |
| UTF-8/mojibake | ✅ | `normalizeText` + testes | |
| Sem auto-publish | ✅ | RPC B + productService published | |
| Sem criar produto no import preço | ✅ | preview marca SKU não encontrado | |
| pricing_method ≠ price_origin | ✅ | UI/docs/código | |
| Sem db push / commit | ✅ | Restrição respeitada | |

---

## K. Riscos

1. Lista > 500 itens: massa/seleção incompleta.  
2. Migration N se aplicada sem review pode divergir do enrichment client (idempotente, mas testar).  
3. Ajuste global ainda sobrescreve origens (comportamento legado documentado na aba Formação).  
4. Perfis localStorage não sincronizam entre navegadores.

---

## L. Pendências

1. Autorizar e aplicar migrations M/N (ou só N) via processo controlado.  
2. Smoke E2E manual dos fluxos 1–5.  
3. Opcional: paginação server-side além de 500.  
4. Não iniciar Fase 9 até aceite deste relatório.

---

## Declaração

A Fase 8.1 (I–N no código) está **implementada e buildável**, com auditoria acima.  
**Não** declarar “100% validada em produção” sem smoke remoto (🟡).  
**PARAR** — sem Fase 9, sem commit, sem push, sem db push.
