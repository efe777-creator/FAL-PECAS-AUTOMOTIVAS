# Spec — Header: confirmar / trocar compatibilidade (mini-menu)

**Data:** 2026-11-19 · **Auth:** eFe · **Branch:** `dev`  
**Status:** Aprovado (MARCHA) · atualizado guest/auth 2026-11-19

## Problema

Sem chip estável para confirmar/trocar contexto de compatibilidade na loja; visitante não podia ver selos sem login.

## Decisões (marcha)

| # | Decisão |
|---|--------|
| 1 | Troca de ativo **não navega**; atualiza selos via `GarageContext` |
| 2 | Mini-menu popover (desktop + compact mobile/drawer) |
| 3 | Sem ativo: botão **Confirmar compatibilidade** (não some) — **guest e logado** |
| 4 | Fontes: lista da garagem (**só logado**) **ou** filtrar manualmente |
| 5 | Manual: confirma **sessão** primeiro; salvar na garagem é opcional |
| 6 | Principal ≠ ativo; **Limpar** não restaura o principal no refresh |
| 7 | **Auth:** selos/sessão **sem login**; login **ou** cadastro **somente** ao salvar na Minha Garagem |
| 8 | **M24:** picker/filtros do catálogo **não** escrevem o chip |

## Comportamento

### Com ativo (garagem ou sessão)

- Chip: `Ativo: {rótulo}` (★ se `isPrimary`; `· sessão` se filtro manual).
- Popover: lista garagem (se logado) · Limpar · Filtrar manualmente · Gerenciar / Entrar.

### Sem ativo (guest ou logado)

- Botão **Confirmar compatibilidade** → mesmo popover.

### Filtrar manualmente

- `VehicleSelector` → `setSessionFilter` → selos.
- Toast com ação **Salvar na garagem** (logado) ou **Entrar / criar conta para salvar** (guest → `/login` + pending; cadastro via link da LoginPage).
- Não / dismiss → mantém só sessão (selos iguais).

### Limpar

- Zera veículo e sessão; mode `cleared` persistido.

### Guest

- Chip visível (desktop + topo mobile).
- Confirmar modelo **nunca** redireciona para login.
- Lista da garagem só após auth.

## Dados

- Storage: `vehicle` | `session` | `cleared` (+ chave `guest` anônima).
- `activeFilter` = veículo **ou** sessão.

## Fora de escopo

- Placa no popover (só cascata manual).
- Mudar M24 (picker ≠ chip) — apenas respeitar.
