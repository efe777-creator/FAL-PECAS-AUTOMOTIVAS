# VAL — PLANO 2A · Vehicle Identity

**Planejamento:** [FAL_PLANO2A_VEHICLE_IDENTITY_2026.md](../../docs/planejamento/FAL_PLANO2A_VEHICLE_IDENTITY_2026.md)  
**Branch:** `dev` · **Etapas:** E1–E5 concluídas · **Data:** 2026-11-18  
**Produção:** `main` não alterada neste ciclo

## Critérios de aceite (roadmap §17)

| Etapa | Aceite-chave | Evidência |
|-------|--------------|-----------|
| E1 | Identity permanente; create atômico; ownership UNKNOWN | `20261118180000_plano2a_e1_*` · `create_customer_vehicle_with_identity` · `FAL-` display |
| E2 | Timeline C; compra≠instalação; G7 append-only | `vehicle_events` · mapa `customer_vehicle_part_event_identities` · `?modulo=historico` |
| E3 | Professionals sem acesso auto; manutenções tipadas | `professional_profiles` · `append_vehicle_maintenance` · módulos UI |
| E4 | Evidence N:N; shares revoke; wizard transferência | `vehicle_evidence` · `vehicle_shares` · `accept_vehicle_transfer` |
| E5 | Estimativa≠diagnóstico; UX T10; G6 intacto | `vehicle_maintenance_schedules` · insights · `OrderPostPurchaseGarageActions` |

## Tabelas / RPCs remotas (wtbp · 2026-11-18)

Confirmadas via MCP: identities, ownership_periods, events, odometer, G7 map, professionals, maintenances, evidence, shares, transfer_requests, schedules + RPCs de create/append/share/transfer/schedule.

## Testes automatizados

```bash
cd fal-pecas
npm test -- --run src/services/garage/ src/services/customers/customerVehicleService.e1.test.ts
```

Resultado 2026-11-18: **10 files / 18 tests PASS**.

## Smoke manual sugerido (dev)

1. `/conta/veiculos/:id` — ID FAL, abas `visao|historico|manutencoes|profissionais|evidencias|compartilhar|inteligencia|config`.
2. Histórico: registrar evento + km; modos vida/meu.
3. Manutenção tipada + profissional nível 1 (declarado).
4. Upload evidência; criar share; iniciar transferência (sem aceitar em prod).
5. Pedido pago: bloco “Garagem · pós-compra” — associar / declarar instalada.
6. Inteligência: criar lembrete; conferir etiqueta “não é diagnóstico”.

## Fora deste VAL

- Deploy `main` / Netlify produção  
- Immersive Garage / PLANO 2B (só contratos §19 do doc 2A)  
- Unmerge completo, exportação LGPD operacional, tipo G7 `received`
