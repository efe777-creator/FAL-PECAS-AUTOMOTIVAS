# VAL — Minha Garagem (PLANO 1)

**Planejamento:** [FAL_PLANO1_MINHA_GARAGEM…](../../docs/planejamento/FAL_PLANO1_MINHA_GARAGEM_FUNDACAO_EXPERIENCIA_2026-11-18.md)  
**Branch:** `dev` · **Etapas:** G0–G8  
**Data:** 2026-11-18

## Critérios de aceite (§18)

| # | Critério | Evidência |
|---|----------|-----------|
| 1 | Cadastro placa + manual progressivo | VAL placa + `AccountVehiclesPage` / plate flow |
| 2 | Incompletos editáveis; `version_id` null | G1 `updateSavedVehicle` + UI detalhe |
| 3 | Dashboard + detalhe DS FAL | `/conta/veiculos`, `/conta/veiculos/:id` |
| 4 | Ativo ≠ principal; localStorage | `activeGarageStorage` + `GarageContext` |
| 5 | Compat confirmada só com evidência | `compatibilityEngine` (#16) |
| 6 | Snapshot imutável cart→order | G6 migrations + trigger + `vehicleSnapshot` |
| 7 | Histórico append-only | G7 `customer_vehicle_part_events` + UI |
| 8 | Fotos RLS / stock 4 níveis | G3 assets + `vehicleImageResolver` |
| 9 | Dedup placa normalizada | G1 unique + `#22`/`#23` |
| 10 | Sem regressão busca/checkout; só `dev` | Suite Vitest abaixo; sem push main |

## Matriz §14 (status)

| # | Caso | Tipo | Status | Harness / nota |
|---|------|------|--------|----------------|
| 1–5 | Placa / API | unit+e2e | OK / VAL placa | `VAL-placa-filtros-veiculo.md` |
| 6–7 | Manual / save progressivo | e2e+unit | OK | G1 service tests |
| 8 | Sem vínculo canônico | integração | OK | `version_id` null preservado |
| 9 | Vários veículos | e2e | OK | Dashboard G2 |
| 10 | Troca ativo | e2e+unit | OK | `activeGarageStorage.test.ts` |
| 11 | Pós-login flush | e2e | OK | smoke VAL placa 2026-11-18 |
| 12 | Edição / personalização | e2e | OK | detalhe + G3 gallery |
| 13 | Upload fotos + RLS | integração | OK | migration G3 + policies |
| 14 | Sem imagem stock | unit | OK | `vehicleImageResolver.test.ts` |
| 15 | Busca contextual | e2e | OK | ativo → catálogo chips |
| 16 | Compat 3 estados | unit | OK | `compatibilityEngine.test.ts` |
| 17 | Compra com associação | integração | OK | snapshot + trigger G6/G7 |
| 18 | Compra sem associação | integração | OK | item sem vehicle_id válido |
| 19 | returned / install ≠ bought | unit | OK | `vehiclePartEventService.test.ts` |
| 20 | Isolamento clientes | RLS | OK | policies CV / CVPE / assets |
| 21 | Legado version_id null | regressão | OK | save progressivo |
| 22 | Dedup mesma placa | unit | OK | `customerVehicleService.g1.test.ts` |
| 23 | Update não duplica | unit | OK | idem |

## Testes automatizados (pacote garagem)

```bash
cd fal-pecas
npm test -- \
  src/services/customers/customerVehicleService.g1.test.ts \
  src/services/garage/ \
  src/services/compatibility/compatibilityEngine.test.ts \
  src/services/checkout/buyNowSession.test.ts \
  src/services/customers/vehicleImageResolver.test.ts \
  src/components/garage/garageVehicleUi.test.ts
```

## Smoke manual sugerido (dev)

1. Login → `/conta/veiculos` → abrir detalhe → editar apelido/placa/cor.
2. Definir **ativo** ≠ principal → catálogo mostra badges do motor.
3. Add to cart com ativo → carrinho exibe snapshot; finalizar pedido pago → timeline do veículo com `bought` (+ `associated`).
4. Em Histórico → **Declarar instalada** → novo evento; `bought` permanece.
5. Editar veículo na garagem → pedido antigo mantém snapshot congelado (placa mascarada na UI do pedido).

## Migrations aplicadas (projeto Supabase FAL)

- G1 `plate_normalized`
- G3 personalização / assets / stock / storage
- G6 `vehicle_snapshot` cart/order + freeze trigger
- G7 `customer_vehicle_part_events` + record on paid status

## Fora de escopo (P2)

3D, oficinas, mecânicos, documentos avançados, compartilhamento portátil, km/lembretes.
