# FAL — VAL · PDP Verificar compatibilidade (mini-menu)

**Data:** 2026-11-20 · **Branch:** `dev`  
**Mudança:** form embutido “Informar veículo” → botão + modal (placa | manual).

## Regras preservadas (antiregress)

| Regra | Como |
|-------|------|
| Não altera `garage.activeFilter` | `VehiclePlateSearch localOnly` — sem sync/save |
| Form ≠ chip header | Só `localVehicleFilter` |
| Sheet mobile ano/motor/versão | Intacta (`verifySheetOpen`) |
| Equiv cinza sem CTA | Intacta |
| Sem form no acordeão | Intacta |

## UX

1. Sem veículo efetivo → botão **Verificar compatibilidade**.  
2. Modal: placa (padrão) + link **Selecionar manualmente**.  
3. Confirma → `setLocalVehicleFilter` e fecha.  
4. Com filtro local → **Trocar** / **Limpar**.

## Gates

| Gate | Resultado |
|------|-----------|
| `test:compat-antiregress` | PASS |
| `tsc --noEmit` | PASS |
| Antiregress: sem `title="Informar veículo"` | PASS |
| Antiregress: `verifyCompatOpen` + `localOnly` | PASS |
