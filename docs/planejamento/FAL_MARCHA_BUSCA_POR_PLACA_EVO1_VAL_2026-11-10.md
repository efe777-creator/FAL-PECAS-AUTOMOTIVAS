# VAL — MARCHA Busca por placa · Evolução 1 (PoC mock)

**Data:** 2026-11-10  
**Auth:** eFe — `MARCHA`  
**AJUSTE:** **028**  
**Spec:** [FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md](./FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md)  
**Checklist VAL:** [FAL_VAL_BUSCA_POR_PLACA_EVO1_2026-11-10.md](./FAL_VAL_BUSCA_POR_PLACA_EVO1_2026-11-10.md)  
**HEAD local:** tip `main` + working tree (código 028 ainda **sem** PR/publish)  
**Deploy:** **não** publicar nesta fatia — migration + Edge + front juntos quando autorizar

---

## Veredito (30s)

| Camada | Estado |
|--------|--------|
| **Evolução 1 — código PoC mock** | **ENTREGUE** (working tree) |
| **Decisões** | Garagem = perguntar · falha = manual imediato · filtros só pós-confirmação |
| **Provedor real** | Scaffold **apiplacas** desligado (`PLATE_PROVIDER=mock`) |
| **Produção / publish** | **NÃO** — falta apply SQL + deploy Edge + PR |
| **Evoluções 2–5** | Fora desta MARCHA (avaliação API → adapter → homologação → lançamento) |

**Leitura:** fluxo ponta a ponta mock existe no código; loja pública ainda não consome a Edge.

---

## Entregas

| Item | Resultado |
|------|-----------|
| Spec 028 + inventário 2 clusters (VW Gol / GM Onix) | PASS |
| Normalização/validação placa antiga + Mercosul | PASS — testes |
| Fixtures mock (found / incomplete / ambiguous / not_found / unavailable / not_in_catalog) | PASS |
| Edge `plate-lookup` + contrato provider-agnostic | PASS — código no repo |
| Migration `cached_plates` + RLS sem acesso anon | PASS — arquivo migration |
| `vehicleResolver` maker+model (anti-colisão) | PASS |
| Scaffold `apiPlacasPlateProvider` + flag | PASS — desligado |
| UI `VehiclePlateSearch` + `VehiclePlateConfirmation` | PASS |
| Home slot placa (campanha → placa → destaques) | PASS |
| Catálogo + `/veiculo` com entrada de placa | PASS |
| Confirmação antes de `VehicleFilter` / busca | PASS |
| Falha → `VehicleSelector` imediato + retry opcional | PASS |
| Pergunta garagem + pending login (`sessionStorage`) | PASS |
| Chaves `maker\|model` em opções de veículo | PASS |
| Campo Versão no seletor | PASS |
| Vitest plates | PASS — 13/13 |
| `tsc -b` | PASS |

---

## Arquivos principais

**Docs**
- `docs/planejamento/FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md`
- `docs/planejamento/FAL_VAL_BUSCA_POR_PLACA_EVO1_2026-11-10.md`

**Client**
- `fal-pecas/src/services/plates/*`
- `fal-pecas/src/components/vehicle/VehiclePlateSearch.tsx`
- `fal-pecas/src/components/vehicle/VehiclePlateConfirmation.tsx`
- `fal-pecas/src/components/vehicle/VehicleSelector.tsx`
- `fal-pecas/src/pages/Home/HomePage.tsx`
- `fal-pecas/src/pages/Catalog/CatalogPage.tsx`
- `fal-pecas/src/pages/Vehicle/VehiclePage.tsx`
- `fal-pecas/src/services/vehicles/vehicleService.ts`
- `fal-pecas/src/services/vehicles/vehicleOptionKeys.ts`

**Server**
- `fal-pecas/supabase/functions/plate-lookup/`
- `fal-pecas/supabase/functions/_shared/plateProvider.ts`
- `fal-pecas/supabase/functions/_shared/mockPlateProvider.ts`
- `fal-pecas/supabase/functions/_shared/apiPlacasPlateProvider.ts`
- `fal-pecas/supabase/functions/_shared/vehicleResolver.ts`
- `fal-pecas/supabase/migrations/20261110120000_plate_lookup_cache.sql`

---

## Teste executado

```text
vitest run src/services/plates → 13 passed
tsc -b → ok
```

### Placas mock (smoke UI manual)

| Placa | Esperado |
|-------|----------|
| `ABC1D23` | Cluster A · VW Gol · found |
| `ABC1234` | Cluster B · Onix · found (antiga) |
| `NOT0F00` / `DWN0T00` | Manual imediato |
| `INC0M00` | Incomplete · sem inventar motor |
| `AMB1G00` | Ambíguo + candidatos |
| `OUT0F00` | Fora do cadastro FAL |

---

## Limitações / bola humana

| # | Item | Quem |
|---|------|------|
| 1 | Commit/PR do working tree 028 | eFe |
| 2 | Apply SQL `20261110120000_plate_lookup_cache` no projeto Supabase | eFe |
| 3 | Deploy Edge `plate-lookup` com `PLATE_PROVIDER=mock` | eFe |
| 4 | Smoke UI no espelho eFe (checklist VAL) | eFe |
| 5 | Publish Netlify | Só quando autorizar (acumulado do dia) |
| 6 | Evolução 2 — avaliar [apiplacas.com.br](https://apiplacas.com.br/) / ToS / saldo | eFe · **sem** gastar crédito sem OK |
| 7 | Evolução 3 — ligar adapter real | Só com autorização |

Premissa mantida: mock **nunca** se apresenta como consulta real em produção; banner de teste na confirmação.

---

## STOP / assinatura

**MARCHA 028 Evolução 1 (código PoC): ENTREGUE em 2026-11-10.**  
Próximo código 028 só sob pedido (Evo 2/3) ou correção pós-smoke.  
Bola imediata: PR + SQL + Edge mock + smoke eFe.

**Assinatura:** VAL 028 Evo1 PoC mock PASS (código) · MARCHA 2026-11-10 · deploy pendente.
