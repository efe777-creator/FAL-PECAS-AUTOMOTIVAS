# VAL — Smoke CP minucioso (OTP + jornadas cliente/operador)

**Data:** 2026-11-21 · **Branch:** `dev`  
**Ambiente:** `127.0.0.1:5173` · Supabase loja `wtbpwuiayednvlhvuhbh` · Edge `WHATSAPP_OTP_PROVIDER=mock`

## Análise (achados)

| # | Achado | Severidade | Ação |
|---|--------|------------|------|
| 1 | Telefone compartilhado entre perfis (ex.: `…1746`) — match OTP indeterminado | Média | **Corrigido:** `send-auth-otp` ordena por `updated_at desc` + log de ambiguidade |
| 2 | Troca de WhatsApp no perfil **não** zerava `phone_verified_at` | Alta | **Corrigido:** `updateCustomerProfile` limpa flag se phone mudou |
| 3 | `verify_jwt` default nas Edges OTP | Baixa | **Corrigido:** `config.toml` `verify_jwt=false` (auth validada na function para `account_verify`) |
| 4 | Auth Site URL `redirect_to=http://localhost:3000` no `generateLink` recovery | Ops | Documentado — client usa `hashedToken`+`verifyOtp` (não depende do redirect) |
| 5 | Flash `/login` em navegação `/conta/*` antes da sessão reidratar | Conhecido | Monitorar; cold load ok após hidratação |
| 6 | `.env.local` sem `VITE_AUTH_WHATSAPP_RECOVERY` | Baixa | **Corrigido:** flag `=1` (requer restart Vite para copy) |

## Automação

| Suite | Resultado |
|-------|-----------|
| `authOtpHelpers` + `phone` + `authRecovery` + `accountVerification` + `accountUsername` | **19 PASS** |
| `tsc --noEmit` | **PASS** |

## Smoke Edge OTP (mock)

| Caso | Resultado |
|------|-----------|
| `password_reset` send+verify (telefone Teste1 `…0319`) | **PASS** — `ok` + `hashedToken` (senha **não** alterada) |
| `password_reset` send+verify (telefone eFe `…1746`) | **PASS** — anti-enumeração + debugCode mock |
| `account_verify` send+verify (JWT eFe) | **PASS** — challenge consumido; `phone_verified_at` setado |
| Rate limit / cooldown 60s | **PASS** — 429 / resposta uniforme conforme purpose |

## Smoke UI cliente

| Tela / ação | Resultado |
|-------------|-----------|
| `/login` — label E-mail ou usuário + Mostrar senha | **PASS** |
| `/recuperar-senha` — Enviar código → step OTP | **PASS** |
| `/conta/perfil` — seções Dados / E-mail / Senha | **PASS** |
| Perfil: salvar WhatsApp **inválido** (sem 9) | **PASS** — alert “WhatsApp inválido…” |
| Perfil: restaurar WhatsApp válido + Salvar | **PASS** |
| `/conta` / flags verificação | **PASS** (conta já confirmada) |
| Troca real de senha / e-mail | **SKIP** — destrutivo sem E2E_PASSWORD |

## Smoke UI operador

| Tela / ação | Resultado |
|-------------|-----------|
| `/admin/clientes` lista 29 | **PASS** |
| Guia Fernando — bloco **Verificação (somente leitura)** | **PASS** — conta verificada / WhatsApp / graça 48h |
| Após OTP account_verify — telefone verificado no profile | **PASS** (SQL) |

## Deploy / secrets

- Edges `send-auth-otp` / `verify-auth-otp` redeployadas com fix de phone compartilhado
- Secrets: `WHATSAPP_OTP_PROVIDER=mock`, `OTP_PEPPER` setados

## Aceite

| Critério | Status |
|----------|--------|
| Envio + verificação OTP mock | **PASS** |
| Telas cliente (login, recuperar, perfil, validação phone) | **PASS** |
| Tela operador clientes + flags RO | **PASS** |
| Correções phone compartilhado + invalidar verify ao mudar phone | **PASS** |
| Troca senha/e-mail autenticada | **SKIP** documentado |

**Assinatura:** SMOKE CP OTP jornadas · 2026-11-21 · eFe / Cursor · **PASS com skips**
