# FAL-VAL-01 — Validação schema (projeto runtime)

**Data:** 2026-10-08  
**Projeto canônico:** `wtbpwuiayednvlhvuhbh` (CLI linked + `.env`)  
**Método:** `supabase migration list` + `supabase db query --linked` (somente leitura, exceto apply `import_profiles` se autorizado)  
**Adendo:** [FAL_IMP_01_ADDENDUM_RUNTIME_CANONICO_2026-10-08.md](./FAL_IMP_01_ADDENDUM_RUNTIME_CANONICO_2026-10-08.md)

---

## Resultado

| Critério | Status | Evidência |
|----------|--------|-----------|
| Linhagem `fase*` no remoto runtime | **PASS** | `migration list` — versões `20261003*`…`20261006*` alinhadas ao Git |
| Tabelas e-commerce (orders, carts, inventory, overrides, addresses…) | **PASS** | `information_schema.tables` |
| `customers` B2C (`profile_id`) | **PASS** | colunas compatíveis com app |
| RPCs: `place_order`, `resolve_product_price`, `search_products`, estoque, apply_*, MP confirm | **PASS** | `pg_proc` / `information_schema.routines` |
| Dados catálogo não vazios | **PASS** | 100 products; 99 available; 198 itens com preço |
| Sem dependência de tabelas HF B2B no runtime | **PASS** | sem `catalogs` / `customer_groups` |
| Tabela `import_profiles` | **GAP** | ausente — migration prepared local; apply pendente de autorização |
| Histórico de migrations sem drift | **FAIL parcial** | versões remote-only impedem `db push` até `migration repair` |
| App aponta para o mesmo project-ref auditado | **PASS** | `VITE_SUPABASE_URL=…wtbpwuiayednvlhvuhbh…` |
| Projeto MCP HF `owll…` | **N/A runtime** | não usar como verdade da loja |

### Veredito VAL-01

**Schema runtime = APTO para Onda 1** no essencial (Opção 1 já materializada).

Pendências **não bloqueantes** da Onda 1 de regras/dados:

1. Higiene `migration repair` + registrar arquivos locais órfãos (decisão operacional).  
2. Apply `import_profiles` (prepared) — UI ainda usa localStorage.  
3. Reconfigurar MCP Supabase para org/projeto **efe777** (`wtbp…`) nas próximas auditorias.

**Não** criar projeto novo. **Não** resetar `wtbp…`.

---

## Smoke SQL (manual / checklist)

- [x] Listar tabelas obrigatórias — OK  
- [x] Listar RPCs obrigatórias — OK  
- [ ] `select resolve_product_price(...)` em 1 SKU — recomendado na abertura Onda 1  
- [ ] `search_products` com termo real — recomendado na abertura Onda 1  
- [ ] `place_order` sandbox — só com gate Onda 1 / dados de teste  

---

## Gate Onda 1 — APROVADO

Com VAL-01 essencial **PASS**, Onda 1 liberada via **MARCHA eFe**.

- DIV-001 B, DIV-002 SQL central, D-LIBERAR checklist, D-REF direção  
- Congelamentos (D16, status≠available, anti-auto-publish, priority)  
- Higiene de migrations como item paralelo (não misturar com pricing)

| Campo | Valor |
|-------|-------|
| Aprovador Onda 1 | eFe |
| Data | 2026-10-09 |
| Escopo | Onda 1 completa (IMP-02…10 / 07 por blocos) |
| Observações | MARCHA — iniciar FAL-IMP-02; cada bloco com VAL-N |
