# Relatório de Auditoria — Fase 2 (2026-10-03)

**Projeto:** FAL Peças Automotivas 3.0  
**Escopo:** implantações da Fase 2 (schema, RLS, services, UI) + ajustes pós-auditoria  
**Stack:** Vite + React + Supabase (`wtbpwuiayednvlhvuhbh`)

---

## 1. Resumo executivo

| Área | Status |
|------|--------|
| Schema + seed | OK |
| RLS (após correção) | OK para leitura pública |
| Services catálogo/veículo | OK |
| Home / Catálogo / Produto / Busca | OK |
| Carrinho no card | OK (ajuste UI) |
| Filtros no catálogo | OK (ajuste UI) |
| Header responsivo | OK (ajuste UI) |
| Advisors de segurança | WARN residual aceitável |

**Veredito:** Fase 2 operacional. Bug crítico de RLS corrigido. UI de catálogo/carrinho reforçada.

---

## 2. Banco de dados

### Entregue
- 27 tabelas com RLS
- Trigger `auth.users` → `profiles` + `customers`
- `product_references`, compatibilidade, inventário
- Disponibilidade pública via `products.is_available` (sem expor quantidade)

### Seed estrutural
| Entidade | Qtd |
|----------|-----|
| Categorias (raiz) | 3 |
| Categorias (total) | 12 |
| Montadoras / modelos / versões | 3 / 3 / 3 |
| Produtos published | 2 |
| Referências | 3 |
| Aplicações | 2 |

### Bug crítico encontrado e corrigido
**Sintoma:** Home com “Erro ao carregar categorias/produtos/veículos”.  
**Causa:** policies staff `FOR ALL` chamavam `is_staff()` também no SELECT do role `anon` → `42501 permission denied for function is_staff`.  
**Correção:**
- Leitura pública só por `status`
- Staff: policies `TO authenticated` separadas (SELECT/INSERT/UPDATE/DELETE)
- `EXECUTE` de `is_staff` / `current_customer_id` apenas para `authenticated`
- Triggers `handle_new_user` / `sync_product_availability` sem EXECUTE público

Migrations locais:
- `fal-pecas/supabase/migrations/20261003180000_fase2_schema_rls.sql`
- `fal-pecas/supabase/migrations/20261003181000_fase2_seed.sql`
- `fal-pecas/supabase/migrations/20261003185000_fase2_fix_rls_grants.sql`
- `fal-pecas/supabase/migrations/20261003190000_fase2_staff_policies_write_only.sql`

---

## 3. Frontend / services

### OK
- `categoryService`, `productService`, `vehicleService` leem Supabase
- NavBar categorias do banco + ícone Home
- Header: logo + busca na mesma linha (mobile/tablet)
- Catálogo: busca, categoria, montadora/modelo/ano/motor, chips
- ProductCard: badge 🛒 + qty, controles − / +
- Produto: disponibilidade, refs, aplicação
- Busca por referência `PVI1032` → pivô seed

### Env
- URL correta: `https://….supabase.co` (sem `/rest/v1/`)
- Vite lê `fal-pecas/.env.local`

---

## 4. Testes manuais (browser)

| Fluxo | Resultado |
|-------|-----------|
| Home categorias + veículos + destaques | Passou |
| Catálogo lista seed | Passou |
| Busca `PVI1032` | Passou |
| Produto + aplicação Fiat Palio | Passou |
| Login (tela) | Passou |
| Header ~743px (altura ~77px, mesma linha) | Passou |
| API anon categories/products/makers | Passou pós-fix RLS |

---

## 5. Advisors Supabase (residual)

| Item | Nível | Ação |
|------|-------|------|
| `is_staff` / `current_customer_id` executáveis por `authenticated` | WARN | Necessário para RLS de conta; aceitável nesta fase |
| Leaked password protection desativada | WARN | Ativar no painel Auth quando for para produção |

---

## 6. Ajustes feitos nesta sessão (pós-auditoria)

1. RLS staff write-only / grants  
2. Header responsivo  
3. ProductCard com quantidade no carrinho  
4. Catálogo com busca + filtros  
5. NavBar com ícone Home (⌂)

---

## 7. Fora do escopo / próximo

- Fase 3: catálogo comercial real  
- Fase 4: FTS/relevância e filtros de veículo mais profundos  
- Sync carrinho autenticado, checkout, admin  
- Ativar proteção de senha vazada no Auth  

---

## 8. Critérios de saída Fase 2

- [x] Schema + RLS aplicados  
- [x] Relações críticas cobertas  
- [x] Matriz tela↔dados  
- [x] App lê categorias/produtos/veículos via services  
- [x] Categorias não hardcoded como fonte de verdade  
