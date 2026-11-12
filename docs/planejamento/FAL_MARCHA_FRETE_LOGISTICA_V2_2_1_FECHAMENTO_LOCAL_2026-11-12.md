# VAL — Fechamento local Jornada Frete + Logística V2.2.1

**Data:** 2026-11-12  
**Modo:** MARCHA SOBERANA — commits locais; **sem** push / migrate / deploy até ordem eFe  
**Plano:** `FAL_PLANO_JORNADA_FRETE_LOGISTICA_V2_2_2026-11-12.md`  
**Branch:** `main` ahead origin (**15** commits desta onda frete+docs, ver `git log origin/main..HEAD`)

---

## 1. Resultado

| Bloco | Status local |
|-------|----------------|
| Marchas **1 → 8** (código) | ✅ concluídas |
| Nível 1 homologação (G) | ⏳ depende migrate + Edges + smoke |
| Nível 2 ops controlada | ⏳ + ME-03 + VALs |
| Nível 3 MVP | ⏳ |

**STOP permanente até eFe:** push, `supabase db push` / migrate remoto, deploy Edges, purchase ME **live** (ME-03).

---

## 2. Commits da onda (resumo)

| Commit | Marcha |
|--------|--------|
| `bcb7d43` | 1 filas hub |
| `33ae8e8` `4cbf7c9` `e732234` | 1b prazos real+extra |
| `e356a84` | 2 fingerprint + 1c SEC-035 |
| `f01bbca` | 3 packing + alocação |
| `cdd3a85` | 4 purchase gates ME |
| `e972520` | auditoria + 5 label≠postagem |
| `6d279e1` | 6 own saída/tentativa/entrega |
| `870d085` | 7 ocorrências ciclo + reopen |
| `6506736` | 8 G8 cobrado vs custo |
| `48d0bd5` + plano | docs V2.2.1 |

---

## 3. Migrations a aplicar (ordem) — **só com auth eFe**

```
fal-pecas/supabase/migrations/20261112180000_admin_logistics_queues.sql
fal-pecas/supabase/migrations/20261112181000_store_shipping_eta_policy.sql
fal-pecas/supabase/migrations/20261112182000_resolve_mock_eta_policy.sql
fal-pecas/supabase/migrations/20261112183000_place_order_fingerprint_sec035.sql
fal-pecas/supabase/migrations/20261112184000_own_extra_days_eta_policy.sql
fal-pecas/supabase/migrations/20261112190000_order_packing_allocation_m3.sql
fal-pecas/supabase/migrations/20261112191000_ship_order_gates_m5.sql
fal-pecas/supabase/migrations/20261112192000_own_delivery_ops_m6.sql
fal-pecas/supabase/migrations/20261112193000_occurrence_lifecycle_m7.sql
fal-pecas/supabase/migrations/20261112194000_freight_finance_g8_m8.sql
```

**Não misturar** nesta leva (outra trilha): `20261112150000_remap_products_category_leaves.sql` (busca/placas).

---

## 4. Edges a redeployar — **só com auth eFe**

| Edge | Motivo |
|------|--------|
| `quote-shipping` | ME: carrier + extraDays |
| `quote-own-delivery` | own: base + own_extra_days |
| `melhorenvio-label` | gates pay/packing; packing→cart; finance G8; idempotência |

---

## 5. Checklist smoke pós-migrate (Nível 1)

- [ ] **G-Prazos:** Logística ME mostra carrier real; extra altera display; pedido antigo intacto  
- [ ] **G-Packing:** dims sem alocação fica em Preparar volumes; alocação completa libera ME/Own  
- [ ] **G-Pay:** payment pending → purchase 409 `payment_not_approved`  
- [ ] **G-Label≠ship:** printed + `pronto_para_envio` → cliente “Aguardando postagem”  
- [ ] **G-Own:** saída → tentativa → entrega; mock não despacha  
- [ ] **G-Review:** resolve + reopen com motivo volta à fila  
- [ ] **G8:** purchase ME grava `metadata.finance`; own salva custo no painel  

---

## 6. Bloqueios humanos

| Item | Dono |
|------|------|
| Ordem migrate + deploy | eFe |
| ME-03 purchase live | eFe |
| VALs Nível 2/3 | eFe + evidências |
| Push `origin` | eFe (explícito) |

---

## 7. PASS / STOP deste VAL

| | |
|--|--|
| **PASS** | Código Marchas 1–8 commitado localmente; plano V2.2.1 atualizado; lista migrate/Edges/smoke pronta |
| **STOP** | Declarar Nível 2/3, ME live, ou remoto aplicado **sem** ordem eFe |

---

*Gerado na continuidade MARCHA após fechamento da Marcha 8.*
