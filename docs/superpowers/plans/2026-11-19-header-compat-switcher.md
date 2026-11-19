# Header Compat Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mini-menu no header para confirmar/trocar veículo ativo (garagem ou filtro manual de sessão) sem sair da página, atualizando selos de compatibilidade.

**Architecture:** Estender `activeGarageStorage` + `GarageContext` com modos `vehicle` | `session` | `cleared`. Evoluir `GarageActiveSwitcher` para popover com lista, limpar, cascata manual e toast “Salvar na garagem?”.

**Tech Stack:** React, React Router, GarageContext, VehicleSelector, Toast, Vitest.

## Global Constraints

- Branch `dev` only; no main/prod.
- Troca não navega; selos via `activeFilter`.
- Limpar não restaura principal.
- Manual: sessão + ask save (C).
- Copy PT-BR FAL existente.

---

### Task 1: Storage modos vehicle/session/cleared

**Files:**
- Modify: `fal-pecas/src/services/garage/activeGarageStorage.ts`
- Modify: `fal-pecas/src/services/garage/activeGarageStorage.test.ts`

- [ ] Estender `ActiveGarageStored` com `mode: 'vehicle' | 'session' | 'cleared'`
- [ ] `resolveActiveAgainstGarage`: se `cleared` ou sem id em modo cleared → `null` (não primary)
- [ ] Helpers read/write session filter
- [ ] Testes: cleared não volta primary; session devolve filter sem vehicle
- [ ] Commit

### Task 2: GarageContext setSessionFilter

**Files:**
- Modify: `fal-pecas/src/contexts/GarageContext.tsx`

- [ ] Estado `sessionFilter` / `activeFilter` = vehicle filter OU session
- [ ] `setSessionFilter(filter)`, `clearActiveVehicle` grava mode cleared
- [ ] `refreshVehicles` respeita cleared/session
- [ ] Commit

### Task 3: GarageActiveSwitcher popover

**Files:**
- Modify: `fal-pecas/src/components/garage/GarageActiveSwitcher.tsx`

- [ ] CTA sem ativo: Confirmar compatibilidade
- [ ] Popover: lista, limpar, manual → VehicleSelector, gerenciar
- [ ] Toast salvar via `ensureSavedVehicleFromFilter`
- [ ] compact + desktop
- [ ] Commit

### Task 4: Verificação

- [ ] `npm test` nos arquivos tocados / `tsc` se necessário
- [ ] Smoke manual: limpar → CTA → garagem → selo; manual → sessão → salvar
