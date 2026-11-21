# Marcha — Conta / perfil / login usuário / graça 48h

**Data:** 2026-11-21  
**Branch:** `dev`  
**Escopo:** PasswordInput; perfil (username, alterar senha, trocar e-mail); login por usuário via RPC; schema + gate de verificação 48h; flags RO no admin Clientes.

## Entregue

| Item | Onde |
|------|------|
| Mostrar/ocultar senha | `PasswordInput.tsx` · Login / Cadastro / Redefinir |
| Perfil: dados + usuário | `AccountProfilePage.tsx` · `customerService.updateCustomerProfile` |
| Alterar senha (com senha atual) | `authService.changePassword` · AuthContext |
| Trocar e-mail (confirmação Supabase) | `authService.updateEmail` · redirect `/conta/perfil` |
| Login e-mail **ou** usuário | RPC `resolve_login_identifier` · `signInWithIdentifier` |
| Schema 48h | migration `20261121091000_account_verification_grace_48h.sql` |
| Gate pós-graça | `VerificationGate` · `/conta/verificar` · bloqueia checkout |
| Admin RO | `CustomerWorkSurface` flags verificação |

## Migrations

1. `20261121090000_resolve_login_identifier.sql` (+ fix `20261121092000`)
2. `20261121091000_account_verification_grace_48h.sql`

**Remoto loja (`.env.local`):** aplicadas em `wtbpwuiayednvlhvuhbh` no smoke CP 2026-11-21.  
(Nota: um apply anterior no projeto MCP antigo `owllmfcpbodqmoerdfxx` não alimenta o Vite local.)

**Smoke completo:** [FAL_MARCHA_CONTA_AUTH_SMOKE_COMPLETO_VAL_2026-11-21.md](./FAL_MARCHA_CONTA_AUTH_SMOKE_COMPLETO_VAL_2026-11-21.md)

## Checklist domínio (produção)

- [ ] Supabase Auth → Site URL = domínio da loja
- [ ] Redirect URLs: `/login`, `/redefinir-senha`, `/conta/perfil`, `/conta/verificar`
- [ ] Confirmar templates de e-mail (signup + change email)
- [ ] Smoke: cadastro → e-mail → login com username
- [ ] Smoke: trocar e-mail / alterar senha no perfil

## Backlog WhatsApp OTP (Fase 3)

- Provider (Twilio / Z-API / etc.) + secrets
- Edge `send-verify-otp` / `confirm-verify-otp`
- Ligar botões em `AccountVerifyPage` (hoje stub)
- Preencher `profiles.phone_verified_at` → `account_verified_at`

## Aceite rápido

1. Login com e-mail e com username (após migration).
2. Campos de senha com “Mostrar/Ocultar”.
3. Perfil: salvar username; alterar senha; solicitar troca de e-mail.
4. Conta sem confirm após 48h → `/conta/verificar` e checkout bloqueado.
5. Admin Clientes → guia: flags de verificação visíveis (RO).

## Fora desta marcha

- Regra 48h de pedidos Pix  
- OAuth Google  
- Redesign Adaptive completo de `/conta`

---

## Follow-up — dedupe cadastro/perfil (2026-11-21)

Corrigido após auditoria de duplicidades:

| Item | Ação |
|------|------|
| CPF perdido se Auth exige confirm | `handle_new_user` grava CPF do metadata + sync client no enrich |
| Username: regras só no perfil | Helper `accountUsername.ts` no cadastro e perfil |
| Banner “obrigatório” morto na home | Removido (VerificationGate já redireciona) |
| Hints/copy senha divergentes | `passwordMismatchMessage`; hint só na criação/alteração |
| Login com hint de regra de senha | Removido |
| ForgotPassword vs login usuário | Copy: recuperação só por e-mail |
| Double enrich login/signup | `skipNextAuthEnrichRef` no AuthContext |
| Migration | `20261121093000_handle_new_user_cpf_username.sql` (aplicada no remoto) |
