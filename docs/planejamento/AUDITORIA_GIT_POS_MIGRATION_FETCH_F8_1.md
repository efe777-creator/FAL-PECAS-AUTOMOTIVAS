# Auditoria Git pós-`migration fetch` (F8.1)

**Status:** concluída (somente leitura)  
**Data:** 2026-10-05  
**Branch:** `plan`  
**Projeto Supabase:** `wtbpwuiayednvlhvuhbh`  
**Gate anterior:** `db push` F8.1 B–F (ledger remoto **74**)

Nenhuma limpeza, `repair`, `reset`, `db pull`, commit ou push foi executado neste gate.

---

## 1. Resumo executivo

| Item | Resultado |
|------|-----------|
| Arquivos `.sql` em `fal-pecas/supabase/migrations/` | **74** (antes do fetch: **31** — ver `agent-tools-migrations-before.txt` / `after.txt`) |
| Consolidadas F2–F8 no `HEAD` | **26** — todas **`M`** (regravadas pelo fetch) |
| Novos untracked (fetch MCP) | **43** |
| Novos untracked (F8.1) | **5** (`20261005120000` … `20261005160000`) |
| Diff agregado 26× vs `HEAD` | **+2 / −293** linhas |
| Integridade SQL vs `HEAD` (`git diff --ignore-blank-lines`) | **24 IDENTICAL**, **2 CHANGED** (apenas comentários — ver §3) |
| Ledger `migration list --linked` ↔ disco | **74/74** entradas com arquivo; **0** órfãos |
| 43 MCP ↔ ledger | **43/43** com `local == remote` |
| Comandos Supabase mutáveis neste gate | **0** |
| Alterações em `fal-pecas/src` neste gate | **0** |

**Veredicto do gate:** **PASS** — o fetch alterou sobretudo formatação nas consolidadas; não há evidência de truncamento de SQL executável. As 43 remotas materializadas batem com o ledger. Decisão de versionamento/restore fica para o gate de limpeza (matriz §7).

**Nota:** O working tree continua com entregáveis F8.1 de aplicação (UI, serviços, testes, docs) **fora do escopo** desta auditoria; não foram modificados neste gate.

---

## 2. Pilar 1 — 26 consolidadas regravadas

### 2.1 Métricas por arquivo (diff total vs `HEAD`)

Legenda de classe:

- **A** — `git diff --ignore-blank-lines` idêntico ao `HEAD` (mudança só de linhas em branco / espaciamento).
- **B** — diff não ignorando blank lines em conteúdo de linha (neste repo: **somente comentários**, sem DDL/DML).

| Arquivo | + (total) | − (total) | Classe | `ignore-blank-lines` |
|---------|-----------|-----------|--------|----------------------|
| `20261003180000_fase2_schema_rls.sql` | 0 | 67 | A | IDENTICAL |
| `20261003181000_fase2_seed.sql` | 0 | 9 | A | IDENTICAL |
| `20261003185000_fase2_fix_rls_grants.sql` | 0 | 10 | A | IDENTICAL |
| `20261003190000_fase2_staff_policies_write_only.sql` | 1 | 1 | B | CHANGED |
| `20261003200000_fase3_schema_storage.sql` | 0 | 22 | A | IDENTICAL |
| `20261003210000_fase3_seed_catalog_base.sql` | 0 | 5 | A | IDENTICAL |
| `20261003220000_fase3_seed_commercial_products.sql` | 0 | 8 | A | IDENTICAL |
| `20261003230000_fase4_search_indexes.sql` | 0 | 4 | A | IDENTICAL |
| `20261003240000_fase4_search_products_rpc.sql` | 0 | 3 | A | IDENTICAL |
| `20261003250000_fase5_customer_security.sql` | 0 | 6 | A | IDENTICAL |
| `20261004010000_fase6_ecommerce.sql` | 1 | 14 | B | CHANGED |
| `20261004020000_fase6b_price_lists.sql` | 0 | 35 | A | IDENTICAL |
| `20261004030000_fase6c_addresses_freight.sql` | 0 | 14 | A | IDENTICAL |
| `20261004040000_fase7a_order_lifecycle.sql` | 0 | 19 | A | IDENTICAL |
| `20261004050000_fase6b1_price_overrides.sql` | 0 | 17 | A | IDENTICAL |
| `20261004060000_fase_audit_document_validation.sql` | 0 | 3 | A | IDENTICAL |
| `20261004100000_adjust_price_list_items.sql` | 0 | 3 | A | IDENTICAL |
| `20261004110000_fase7b_reception_confirmation.sql` | 0 | 9 | A | IDENTICAL |
| `20261004120000_fase7c_separation.sql` | 0 | 3 | A | IDENTICAL |
| `20261004130000_fase7d_expedition.sql` | 0 | 4 | A | IDENTICAL |
| `20261004140000_fase7e_delivery.sql` | 0 | 3 | A | IDENTICAL |
| `20261004150000_fase7f_inventory_ops.sql` | 0 | 2 | A | IDENTICAL |
| `20261004160000_fase7_orders_revoke_direct_update.sql` | 0 | 1 | A | IDENTICAL |
| `20261004170000_fase8_inventory_modes.sql` | 0 | 29 | A | IDENTICAL |
| `20261004180000_fix_set_store_inventory_mode.sql` | 0 | 1 | A | IDENTICAL |
| `20261004180100_fix_set_mode_where_clause.sql` | 0 | 1 | A | IDENTICAL |

**Contagem:** **24× A**, **2× B**.

Evidência bruta: `agent-tools-audit-numstat-full.txt`, `agent-tools-audit-numstat-ignore-blank.txt`.

### 2.2 Hipótese do fetch (confirmada)

O padrão dominante é **remoção de linhas em branco** entre blocos SQL, compatível com regravação a partir de `schema_migrations.statements` após o `repair` + `migration fetch --linked` (overwrite das consolidadas já presentes no disco).

### 2.3 Anexo — hunks classe B (semântica de comentário apenas)

**`20261003190000_fase2_staff_policies_write_only.sql`**

```diff
--- See applied migration fase2_staff_policies_write_only on Supabase.
+-- See applied migration fase2_staff_policies_write_only on Supabase.;
```

**`20261004010000_fase6_ecommerce.sql`**

```diff
 $$;
-
 revoke all on function public.confirm_simulated_payment(uuid, text) from public;
 grant execute on function public.confirm_simulated_payment(uuid, text) to authenticated;
-
 revoke all on function public.release_order_reservations(uuid) from public;
--- only callable from other security definer funcs / staff via SQL
+-- only callable from other security definer funcs / staff via SQL;
```

Nenhum `create`, `alter`, `drop`, `grant` ou corpo de função foi alterado — apenas blank lines e `;` no fim de linha de comentário.

---

## 3. Cruzamento N:1 (prioridade F2 staff, F6, F8)

Referência de mapeamento: [PLANO_RECONCILIACAO_MIGRATIONS_F8_1.md](./PLANO_RECONCILIACAO_MIGRATIONS_F8_1.md) §2–3.

| Cruzamento | Resultado | Interpretação |
|------------|-----------|---------------|
| **F8** `20261004170000` HEAD vs disco | **IDENTICAL** (`ignore-blank-lines`) | Fetch não truncou F8 consolidado |
| **F6** `20261004010000` HEAD vs disco | **CHANGED** | Alinhado ao hunk §2.3 (comentário/blanks) |
| **F8** HEAD vs concat MCP (`141247`+`141324`+`141439`+`141850`) | **DIFF** (tamanhos ~21k vs ~8.7k normalizado) | **Esperado:** consolidado local ≠ concatenação literal dos 4 fragmentos MCP (N:1 / conteúdo consolidado no repo) |
| **F6** HEAD vs concat MCP (`004806`+`004825`+`004835`) | **DIFF** (~15.8k vs ~14.5k) | **Esperado:** arquivo consolidado inclui mais que a soma dos 3 arquivos MCP (RLS, índices, etc. no consolidado) |
| **F2 staff** `20261003190000` vs MCP `20261003205157` | **DIFF** | **Esperado:** consolidado local é **stub** (comentário); SQL executável está na migration MCP e já aplicada no remoto |

Conclusão N:1: **não há indício de perda de SQL executável** nas consolidadas pós-fetch; diferenças HEAD↔MCP refletem o desenho histórico (consolidação + stub F2 staff), não regressão do fetch.

---

## 4. Pilar 2 — 43 migrations MCP materializadas (`??`)

### 4.1 Lista canônica (diff de conjuntos)

`agent-tools-migrations-after.txt` − `agent-tools-migrations-before.txt` = **43** arquivos (`agent-tools-audit-mcp-only-new.txt`).

Inclui explicitamente `20261003220243_fase3_seed_commercial_products.sql`.

### 4.2 Ledger ↔ disco

Saída: `agent-tools-audit-migration-list.txt` (`npx supabase migration list --linked`).

- Entradas no ledger: **74**
- Para cada uma das **43** versões MCP: arquivo `YYYYMMDDHHMMSS_<name>.sql` existe e `local == remote`
- Arquivos `.sql` no disco sem entrada no ledger: **0**
- Entradas no ledger sem arquivo: **0**

### 4.3 Inventário MCP (version, name, bytes, SHA256 prefix)

Hashes completos (prefixo 16 hex) em `agent-tools-audit-mcp-hashes.csv`. Tabela:

| Version | Name | Bytes | SHA256 (16) | Consolidado local (mapa) |
|---------|------|-------|-------------|---------------------------|
| 20261003203453 | fase2_schema | 13878 | 8512E6388D516FC7 | `20261003180000_fase2_schema_rls` (B) |
| 20261003203507 | fase2_rls | 9079 | C490BEB68E265682 | `20261003180000_fase2_schema_rls` (B) |
| 20261003205021 | fase2_security_hardening | 1438 | 45A5CCEECF5FB11A | ≈ F2 local (D) |
| 20261003205116 | fase2_fix_rls_function_grants | 2582 | E77563E39D1CF98E | `20261003185000_fase2_fix_rls_grants` (A) |
| 20261003205157 | fase2_staff_policies_write_only | 7813 | DAFB3AF48AEA4DDD | stub `20261003190000` / policies no remoto (A) |
| 20261003215816 | fase3_schema_storage | 8841 | EB27FB406A13E9E5 | `20261003200000_fase3_schema_storage` (A) |
| 20261003220209 | fase3_seed_catalog_base | 6602 | AAC081D416B88E56 | `20261003210000_fase3_seed_catalog_base` (A) |
| 20261003220243 | fase3_seed_commercial_products | 3515 | FCC8C43320215413 | `20261003220000_fase3_seed_commercial_products` (A) |
| 20261003224318 | fase4_search_indexes | 674 | C7169AEE1DF49B14 | `20261003230000_fase4_search_indexes` (A) |
| 20261003224346 | fase4_search_products_rpc | 7629 | 4DE4876503BE1E4C | `20261003240000_fase4_search_products_rpc` (A) |
| 20261003235734 | fase5_customer_security | 814 | 278ABB7A9A93937F | `20261003250000_fase5_customer_security` (A) |
| 20261004000054 | fase5_customers_insert_own | 194 | 27E900C2CC29BAE8 | `20261003250000` (B) |
| 20261004004806 | fase6_ecommerce_schema_shipping | 2616 | 70B5A0F01F1B6C0C | `20261004010000_fase6_ecommerce` (B) |
| 20261004004825 | fase6_place_order_rpc | 9016 | AB48946E6B0A8C15 | `20261004010000_fase6_ecommerce` (B) |
| 20261004004835 | fase6_confirm_simulated_payment | 2978 | 210A1246EBE649CD | `20261004010000_fase6_ecommerce` (B) |
| 20261004020236 | fase6b_price_lists_schema_rls | 5861 | 4D4B798AD63035B2 | `20261004020000_fase6b_price_lists` (B) |
| 20261004020245 | fase6b_seed_migrate_prices | 1531 | E60ED63670228479 | `20261004020000_fase6b_price_lists` (B) |
| 20261004020258 | fase6b_resolve_and_sync | 4118 | 1A38F407E643833F | `20261004020000_fase6b_price_lists` (B) |
| 20261004020318 | fase6b_place_order_resolve_price | 8293 | A1949897709ED02C | `20261004020000_fase6b_price_lists` (B) |
| 20261004023725 | fase6c_addresses_freight | 2530 | 6BC86308DCD5D3D0 | `20261004030000_fase6c_addresses_freight` (A) |
| 20261004035304 | fase7a_order_lifecycle | 2138 | 19C8DA54A7A137F9 | `20261004040000_fase7a_order_lifecycle` (B) |
| 20261004035314 | fase7a_order_lifecycle_funcs | 3705 | 1CCD4CB832A69F37 | `20261004040000_fase7a_order_lifecycle` (B) |
| 20261004035327 | fase7a_confirm_payment_cycle | 5884 | 3D66B04CAFE386DD | `20261004040000_fase7a_order_lifecycle` (B) |
| 20261004042355 | fase6b1_price_overrides | 6458 | FAEDA7C1AFA765EE | `20261004050000_fase6b1_price_overrides` (A) |
| 20261004045906 | fase_audit_document_validation | 1693 | 1BD9F7076DDCBFE7 | `20261004060000_fase_audit_document_validation` (B) |
| 20261004045956 | fase_audit_document_validation_place_order | 8432 | ECC9EF96B2C612AA | `20261004060000_fase_audit_document_validation` (B) |
| 20261004132206 | adjust_price_list_items | 4649 | 418F2395E3B0F1D6 | `20261004100000_adjust_price_list_items` (A) |
| 20261004132213 | repair_base_price_list_seed | 1081 | 988B03EFD33F0439 | sem consolidado (C) |
| 20261004132634 | fase7b_transition_cancel_roles | 2311 | 34FA597E1E93CFE9 | `20261004110000_fase7b_reception_confirmation` (B) |
| 20261004132643 | fase7b_set_item_availability | 2580 | F4030374192E8252 | `20261004110000_fase7b_reception_confirmation` (B) |
| 20261004132650 | fase7b_finalize_and_counts | 4096 | 82AAC49137148FAA | `20261004110000_fase7b_reception_confirmation` (B) |
| 20261004132956 | fase7c_separation | 3345 | C286E5A6C7AED2EB | `20261004120000_fase7c_separation` (A) |
| 20261004133005 | fase7d_expedition | 2572 | 4914F5D06F2D30A6 | `20261004130000_fase7d_expedition` (A) |
| 20261004133007 | fase7e_delivery | 1539 | 277B6C6CC6946CDE | `20261004140000_fase7e_delivery` (A) |
| 20261004133015 | fase7f_inventory_ops | 3146 | 8A1650DA5A6C984B | `20261004150000_fase7f_inventory_ops` (A) |
| 20261004133032 | fase7d_ship_order_order_fix | 2240 | 496FF683C3E30AC0 | ≈ `20261004130000` (D) |
| 20261004134907 | fase7_orders_revoke_direct_update | 155 | 809A6C72B1A0956D | `20261004160000_fase7_orders_revoke_direct_update` (A) |
| 20261004141247 | fase8_inventory_modes | 2610 | 9829FA52BBDEADA6 | `20261004170000_fase8_inventory_modes` (B) |
| 20261004141324 | fase8_release_fulfill_snapshot | 2171 | 8FCA608203791576 | `20261004170000_fase8_inventory_modes` (B) |
| 20261004141439 | fase8_adjust_inventory_and_reports | 3486 | 3D17695C6F2E2ABA | `20261004170000_fase8_inventory_modes` (B) |
| 20261004141850 | fase8_sync_availability_respect_mode | 469 | B03C804010625565 | `20261004170000_fase8_inventory_modes` (B) |
| 20261004151602 | fix_set_store_inventory_mode | 1153 | D1D74ABCAE621183 | `20261004180000_fix_set_store_inventory_mode` (A) |
| 20261004151654 | fix_set_mode_where_clause | 1176 | 02C670D9BA5886C8 | `20261004180100_fix_set_mode_where_clause` (A) |

Legenda confiança do plano: **A** espelho forte, **B** fragmento N:1, **C** só remoto, **D** evidência parcial.

---

## 5. Pilar 3 — F8.1 (separado do fetch)

| Arquivo | Git | Remoto |
|---------|-----|--------|
| `20261005120000_fase81b_catalog_import.sql` | untracked | applied |
| `20261005130000_fase81c_supplier_conversions.sql` | untracked | applied |
| `20261005140000_fase81d_supplier_costs.sql` | untracked | applied |
| `20261005150000_fase81e_pricing_formation.sql` | untracked | applied |
| `20261005160000_fase81f_price_list_import_rpc.sql` | untracked | applied |

Não existiam no `HEAD`; **não** foram alvo de overwrite do fetch. Conteúdo local = candidato a versionar no commit F8.1 futuro.

---

## 6. Artefatos gerados (raiz do repo)

| Arquivo | Uso |
|---------|-----|
| `agent-tools-audit-numstat-full.txt` | +/- por arquivo (diff total) |
| `agent-tools-audit-numstat-ignore-blank.txt` | +/- ignorando blank (classe B) |
| `agent-tools-audit-mcp-only-new.txt` | 43 nomes MCP |
| `agent-tools-audit-migration-list.txt` | JSON ledger local/remoto |
| `agent-tools-audit-mcp-hashes.csv` | bytes + SHA256 das 43 MCP |

---

## 7. Matriz de decisão (gate de limpeza — não executada)

| Opção | 26 consolidadas | 43 MCP | Prós | Contras |
|-------|-----------------|--------|------|---------|
| **R1** | `git checkout HEAD -- fal-pecas/supabase/migrations/20261003*.sql` … (26 arquivos) | manter untracked ou `.gitignore` local | Repo alinhado ao histórico versionado; SQL executável idêntico ao `HEAD` | Perde normalização blank do fetch; outro clone pode precisar de `fetch` de novo |
| **R2** | manter pós-fetch | apagar local após audit | Menos arquivos no disco | Perde espelho 74-way; CLI pode reclamar em push |
| **R3** | restaurar `HEAD` | **git add** 43 MCP | Disco = ledger 74 no Git; auditoria remota preservada | Duplicação semântica vs consolidadas; PR ruidoso |
| **R4** | restaurar `HEAD` | arquivar fora de `migrations/` | Separa “canônico” vs “espelho” | Supabase CLI não enxerga arquivos fora da pasta padrão |

**Recomendação preliminar:** **R1** para as 26 consolidadas (restore ao `HEAD` é seguro para SQL — §2–3) + **não** versionar as 43 MCP no commit inicial F8.1 (remoto já as tem aplicadas). Se a política do time for “repositório espelha ledger completo”, preferir **R3**.

Decisão final: **eFe**, após gate de limpeza autorizado.

---

## 8. Checklist de sucesso

- [x] **26/26** consolidadas classificadas (A/B) com `numstat`
- [x] **2/2** arquivos B documentados com hunks legíveis
- [x] **43/43** MCP mapeados ao ledger + hashes
- [x] **5/5** F8.1 isoladas do lote fetch
- [x] Matriz R1–R4 preenchida; nenhuma limpeza executada
- [x] Zero alterações em código de app neste gate; zero comandos Supabase mutáveis

**Gate auditoria Git pós-fetch:** **FECHADO (PASS).**
