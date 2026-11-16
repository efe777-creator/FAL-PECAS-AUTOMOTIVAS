# MARCHA G6 — Jurídico / pós-venda / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §9  
**Classe:** MVP-bloqueador  
**Runtime:** `wtbpwuiayednvlhvuhbh` · draft tip `14defd4` + preview contato `6afb5217…`  
**Preview G6.5:** https://6afb521712f1293fb9a055f1--fal-pecas-automotivas-efe.netlify.app/

---

## Resultado geral: **PASS**

| Passo | Status | Evidência |
|-------|--------|-----------|
| 6.1 Termos/privacidade/trocas | **PASS** | `/termos` `/privacidade` `/trocas-devolucoes` · versão `2026-11-09` · footer + checkout |
| 6.2 Cancel unpaid + request cancel + confirm receipt + report issue | **PASS** | RPCs remotos + UI conta; cancel unpaid path G3 |
| 6.3 RLS pedido alheio | **PASS** | `orders_select_own`: `customer_id = current_customer_id() OR is_staff()` |
| 6.4 Backup antes limpeza 001 | **PASS*** | Sem limpeza 001 nesta marcha; STOP preservado |
| 6.5 Canal atendimento humano | **PASS** | Preview: rodapé **Tel. (11) 99999-8888** + **WhatsApp** → `wa.me/5511999998888` |

**Gate G6:** **PASS** (contato via preview; `--prod` ainda dívida).

---

## 6.5 Detalhe

Fonte: `store_shipping_origin.phone` = `11999998888` (origem ME ativa).

| Env Netlify (`fal-pecas-automotivas-efe`) | Valor |
|------------------------------------------|-------|
| `VITE_WHATSAPP_PHONE` | `5511999998888` |
| `VITE_STORE_PHONE` | `11999998888` |
| `VITE_STORE_CITY_STATE` | `Guarulhos — SP` |
| `VITE_STORE_LEGAL_NAME` | `FAL Peças Automotivas` |

Draft deploy `6afb521712f1293fb9a055f1` (sem `--prod`).

\*Se o número comercial real for outro, eFe atualiza env + redeploy; gate fecha com SoT operacional atual.

---

## Próximo

**MARCHA G7** (E2E 14 cenários).  
Dívida: `--prod` Netlify · Pix>201 · ME purchase live · e-mail loja opcional.
