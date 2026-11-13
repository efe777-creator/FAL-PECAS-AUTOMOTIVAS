# VAL — CP-NOT N6 Homologação

**Data:** 2026-11-13  
**Auth:** eFe · MARCHA N6  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Script:** `fal-pecas/scripts/smoke_cp_not_n6.sql`  
**Plano:** [FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md)

---

## 1. Smoke SQL (automático)

| check_id | Esperado | Resultado |
|----------|----------|-----------|
| catalog_kinds | ≥ 20 | **29** PASS |
| catalog_mandatory | ≥ 1 | **15** PASS |
| channel_in_app_on | 1 | **1** PASS |
| channel_whatsapp_off | 1 | **1** PASS |
| deliveries_table | 1 | **1** PASS |
| inbox_severity_col | 1 | **1** PASS |
| fn_fanout | 1 | **1** PASS |
| fn_reprocess | 1 | **1** PASS |
| fn_copy_acao | 1 | **1** PASS |
| staff_gap_payment | 1 | **1** PASS |
| deliveries_sent_sample | ≥ 0 | **0** na 1ª rodada · **SMOKE depois:** vários `sent` (ver VAL SMOKE) |

## 2. Testes unitários

`appNotificationCopy.test.ts` — **5 PASS** (copy, actionable, `#decisao`).

## 3. Matriz NOT-01..10 / UX

| ID | Situação N6 | Evidência / pendência |
|----|-------------|------------------------|
| NOT-01 | **PASS estrutural** | Catálogo + fanout; humano: gerar evento |
| NOT-02 | **PASS parcial** | Cliente + staff catalog; staff = broadcast |
| NOT-03 | **PASS** | Unique inbox + deliveries |
| NOT-04 | **PASS código** | mark-read + UI; humano smoke |
| NOT-05 | **PASS código** | href pedido |
| NOT-06 | **PASS código** | `#decisao` + painel; humano smoke |
| NOT-07 | **N/A FUTURO** | WhatsApp off (N3) |
| NOT-08 | **N/A FUTURO** | E-mail off (N4) |
| NOT-09 | **PASS parcial** | deliveries + reprocess; amostra sent=0 |
| NOT-10 | **PASS parcial** | inbox + deliveries; histórico multicanal só in_app |
| NOT-UX-01 | **PASS código** | Header loja + bell |
| NOT-UX-02 | **PASS código** | AdminLayout bell |
| NOT-UX-03 | **PASS código** | SVG sino + badge |
| NOT-UX-04 | **PASS código** | Dropdown + Ver todos |
| NOT-UX-05 | **PASS código** | Selo + `#decisao` |

**Veredito estrutural:** frente in-app + motor **homologável**.  
**Gate humano aberto:** 1 jornada real (pagamento → ops notificado → decisão cliente → delivery `sent`/`read`).

## 4. Checklist humano (Gate N6)

**Executado:** [FAL_MARCHA_NOTIFICACOES_N6_SMOKE_VAL_2026-11-13.md](./FAL_MARCHA_NOTIFICACOES_N6_SMOKE_VAL_2026-11-13.md) · **PASS** (+ fix dual-role).

- [x] Pagamento/pedido → inbox + deliveries `sent`
- [x] Decisão → Ação necessária + `#decisao`
- [x] Ops `/admin/avisos` Histórico / Canais (WA Off)
- [x] Leitura → delivery `read`
- [ ] Cliente na loja: sininho no header (opcional visual; código N1 ok)

## 5. Escopo fechado nesta homologação

- WhatsApp / e-mail: fora (FUTURO)
- Push: fora
