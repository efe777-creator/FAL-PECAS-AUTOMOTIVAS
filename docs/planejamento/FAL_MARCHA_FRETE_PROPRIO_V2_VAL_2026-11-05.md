# VAL — MARCHA Frete Próprio v2 (sequencial)

**Data:** 2026-11-05  
**Auth:** MARCHA sequencial eFe  
**Plano:** [FAL_PLANEJAMENTO_FRETE_PROPRIO.md](./FAL_PLANEJAMENTO_FRETE_PROPRIO.md)  
**Política:** D-FRETE **B** · default loja mock  
**Fórmula:** `frete = max(km_ida × R$/km, tarifa_mínima)` — **APROVADO** (piso)

---

## Escopo entregue nesta marcha (código)

| Fatia | Estado |
|-------|--------|
| Schema veículos / tarifas / POL produto / cache rota / audit / manual | SQL `20261105120000_…` |
| `place_order` + `ownq:` | SQL `20261105121000_…` |
| Motores TS POL / veículo / preço + testes | PASS (10) |
| Edge `quote-own-delivery` (Routes Google) | Código + README |
| Admin frete-próprio 6 abas | UI |
| Form produto POL/porte/veículo/own_allowed | UI + service |
| Checkout passa número/rua; mode distance via Edge | Wired |
| Flat v1 preservado (`pricing_mode=flat`) | Sim |

## Ops wtbp (MARCHA 2026-11-05 · continuação)

| Item | Resultado |
|------|-----------|
| `db query --remote` schema `20261105120000_…` | **PASS** (após fix ALTER multi-coluna) |
| `db query --remote` place_order `20261105121000_…` | **PASS** |
| Seed veículos | motorcycle 12 · car 48 · active |
| Settings | `enabled=false` · `pricing_mode=flat` |
| Deploy Edge `quote-own-delivery` | **PASS** (`--yes`) |
| Secret `GOOGLE_MAPS_API_KEY` | **AUSENTE** — cotação v2 → `routing_error` até eFe setar |
| POL provisório published | **PASS** — 100/100 com `pol_unit=1` (global · homologação) |

## Ainda depende de eFe

| Item | Nota |
|------|------|
| `npx supabase secrets set GOOGLE_MAPS_API_KEY=… --project-ref wtbp…` | Obrigatório para distância real |
| Tarifas R$ ativas no admin | Seed 0/inativo — **informar valores** |
| Cutover `distance_vehicle` + `enabled` | Opt-in sob B |
| Smoke E2E ownq | Após key + dados |
| Bulk POL preserve | Follow-up |
| Insert `own_manual_reviews` no path manual | Follow-up |

## Aceite técnico

- [x] `vitest` own — 10 PASS  
- [x] `tsc --noEmit` PASS  
- [x] Migration aplicada wtbp  
- [x] Edge deployed  
- [ ] Google key set  
- [ ] Cotação checkout distance_vehicle smoke  
- [ ] Regressão mock/`meq:`  

## STOP

SQL + Edge no wtbp. **Sem** key Google = sem km real. **Não** ligar `enabled`/distance em prod sem tarifas + POL + key.

**Próximo:** eFe seta `GOOGLE_MAPS_API_KEY` → smoke Edge → configurar tarifas/POL → opt-in mode.

**Assinatura agente:** VAL MARCHA frete próprio v2 + ops apply/deploy 2026-11-05.
