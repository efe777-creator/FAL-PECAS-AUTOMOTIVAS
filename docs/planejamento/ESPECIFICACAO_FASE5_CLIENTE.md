# Especificação — Fase 5: Experiência do Cliente

**Status:** Implementada — ver [EXECUCAO_FASE5.md](./EXECUCAO_FASE5.md)  
**Data:** 2026-10-03  
**Branch:** `plan`  
**Base:** Auth + schema F2; busca F4; admin F4B

## Objetivo

Conta autenticada: perfil, endereços, veículos salvos, favoritos e consulta de pedidos — sem checkout.

## Decisões

| Tema | Decisão |
|------|---------|
| Auth | E-mail + senha (Supabase Auth) |
| CPF/CNPJ | Opcionais em `customers`; validação se preenchidos |
| Role | Trigger `protect_profile_role` impede self-promote |
| Veículo salvo | `version_id` do mestre + `is_primary` |
| Favoritos | `favorites.user_id` → auth.users |
| Pedidos | Somente consulta (criação = F6) |

## Fora

Checkout, pagamento, frete, criar pedido, ViaCEP, login por username obrigatório.
