# Plano de reconciliação — histórico de migrations (pré-F8.1 apply)

**Status:** PLANO APENAS — **não executar** repair / push / SQL de alteração.  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Data:** 2026-10-05  
**Base:** diagnóstico F8.1 (interseção version ID = 0; remoto funcional F2–F8; F8.1 pendente).

---

## 1. Objetivo do repair (quando autorizado)

Alinhar a tabela `supabase_migrations.schema_migrations` para que a CLI reconheça as **31−5 = 26** migrations locais F2–F8 (até `20261004180100`) como **já aplicadas**, sem reexecutar o SQL consolidado.

Depois disso, `db push` (em etapa **posterior** e autorizada) deve oferecer **somente**:

```text
20261005120000 … 20261005160000  (F8.1-B…F)
```

### O que o repair NÃO deve fazer

- Não marcar F8.1-B…F como `applied`.
- Não executar o SQL das migrations locais consolidadas.
- Não usar `db reset`.
- Não apagar arquivos locais.
- Preferência deste plano: **não** marcar remoto-only como `reverted` (preserva trilha de auditoria do apply original via MCP).

---

## 2. Mapa remoto → local

Legenda de confiança:

| Tag | Significado |
|-----|-------------|
| **A** | Equivalente semântico forte (mesmo nome / docs / consolidação explícita) |
| **B** | Conteúdo remoto absorvido em arquivo local consolidado (N:1) |
| **C** | Remoto sem arquivo local separado; objeto já presente no banco |
| **D** | Evidência incompleta do diff exato local↔remoto |

| # | Remoto `version` | Remoto `name` | Arquivo local que representa | Conf. | Notas |
|---|------------------|---------------|------------------------------|-------|-------|
| 1 | `20261003203453` | `fase2_schema` | `20261003180000_fase2_schema_rls.sql` | B | Parte F2 |
| 2 | `20261003203507` | `fase2_rls` | `20261003180000_fase2_schema_rls.sql` | B | Parte F2 |
| 3 | `20261003205021` | `fase2_security_hardening` | *(sem arquivo dedicado)* ≈ F2 local | D | Sem SQL remoto no repo |
| 4 | `20261003205116` | `fase2_fix_rls_function_grants` | `20261003185000_fase2_fix_rls_grants.sql` | A | |
| 5 | `20261003205157` | `fase2_staff_policies_write_only` | `20261003190000_fase2_staff_policies_write_only.sql` | A | |
| 6 | `20261003215816` | `fase3_schema_storage` | `20261003200000_fase3_schema_storage.sql` | A | |
| 7 | `20261003220209` | `fase3_seed_catalog_base` | `20261003210000_fase3_seed_catalog_base.sql` | A | |
| 8 | `20261003220243` | `fase3_seed_commercial_products` | `20261003220000_fase3_seed_commercial_products.sql` | A | |
| 9 | `20261003224318` | `fase4_search_indexes` | `20261003230000_fase4_search_indexes.sql` | A | |
| 10 | `20261003224346` | `fase4_search_products_rpc` | `20261003240000_fase4_search_products_rpc.sql` | A | |
| 11 | `20261003235734` | `fase5_customer_security` | `20261003250000_fase5_customer_security.sql` | A | |
| 12 | `20261004000054` | `fase5_customers_insert_own` | **mesmo** `20261003250000_…` (policy `customers_insert_own`) | B | Não é “órfã” de conteúdo; é split remoto |
| 13 | `20261004004806` | `fase6_ecommerce_schema_shipping` | `20261004010000_fase6_ecommerce.sql` | B | |
| 14 | `20261004004825` | `fase6_place_order_rpc` | `20261004010000_fase6_ecommerce.sql` | B | |
| 15 | `20261004004835` | `fase6_confirm_simulated_payment` | `20261004010000_fase6_ecommerce.sql` | B | |
| 16 | `20261004020236` | `fase6b_price_lists_schema_rls` | `20261004020000_fase6b_price_lists.sql` | B | |
| 17 | `20261004020245` | `fase6b_seed_migrate_prices` | `20261004020000_fase6b_price_lists.sql` | B | |
| 18 | `20261004020258` | `fase6b_resolve_and_sync` | `20261004020000_fase6b_price_lists.sql` | B | |
| 19 | `20261004020318` | `fase6b_place_order_resolve_price` | `20261004020000_fase6b_price_lists.sql` | B | |
| 20 | `20261004023725` | `fase6c_addresses_freight` | `20261004030000_fase6c_addresses_freight.sql` | A | |
| 21 | `20261004035304` | `fase7a_order_lifecycle` | `20261004040000_fase7a_order_lifecycle.sql` | B | Doc AUDITORIA_FASE7 |
| 22 | `20261004035314` | `fase7a_order_lifecycle_funcs` | `20261004040000_fase7a_order_lifecycle.sql` | B | |
| 23 | `20261004035327` | `fase7a_confirm_payment_cycle` | `20261004040000_fase7a_order_lifecycle.sql` | B | |
| 24 | `20261004042355` | `fase6b1_price_overrides` | `20261004050000_fase6b1_price_overrides.sql` | A | |
| 25 | `20261004045906` | `fase_audit_document_validation` | `20261004060000_fase_audit_document_validation.sql` | B | |
| 26 | `20261004045956` | `fase_audit_document_validation_place_order` | `20261004060000_fase_audit_document_validation.sql` | B | |
| 27 | `20261004132206` | `adjust_price_list_items` | `20261004100000_adjust_price_list_items.sql` | A | |
| 28 | `20261004132213` | `repair_base_price_list_seed` | **SEM arquivo local** | C | Já no remoto (seed); ver §4 |
| 29 | `20261004132634` | `fase7b_transition_cancel_roles` | `20261004110000_fase7b_reception_confirmation.sql` | B | |
| 30 | `20261004132643` | `fase7b_set_item_availability` | `20261004110000_fase7b_reception_confirmation.sql` | B | |
| 31 | `20261004132650` | `fase7b_finalize_and_counts` | `20261004110000_fase7b_reception_confirmation.sql` | B | |
| 32 | `20261004132956` | `fase7c_separation` | `20261004120000_fase7c_separation.sql` | A | |
| 33 | `20261004133005` | `fase7d_expedition` | `20261004130000_fase7d_expedition.sql` | A | |
| 34 | `20261004133007` | `fase7e_delivery` | `20261004140000_fase7e_delivery.sql` | A | |
| 35 | `20261004133015` | `fase7f_inventory_ops` | `20261004150000_fase7f_inventory_ops.sql` | A | |
| 36 | `20261004133032` | `fase7d_ship_order_order_fix` | ≈ `20261004130000_fase7d_expedition.sql` | D | Fix incremental; SQL remoto não no repo |
| 37 | `20261004134907` | `fase7_orders_revoke_direct_update` | `20261004160000_fase7_orders_revoke_direct_update.sql` | A | |
| 38 | `20261004141247` | `fase8_inventory_modes` | `20261004170000_fase8_inventory_modes.sql` | B | |
| 39 | `20261004141324` | `fase8_release_fulfill_snapshot` | `20261004170000_fase8_inventory_modes.sql` | B | |
| 40 | `20261004141439` | `fase8_adjust_inventory_and_reports` | `20261004170000_fase8_inventory_modes.sql` | B | |
| 41 | `20261004141850` | `fase8_sync_availability_respect_mode` | `20261004170000_fase8_inventory_modes.sql` | B | |
| 42 | `20261004151602` | `fix_set_store_inventory_mode` | `20261004180000_fix_set_store_inventory_mode.sql` | A | |
| 43 | `20261004151654` | `fix_set_mode_where_clause` | `20261004180100_fix_set_mode_where_clause.sql` | A | |

### Local sem correspondente remoto por version ID (esperado)

Inclui `20261003181000_fase2_seed.sql` e todos os demais F2–F8 com timestamps redondos + **F8.1 B–F**.

`fase2_seed` local: seed provavelmente já refletido no remoto via `fase3_seed_*` / dados atuais; marcar `20261003181000` como applied **só** se aceitarmos que reexecutar seed local no remoto seria indesejável e o banco já tem catálogo — evidência operacional: produtos/listas existem. Confiança: **B/D**.

---

## 3. Consolidados locais N:1 (englobam várias remotas)

| Arquivo local | Remotas que cobre |
|---------------|-------------------|
| `20261003180000_fase2_schema_rls.sql` | `…203453`, `…203507` (+ hardening remoto parcialmente D) |
| `20261003250000_fase5_customer_security.sql` | `…235734`, `…000054` (`customers_insert_own`) |
| `20261004010000_fase6_ecommerce.sql` | `…004806`, `…004825`, `…004835` |
| `20261004020000_fase6b_price_lists.sql` | `…020236`, `…020245`, `…020258`, `…020318` |
| `20261004040000_fase7a_order_lifecycle.sql` | `…035304`, `…035314`, `…035327` |
| `20261004060000_fase_audit_document_validation.sql` | `…045906`, `…045956` |
| `20261004110000_fase7b_reception_confirmation.sql` | `…132634`, `…132643`, `…132650` |
| `20261004170000_fase8_inventory_modes.sql` | `…141247`, `…141324`, `…141439`, `…141850` |

---

## 4. Remotas sem equivalente local exato (arquivo dedicado)

| Remoto | Risco se ignorarmos no repair de *local* | Recomendação |
|--------|------------------------------------------|--------------|
| `fase2_security_hardening` | Baixo no *push F8.1* (já applied no remoto). Diff vs local F2 **não** auditado linha a linha. | Deixar version remota no histórico. **Não** `reverted`. Antes do repair: opcional diff de schema F2 (fora deste plano). |
| `fase5_customers_insert_own` | **Baixo** — policy existe no SQL local F5. | Coberto ao marcar `20261003250000` applied. |
| `repair_base_price_list_seed` | **Médio para greenfield**; **baixo para este remoto** (seed já aplicado; há itens na lista base). | Deixar no histórico remoto. **Não** inventar migration local agora. **Não** `reverted`. |
| `fase7d_ship_order_order_fix` | Baixo para F8.1; `ship_order` existe no remoto. Diff vs `20261004130000` não no repo. | Deixar remoto. Marcar local F7D applied com ressalva D. |

Estas **não** bloqueiam marcar as versões **locais** F2–F8 como `applied`, desde que o objetivo seja só destravar o push de F8.1 neste projeto já migrado.

---

## 5. Quais versões marcar como `applied`?

### SIM — marcar (versões **locais** ausentes do remoto)

Todas abaixo, **exceto F8.1**:

```text
20261003180000
20261003181000
20261003185000
20261003190000
20261003200000
20261003210000
20261003220000
20261003230000
20261003240000
20261003250000
20261004010000
20261004020000
20261004030000
20261004040000
20261004050000
20261004060000
20261004100000
20261004110000
20261004120000
20261004130000
20261004140000
20261004150000
20261004160000
20261004170000
20261004180000
20261004180100
```

### NÃO marcar

```text
20261005120000  F8.1-B
20261005130000  F8.1-C
20261005140000  F8.1-D
20261005150000  F8.1-E
20261005160000  F8.1-F
```

### NÃO marcar / NÃO reverter (versões **somente remotas**)

Todas as 43 do §2 — permanecem como histórico do apply original.

---

## 6. O repair faria a CLI pular alteração real?

| Pergunta | Resposta |
|----------|----------|
| Pular F8.1? | **Não**, se B–F **não** forem marcadas. |
| Reexecutar F2–F8 consolidado no remoto? | **Não** — repair `applied` só registra version ID. |
| Esconder SQL local que o remoto nunca recebeu? | **Risco residual**: se algum arquivo consolidado local tiver **delta posterior** ao apply MCP, esse delta **não** será aplicado pelo push. Mitigação: banco já opera F7/F8 (RPCs confirmadas); escopo desta reconciliação é histórico, não re-sync de schema F2–F8. |
| Perder `repair_base_price_list_seed`? | **Não neste remoto** (já aplicado). Gap só para ambientes criados só a partir do tree local atual. |
| `fase5_customers_insert_own`? | Conteúdo no local F5; não é skip. |

**Conclusão de segurança para F8.1:** marcar as 26 versões locais F2–F8 como `applied` **não** deve fazer a CLI pular F8.1.  
**Conclusão de segurança global:** o repair **não** substitui um `db pull`/diff completo F2–F8; apenas reconcilia o *ledger* para este projeto.

---

## 7. Comandos exatos (NÃO EXECUTAR)

Pré-condições: CLI autenticada; `fal-pecas/` com link a `wtbpwuiayednvlhvuhbh`.

### 7.1 Preview / estado atual

```powershell
cd "D:\Programas WEB\PROGRAMAS WEB PENDRIVE\FAL PECAS AUTOMOTIVAS\fal-pecas"
npx supabase migration list
```

### 7.2 Repair — marcar locais F2–F8 como applied

```powershell
cd "D:\Programas WEB\PROGRAMAS WEB PENDRIVE\FAL PECAS AUTOMOTIVAS\fal-pecas"

npx supabase migration repair --status applied --linked `
  20261003180000 `
  20261003181000 `
  20261003185000 `
  20261003190000 `
  20261003200000 `
  20261003210000 `
  20261003220000 `
  20261003230000 `
  20261003240000 `
  20261003250000 `
  20261004010000 `
  20261004020000 `
  20261004030000 `
  20261004040000 `
  20261004050000 `
  20261004060000 `
  20261004100000 `
  20261004110000 `
  20261004120000 `
  20261004130000 `
  20261004140000 `
  20261004150000 `
  20261004160000 `
  20261004170000 `
  20261004180000 `
  20261004180100
```

### 7.3 Verificação pós-repair (ainda sem push)

```powershell
npx supabase migration list
```

Esperado:

- F2–F8 locais: LOCAL **e** REMOTO preenchidos (ou equivalentes alinhados).
- F8.1 B–F: **somente LOCAL**.
- 43 remotas originais: continuam no histórico (somente remoto ou ambas, conforme CLI).

### 7.4 Próxima etapa (outra autorização)

```powershell
# NÃO executar agora
npx supabase db push
```

Deve propor **apenas** as cinco F8.1.

### 7.5 Explicitamente fora do plano

```powershell
# NÃO executar
npx supabase migration repair --status reverted --linked <qualquer-version-remota>
npx supabase db reset
```

---

## 8. Critérios para autorizar o repair

Autorizar **somente** se:

1. Aceitar risco residual D (`fase2_security_hardening`, `fase7d_ship_order_order_fix`, `fase2_seed` local).
2. Aceitar que `repair_base_price_list_seed` permanece só no histórico remoto.
3. Confirmar que o alvo é **só** destravar F8.1 neste projeto, não re-derivar schema F2–F8 do disco.
4. Após repair, validar `migration list` **antes** de qualquer `db push`.

---

## 9. Veredito do plano

| Item | Valor |
|------|-------|
| Repair seguro *para o objetivo F8.1 neste remoto*? | **CONDICIONALMENTE SIM** (com ressalvas §4/§6) |
| Executar agora? | **NÃO** — aguardar autorização explícita |
| F8.1 pode ser aplicada antes do repair? | **NÃO** via `db push` do estado atual (empurraria F2–F8 locais) |

---

## 10. Alterações nesta etapa

```text
Migration repair: NÃO EXECUTADO
db push: NÃO
SQL de alteração: NÃO
Commit: NÃO
Push git: NÃO
```
