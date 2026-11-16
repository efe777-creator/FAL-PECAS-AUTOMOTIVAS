# MARCHA G6 — Jurídico / pós-venda / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §9  
**Classe:** MVP-bloqueador  
**Runtime:** `wtbpwuiayednvlhvuhbh` · draft tip `14defd4` + preview contato `6afb5217…`  
**Preview G6.5:** https://6afb521712f1293fb9a055f1--fal-pecas-automotivas-efe.netlify.app/  
**Preview WA comercial:** https://6afb53c8f501a6d7dd6478e4--fal-pecas-automotivas-efe.netlify.app/

---

## Resultado geral: **PASS**

| Passo | Status | Evidência |
|-------|--------|-----------|
| 6.1 Termos/privacidade/trocas | **PASS** | `/termos` `/privacidade` `/trocas-devolucoes` · versão `2026-11-09` · footer + checkout |
| 6.2 Cancel unpaid + request cancel + confirm receipt + report issue | **PASS** | RPCs remotos + UI conta; cancel unpaid path G3 |
| 6.3 RLS pedido alheio | **PASS** | `orders_select_own`: `customer_id = current_customer_id() OR is_staff()` |
| 6.4 Backup antes limpeza 001 | **PASS*** | Sem limpeza 001 nesta marcha; STOP preservado |
| 6.5 Canal atendimento humano | **PASS** | Preview: rodapé **Tel. (11) 99293-5688** + **WhatsApp** → `wa.me/5511992935688` (eFe) |

**Gate G6:** **PASS** (contato via preview; `--prod` ainda dívida).

---

## 6.5 Detalhe

Fonte comercial (eFe): `+55 11 99293-5688`.

| Env Netlify (`fal-pecas-automotivas-efe`) | Valor |
|------------------------------------------|-------|
| `VITE_WHATSAPP_PHONE` | `5511992935688` |
| `VITE_STORE_PHONE` | `11992935688` |
| `VITE_STORE_CITY_STATE` | `Guarulhos — SP` |
| `VITE_STORE_LEGAL_NAME` | `FAL Peças Automotivas` |

Draft deploy `6afb53c8f501a6d7dd6478e4` (sem `--prod`).

---

## Próximo

**MARCHA G7** (E2E 14 cenários).  
Dívida: `--prod` Netlify · Pix>201 · ME purchase live · e-mail loja opcional.
