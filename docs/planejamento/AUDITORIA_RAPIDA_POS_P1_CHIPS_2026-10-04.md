# Auditoria rápida pós-correção — P1 RLS + chips admin

**Data:** 2026-10-04  
**Escopo:** correções necessárias pós-F7 (sem F8)

## Resultado

| Item | Status |
|------|--------|
| Labels admin dos chips | **Corrigido** |
| Contadores Dashboard × Pedidos | **Alinhados** (`ADMIN_ORDER_COUNTER_KEYS`) |
| P1 `orders_update_staff` | **Fechado** no remoto |
| Build | **OK** (`npm run build`, exit 0) |
| Regressões evidentes | **Não encontradas** |
| Próximo passo | Planejar F8 (após push desta consolidação) |

## Chips / UX admin

**Antes:** chips usavam `orderStatusLabel` (visão cliente) → três botões “Em confirmação”.

**Depois:** `orderStatusAdminLabel` + `ADMIN_ORDER_COUNTER_KEYS` em:

- `fal-pecas/src/lib/orderLifecycle.ts`
- `AdminOrdersPage.tsx` (chips + coluna Status)
- `AdminDashboardPage.tsx`
- `AdminOrderDetailPage.tsx`

Labels únicos dos chips: Recebido pela FAL | Em análise | Aguardando decisão | Aguardando disponibilidade | Confirmado | Em separação.

Área do cliente (`Account/*`) permanece com `orderStatusLabel` simplificado.

## P1 segurança

Migration: `fal-pecas/supabase/migrations/20261004160000_fase7_orders_revoke_direct_update.sql`  
Aplicada no projeto `wtbpwuiayednvlhvuhbh` (`fase7_orders_revoke_direct_update`).

Evidência pós-apply:

- Policies em `orders`: apenas `orders_select_own` (SELECT) e `orders_insert_own` (INSERT)
- `has_table_privilege('authenticated','public.orders','UPDATE')` = **false**
- `has_table_privilege('anon','public.orders','UPDATE')` = **false**
- SELECT/INSERT de `authenticated` preservados
- RPCs presentes: `transition_order_status`, `finalize_order_confirmation`, `ship_order`, `deliver_order`, `admin_order_status_counts`
- Frontend: zero `.from('orders').update`

## Smoke executado

1. Build produção OK.
2. Verificação SQL de privilégios/policies/RPCs (acima).
3. Verificação estática de labels únicos nos chips.
4. Confirmação de que mutações admin seguem só por RPC (código).

**Não validado nesta sessão (requer sessão staff no browser):** clique visual em cada chip/filtro e ciclo completo cancelar→confirmar→separar→expedir→entregar na UI. Recomendado smoke manual rápido após pull/deploy local.

## Regressões

Não foram encontradas regressões evidentes durante a auditoria rápida realizada.

## Git

- Branch: `plan`
- Commit: `5ab714b` — Consolida a Fase 7 operacional, fecha o P1 de UPDATE em orders e corrige labels dos chips admin.
- Push: `origin/plan` (`5bd0043..5ab714b`)
- Working tree: limpa e alinhada ao remote.
