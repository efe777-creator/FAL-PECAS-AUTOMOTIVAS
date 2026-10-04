# AUDITORIA GERAL PÓS-FASE 7 — FAL

**Data:** 2026-10-04  
**Branch:** `plan` (tracking `origin/plan`)  
**Projeto Supabase:** `wtbpwuiayednvlhvuhbh`  
**Escopo:** somente auditoria — sem nova fase, sem push, sem refatoração.

---

## 1. Resumo executivo

| Pergunta | Resposta |
|----------|----------|
| Estado atual | MVP operacional F1–F7 no **código local + remoto Supabase**; F7 **não commitada/pushed** |
| F7 consolidada? | **Funcionalmente sim** (RPCs remotas + UI admin pedidos existem). **Versionamento Git: não** — working tree suja à frente de `5bd0043` |
| Sistema operacional? | **Sim**, para loja autenticada + operação de pedidos no admin, com frete/pagamento mock |
| Bloqueadores P0? | **Não** para uso controlado. Há **P1 de segurança** (UPDATE direto em `orders` por staff) e **P1 de Git** (trabalho F7 não versionado) |
| Riscos? | Sim — ver §6 |
| Regressões evidentes? | Não encontradas na auditoria estática + build |
| Avançar para planejar próxima fase? | **Sim, após commit da F7 e avaliação dos P1** |

**Veredito:** a Fase 7 está **implementada e ligada** (local + remoto). O sistema **pode operar em ambiente de desenvolvimento**. Antes de planejar F8 com segurança, é necessário **commitar/versionar a F7** e tratar o bypass potencial de `transition_order_status` via policy `orders_update_staff`.

---

## 2. Score geral (0–100, qualitativo)

| Dimensão | Score | Justificativa |
|----------|------:|---------------|
| Frontend | 82 | Rotas completas loja/conta/admin pedidos; placeholders só em clientes/estoque/relatórios |
| Backend (RPCs) | 85 | Ciclo pedido + preços + frete mock cobertos no remoto |
| Banco | 84 | Schema F2–F7F aplicado; constraints e triggers presentes |
| Segurança | 68 | RLS base OK; **risco**: staff pode `UPDATE orders` direto; sem suite de testes de authz |
| E-commerce | 86 | Checkout auth, DV doc, place_order, pagamento simulado |
| Administração | 78 | Catálogo/preços/pedidos fortes; clientes/estoque/relatórios placeholder |
| Pedidos | 88 | Fila + detalhe + F7B–E conectados às RPCs |
| Estoque | 72 | Reserva/release/baixa nas RPCs; **sem UI** `/admin/estoque` |
| Preços | 88 | Resolução + override + ajuste global atômico |
| UX | 80 | PT-BR, máscaras, stepper carrinho alinhado; lint de efeitos React |
| Documentação | 84 | ROADMAP/API/DATABASE alinhados à F7; docs de auditoria criadas |
| Testes | 35 | Sem `*.test.*`; só build/lint/smoke documental |
| Arquitetura | 83 | Services/adapters claros; mocks de frete/pagamento conscientes |

### Score geral do projeto: **78 / 100**

Justificativa: base comercial e operação de pedidos estão sólidas para um MVP pós-F7, mas a ausência de testes automatizados, placeholders de backoffice e o risco de UPDATE direto em `orders` impedem nota mais alta. O gap de **Git não commitado** reduz a confiança operacional até o versionamento.

---

## 3. Matriz geral de funcionalidades

| Módulo | Funcionalidade | Estado | Evidência | Prioridade |
|--------|----------------|--------|-----------|------------|
| Loja | Home / catálogo / produto | FUNCIONA | `HomePage`, `CatalogPage`, `ProductPage` | — |
| Loja | Busca / filtros / paginação | FUNCIONA | `searchService` + RPC `search_products` | — |
| Loja | Carrinho + stepper qtd | FUNCIONA | `CartContext`, `ProductCard`, `ProductPage` | — |
| Loja | Login e-mail | FUNCIONA | `authService.signInWithIdentifier` | — |
| Loja | Login username | NÃO IMPLEMENTADO | Erro explícito se sem `@` | FUTURO |
| Loja | Conta / favoritos / veículos / endereços | FUNCIONA | `/conta/*` + services | — |
| Loja | Checkout auth | FUNCIONA | `CheckoutPage` + `place_order` | — |
| Loja | Frete | FUNCIONA PARCIALMENTE (mock) | `resolve_mock_shipping_option` | FUTURO F9 |
| Loja | Pagamento | FUNCIONA PARCIALMENTE (simulado) | `confirm_simulated_payment` | FUTURO F9 |
| Loja | Pedidos + timeline + recompra | FUNCIONA | `AccountOrderDetailPage`, `orderLifecycle`, `buyAgainService` | — |
| Loja | Sessão persistente | FUNCIONA | `persistSession: true` em `supabase.ts` | — |
| Admin | Dashboard + contadores pedidos | FUNCIONA | `AdminDashboardPage` + `admin_order_status_counts` | — |
| Admin | Catálogo CRUD | FUNCIONA | pages admin products/categories/… | — |
| Admin | Preços / listas / import / ajuste global | FUNCIONA | `adjust_price_list_items` RPC + UI | — |
| Admin | Pedidos operação F7B–E | FUNCIONA | `AdminOrdersPage`, `AdminOrderDetailPage`, RPCs | — |
| Admin | Clientes | PLACEHOLDER | router → `AdminPlaceholderPage` | FUTURO F8 |
| Admin | Estoque UI | PLACEHOLDER | `/admin/estoque` | FUTURO F8 |
| Admin | Relatórios | PLACEHOLDER | `/admin/relatorios` | FUTURO F8 |
| Admin | Frete origem | FUNCIONA | `AdminShippingOriginPage` | — |
| Estoque | Reserva place_order | FUNCIONA | SQL `reserve` movement | — |
| Estoque | Release no cancel | FUNCIONA | `transition` → `release_order_reservations` (F7F) | — |
| Estoque | Baixa no envio | FUNCIONA | `fulfill_order_reservations` | — |
| Código morto | `OrdersPage` | PROBLEMA/DÉBITO | Texto “checkout ativo” desatualizado; rota redireciona | P3 |
| Git | Working tree F7 | RISCO | Modificados + untracked não em `origin` | P1 |

---

## 4. Fluxo completo do pedido

| Etapa | Estado | Evidência |
|-------|--------|-----------|
| Carrinho | FUNCIONA | `CartContext` + sync |
| Checkout | FUNCIONA | auth obrigatório |
| `place_order` | FUNCIONA | RPC remota; preço servidor; reserva |
| Pagamento simulado | FUNCIONA | `confirm_simulated_payment` → recebido/em_analise |
| Análise / availability | FUNCIONA | `set_order_item_availability` |
| Confirmação | FUNCIONA | `finalize_order_confirmation` |
| Separação | FUNCIONA | `separated` + `complete_order_separation` |
| Expedição | FUNCIONA | `ship_order` (manual) |
| Entrega | FUNCIONA | `deliver_order` |
| Estoque (cancel/envio) | FUNCIONA nas RPCs | F7F no remoto |
| Cancel | FUNCIONA com role | `staff_can_cancel` na transição |
| Timeline cliente | FUNCIONA | projeção + eventos `customer` |
| Teste E2E automatizado do ciclo | NÃO IMPLEMENTADO | sem suite | P1 (antes go-live) |

Não foi possível validar o ciclo ponta a ponta com usuário real nesta sessão (auditoria estática + presença remota de RPCs + build).

---

## 5. Banco de dados

### Migrations
- **Local:** 22 arquivos SQL em `fal-pecas/supabase/migrations/` (F2→F7F + ajuste preços).
- **Remoto:** F7A–F7F + `adjust_price_list_items` + repair seed aplicados (versões MCP distintas dos nomes locais — comportamento alinhado).

### RPCs críticas (remoto — confirmadas)
`place_order`, `confirm_simulated_payment`, `transition_order_status`, `staff_can_cancel`, `set_order_item_availability`, `finalize_order_confirmation`, `admin_order_status_counts`, `set_order_item_separated`, `complete_order_separation`, `ship_order`, `deliver_order`, `fulfill_order_reservations`, `release_order_reservations`, `adjust_price_list_items`, `resolve_product_price`, `is_staff`, mocks de frete.

### RLS (amostra)
- `orders_select_own` / `orders_insert_own`
- `orders_update_staff` (**UPDATE staff** — ver risco)
- `order_events_select_own_customer` + staff
- `inventory_staff_all`

### Integridade
- CHECKs de status/availability/movements presentes nas migrations.
- Triggers sync Base/Promo → `products.price` / `promo_price`.

---

## 6. Segurança

### Crítico
- Nenhum encontrado com evidência de exposição de `service_role` no frontend (`supabase.ts` documenta anon only).

### Alto
1. **Policy `orders_update_staff`** permite `UPDATE` direto em `orders` por qualquer `is_staff()`, potencialmente **bypass** de `order_transition_allowed` e de `staff_can_cancel`. UI usa RPC, mas a API PostgREST permanece aberta a update manual.  
   Evidência: `pg_policies` remoto + `20261003180000_fase2_schema_rls.sql`.
2. **Trabalho F7 não commitado** — risco de perda / ambiente divergente do remoto.

### Médio
3. Roles `estoque` / `atendimento` entram em `is_staff()` e herdam capacidade operacional de pedidos/RPCs staff (pode ser intencional; não há granularidade fina além do cancel).
4. `inventory` policy `ALL` para staff — alteração direta de saldos sem RPC de ajuste auditada na UI.
5. Sem testes automatizados de autorização.

### Baixo
6. Lint React (setState em effect) — higiene, não exploração.
7. Login username bloqueado com mensagem clara (não é falha de segurança).

---

## 7. UX

| Achado | Impacto | Prioridade |
|--------|---------|------------|
| Stepper carrinho alinhado card/produto | Positivo (recente) | — |
| Placeholders clientes/estoque/relatórios | Expectativa admin incompleta | FUTURO F8 |
| `OrdersPage` texto legado | Confusão se alguém navegar legado | P3 |
| Contadores dashboard reais | Positivo | — |
| Frete/pagamento “mock” sem label sempre explícito ao usuário final | Pode gerar expectativa de frete real | P2 |
| oxlint: muitos warnings hooks/effects | Manutenibilidade | P3 |

Responsividade admin (drawer) e loja mobile: presentes no código; **não foi feito teste visual nesta auditoria**.

---

## 8. Performance

| Risco | Evidência | Prioridade |
|-------|-----------|------------|
| Lista admin pedidos `limit(200)` | `adminOrderService.adminListOrders` | P2 |
| Itens de lista de preço `limit(500)` | `adminListPriceListItems` | P2 (já mitigado no adjust via RPC set-based) |
| Contagem de itens de listas via select amplo | `adminPriceListService` counts | P3 |
| Bundle xlsx grande | build ~424 kB chunk | P3 / aceitável |

Sem profiling runtime nesta auditoria.

---

## 9. Código / arquitetura

### Dívida técnica aceitável
- Frete/pagamento mock com adapters preparados (F9).
- Login username preparado, não implementado.
- Roles `estoque`/`atendimento` sem UI dedicada.

### Problemas a tratar
- `OrdersPage` morta / copy obsoleta (`src/pages/Orders/OrdersPage.tsx`).
- Duplicidade potencial de caminho de status (RPC vs UPDATE policy).
- Ausência total de testes unitários/E2E.

### Placeholders conscientes
- `/admin/clientes`, `/admin/estoque`, `/admin/relatorios`.

### Mocks
- `resolve_mock_shipping_option`, `mock_shipping_region_surcharge`, pagamento simulado.

---

## 10. Documentação

| Documento | Alinhamento |
|-----------|-------------|
| `ROADMAP_FASES_3.0.md` | Alinhado: F7 marcada concluída |
| `EXECUCAO_FASE7.md` / auditorias F7B–F | Alinhadas ao código local |
| `API.md` / `DATABASE.md` | Atualizados com F7B–F e ajuste global |
| `OrdersPage` vs docs conta | Inconsistência residual no componente morto |
| Spec F7 | Status “Implementada” |

---

## 11. Testes

| Tipo | Estado |
|------|--------|
| Automatizados (`*.test.*`) | **Ausentes** |
| `npm run build` | **OK** (tsc + vite) nesta auditoria |
| `npm run lint` | Warnings apenas (oxlint) |
| Smoke E2E pedido | Documentado em auditorias de fase; **não reexecutado** aqui |
| Fórmulas ajuste %/R$ | Validadas por script node na implementação F7 |

Riscos: regressão silenciosa em RPCs/permissões sem CI de testes.

---

## 12. Git

```
Branch: plan → origin/plan
HEAD remoto conhecido: 5bd0043 (gate documental F7)
Working tree: SUJA — F7 código+migrations+docs NÃO commitados
```

**Modificados (amostra):** router, AdminDashboard, prices services/UI, ProductPage, NavBar, docs entrada/planejamento.  
**Untracked:** `admin/orders/*`, `adminOrderService.ts`, migrations `2026100410*`–`0415*`, auditorias F7*.

**safe.directory:** Git bloqueia comandos sem `-c safe.directory=...` (ownership divergente no pendrive). **Não** alteramos `git config` nesta auditoria.

**Push:** não realizado (conforme regra).

---

## 13. Regressões

Verificadas por inspeção de código + build + presença remota de RPCs F6/F7:

- Catálogo / busca / conta / carrinho / checkout / preços / frete mock / timeline / admin catálogo: **sem evidência de regressão** introduzida pela F7 nas rotas e services principais.
- Estoque: lógica ampliada (release/baixa) nas RPCs; UI estoque continua placeholder (não é regressão).

**Não foram encontradas regressões evidentes durante a auditoria realizada.**

---

## 14. Pendências

### Bloqueadoras (antes de tratar o repo como “F7 entregue”)
1. **Commit** do pacote F7 (código + migrations + docs) na branch `plan`.
2. Avaliar/corrigir **P1** `orders_update_staff` (restringir UPDATE direto ou forçar mutação só via RPC).

### Antes da próxima fase
3. Smoke manual do ciclo pedido com roles operador vs gerente (cancel).
4. Remover ou atualizar `OrdersPage` morta.
5. Decidir granularidade de roles `estoque`/`atendimento` vs operação de pedidos.

### Melhorias
6. Paginação admin pedidos/listas.
7. Label UX “frete estimado (simulador)”.
8. Suite mínima de testes (RPCs críticas / place_order / transition).

### Futuras (F8/F9)
9. UI estoque, clientes, relatórios (F8).
10. Gateway pagamento + frete real (F9).
11. Login por username via backend seguro.
12. Comissão/margem, CRM, notificações — fora do MVP atual.

---

## 15. O que NÃO devemos mexer agora

- Motor de busca F4 / catálogo F3
- Checkout F6 + `place_order` (salvo correção de segurança transversal)
- Listas de preço F6B / override F6B.1 / ajuste global atômico (já corrigido)
- Fundação F7A (`order_events`, timeline, recompra)
- Fluxos F7B–F7F já ligados às RPCs (não reabrir sem bug concreto)
- Identidade visual / redesign

---

## 16. Próximos passos recomendados

1. **Commit** local do pacote F7 (+ ajuste preços + UX carrinho produto + remoção CTA nav) — **sem push** até autorização.
2. **P1 segurança:** revisar policy `orders_update_staff` (preferir revoke de UPDATE direto em status; mutações só via `transition_order_status`).
3. Smoke manual: operador confirma; gerente cancela; envio baixa estoque; cliente vê timeline.
4. Limpeza P3: `OrdersPage` ou redirect-only.
5. Só então: **planejar F8** (backoffice: estoque UI, clientes, relatórios mínimos).
6. Push quando autorizado.

---

## 17. Recomendação da próxima fase

### Próxima fase recomendada
**Fase 8 — Back Office e Operação Administrativa** (conforme ROADMAP), com fatia inicial:

### Objetivo
Completar painel operacional diário: **estoque (consulta/movimentos)**, **clientes**, relatórios mínimos — sem redesenhar checkout nem reabrir F7.

### Por que agora
F7 já fecha o ciclo do pedido; os placeholders `/admin/estoque` e `/admin/clientes` são o próximo gap real de operação.

### Pré-requisitos
- Commit da F7 no Git
- Decisão sobre P1 `orders_update_staff`
- Smoke de permissões operador/gerente

### O que entra
- UI estoque (leitura + movimentos auditáveis; reutilizar `inventory` / `inventory_movements`)
- UI clientes (consulta)
- Relatórios operacionais mínimos (contadores já existem)
- Import catálogo se ainda necessário (ROADMAP F8)

### O que não entra
- Correios/Frenet/gateway reais (F9)
- WhatsApp/e-mail/push
- Aceite eletrônico de ressalva
- CRM / comissão

### Riscos
- Ampliar escrita de inventário sem RPC aumenta risco se policy `ALL` permanecer
- Escopo F8 pode inflar se misturar F9

### Dependências
- Supabase remoto já com F7F
- Roles staff claras

### Critério para iniciar
Working tree F7 commitada; P1 de UPDATE em `orders` decidido (corrigido ou aceito formalmente com issue); smoke de ciclo pedido OK.

---

## Checklist Definition of Done da auditoria

- [x] Estrutura inspecionada
- [x] Build executado (OK)
- [x] Lint executado (warnings)
- [x] Testes automatizados: inexistentes (registrado)
- [x] Rotas / funcionalidades mapeadas
- [x] Ciclo compra/pedido/estoque/preços/frete/permissões/RLS/RPCs auditados (estático + remoto)
- [x] UX / performance / código / docs
- [x] Regressões verificadas (nenhuma evidente)
- [x] Git auditado (sujo; safe.directory)
- [x] Pendências classificadas
- [x] Próximos passos + F8 recomendada
- [x] Nenhuma nova funcionalidade implementada nesta auditoria
- [x] Nenhum push

---

*Fim do relatório.*
