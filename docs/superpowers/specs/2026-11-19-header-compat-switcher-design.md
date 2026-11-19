# Spec — Header: confirmar / trocar compatibilidade (mini-menu)

**Data:** 2026-11-19 · **Auth:** eFe · **Branch:** `dev`  
**Status:** Aprovado (MARCHA)

## Problema

O chip `GarageActiveSwitcher` só oferece Limpar + link para `/conta/veiculos`. Sem ativo, some. Não dá para trocar rápido entre carros da garagem nem confirmar um modelo manualmente enquanto navega (selos/avisos).

## Decisões (marcha)

| # | Decisão |
|---|--------|
| 1 | Troca de ativo **não navega**; atualiza selos/avisos na página atual via `GarageContext` |
| 2 | Mini-menu popover no header (desktop + compact no drawer) |
| 3 | Sem ativo: botão **Confirmar compatibilidade** (não some) |
| 4 | Fontes: lista da garagem **ou** filtrar manualmente (painel 2 no popover) |
| 5 | Manual: confirma **sessão** primeiro; pergunta **Salvar na Minha Garagem?** (Sim / Não) |
| 6 | Principal ≠ ativo; **Limpar** não restaura o principal no refresh |

## Comportamento

### Com ativo (garagem ou sessão)

- Chip: `Ativo: {rótulo}` (★ se `isPrimary`).
- Clique no chip / Trocar → popover:
  - lista `vehicles` (item ativo marcado) → `setActiveVehicle`
  - Limpar → zera contexto
  - Filtrar manualmente → painel cascata
  - Gerenciar garagem → `/conta/veiculos`

### Sem ativo (logado)

- Botão **Confirmar compatibilidade** → mesmo popover (sem item “ativo”).

### Filtrar manualmente

- Painel 2: `VehicleSelector` compacto (`onConfirm`, `hideQuickPick`).
- Confirmar → `setSessionFilter(filter)` → fecha → `activeFilter` alimenta selos (`ProductCard` etc.).
- Toast: “Compatibilidade confirmada nesta sessão.” com ação **Salvar na garagem**.
  - Sim → `ensureSavedVehicleFromFilter` + `setActiveVehicle(saved)`.
  - Não / dismiss → mantém só sessão.

### Limpar

- Remove ativo de veículo e filtro de sessão.
- Persistência explícita de “limpo” para `refreshVehicles` **não** cair no principal.

### Guest

- Sem chip / sem CTA (como hoje: só logado no Header).

## Dados / contexto

- Estender storage ativo para modos: `vehicle` | `session` | `cleared`.
- `activeFilter`: derivado do veículo **ou** do filtro de sessão.
- `activeVehicle`: null no modo sessão/cleared.
- Rótulo sessão: montadora + modelo (+ ano se houver).

## Escopo técnico

- `GarageActiveSwitcher` (+ popover UI).
- `GarageContext` + `activeGarageStorage` (modo cleared/session).
- Reusar `VehicleSelector`, `ensureSavedVehicleFromFilter`, toast com `action.onClick`.
- Testes unitários do storage/resolve.

## Fora de escopo

- Motor PVC / G5.
- Mudar M24 (picker catálogo ≠ chip ativo).
- Guest com contexto de compatibilidade.
- Placa no popover (só cascata manual).
