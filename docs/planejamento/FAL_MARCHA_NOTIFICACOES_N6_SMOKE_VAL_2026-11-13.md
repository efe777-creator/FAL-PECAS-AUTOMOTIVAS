# VAL — CP-NOT N6 SMOKE (humano + SQL)

**Data:** 2026-11-13  
**Auth:** eFe · **MARCHA SMOKE**  
**Pedido smoke:** `dcb929db-2884-4449-81ab-2da4eac31ecc`  
**Runtime:** `wtbpwuiayednvlhvuhbh` · UI `localhost:5173`

---

## Eventos emitidos

| Evento | visibility | Resultado |
|--------|------------|-----------|
| `payment_approved` | customer | Inbox cliente + staff (1 staff antes do fix dual-role) |
| `staff_requested_customer_decision` | customer | Cliente: título **Ação necessária**, href `#decisao`, actionable |
| `order_received` | customer | Pós-fix unique audience: 1 customer + **2 staff** |
| `analysis_started` | customer | Deliveries: customer 1 + staff **2** `sent` |

## Correção descoberta no smoke

Admin que também é `customers.profile_id` do pedido perdia inbox **staff** (unique só evento×perfil).

- `20261113192000_cp_not_inbox_unique_audience.sql` — unique inclui `audience`
- `20261113192100_cp_not_delivery_unique_audience.sql` — idem em deliveries

Revalidado com `analysis_started`: **PASS** (2 staff + 1 customer).

## UI admin (`/admin/avisos`)

| Check | Resultado |
|-------|-----------|
| Sininho + badge não lidas | PASS (`Notificações, 18 não lidas`) |
| Aba Minha caixa — smoke + selo Ação necessária | PASS |
| Aba Histórico — linhas pedido `dcb929db…` | PASS |
| Aba Canais — in_app Ativo · whatsapp Off | PASS |

## Checklist N6 (fechado)

- [x] Pagamento / pedido → inbox cliente + ops + `notification_deliveries` `sent`
- [x] Decisão → selo Ação necessária + href `#decisao`
- [x] Ops `/admin/avisos` abas Histórico / Canais (WA Off)
- [x] Leitura → delivery `read` (amostra staff `analysis_started`)
- [x] Dual-role admin-cliente corrigido e retestado
- [ ] Header loja com sessão **cliente** (aba loja sem login neste smoke; código N1 + admin bell PASS)

## Critérios

| ID | Smoke |
|----|-------|
| NOT-01..06 | PASS |
| NOT-09..10 | PASS (in_app) |
| NOT-UX-02..05 | PASS |
| NOT-UX-01 | Código PASS · sessão cliente na loja pendente visual |
| NOT-07/08 | N/A FUTURO |

**Veredito:** SMOKE **PASS** (com fix dual-role aplicado em prod).
