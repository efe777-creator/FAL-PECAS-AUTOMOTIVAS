# VAL — WhatsApp OTP (confirmação + recuperar senha)

**Branch:** `dev` only  
**Projeto Supabase (loja):** `wtbpwuiayednvlhvuhbh`  
**Data:** 2026-11-21

## Escopo

- Envio + verificação de código 6 dígitos via WhatsApp (`account_verify` | `password_reset`).
- Fora: e-mail de confirmação/recuperação (flag `VITE_AUTH_EMAIL_RECOVERY`); CP-NOT N3.

## Checklist secrets (Edge)

| Secret | Valor | Notas |
|--------|-------|-------|
| `WHATSAPP_OTP_PROVIDER` | `mock` \| `zapi` | Default seguro para smoke: `mock` |
| `OTP_PEPPER` | string forte | Hash SHA-256; nunca logar plaintext do código em `zapi` |
| `ZAPI_INSTANCE_ID` | … | Só se `zapi` |
| `ZAPI_TOKEN` | … | Só se `zapi` |
| `ZAPI_CLIENT_TOKEN` | … | Se a conta Z-API exigir |

Front (Netlify / `.env` local):

- `VITE_AUTH_WHATSAPP_RECOVERY=1` — copy/UI de recuperação pronta
- Confirmação de conta: UI chama Edge sempre que houver WhatsApp válido (não depende de e-mail)

## Migration

- `20261121100000_auth_otp_challenges.sql`
  - tabela `auth_otp_challenges` (RLS on; sem grant anon/authenticated)
  - RPC `mark_account_verified_from_phone(uuid)` → `service_role`

## Edge

- `send-auth-otp` — JWT p/ `account_verify`; telefone p/ `password_reset` (anti-enumeração)
- `verify-auth-otp` — consome challenge; marca profile ou gera recovery (`hashedToken`)
- `_shared/authOtpCore.ts` + `_shared/whatsappOtpProvider.ts` (mock \| zapi)

Rate limit: 1 envio / 60s por phone+purpose; máx 5 / hora. TTL 10 min. Máx 5 tentativas.

Mock: resposta pode incluir `debugCode` **somente** com `WHATSAPP_OTP_PROVIDER=mock`.

## Front

- `authService.sendAuthOtp` / `verifyAuthOtp`
- `AccountVerifyPage` — Enviar código + input + Confirmar
- `ForgotPasswordPage` — phone → otp → nova senha (invoke real; e-mail atrás da flag)

## Smoke mock (dev)

1. Secrets: `WHATSAPP_OTP_PROVIDER=mock` + `OTP_PEPPER=…`
2. Deploy `send-auth-otp` e `verify-auth-otp` no ref loja
3. Conta com celular WhatsApp válido no perfil
4. `/conta/verificar` → Enviar código → toast com `debugCode` → Confirmar → `phone_verified_at` + `account_verified_at`
5. Logout → `/recuperar-senha` → mesmo telefone → código mock → definir senha → login

## Unit

```bash
npx vitest run src/lib/authOtpHelpers.test.ts src/lib/phone.test.ts src/lib/authRecovery.test.ts
```

## Status

- [x] Migration aplicada no projeto loja
- [x] Edge + shared provider
- [x] UI verify + forgot
- [x] Flags / `.env.example` / este VAL
- [x] Deploy Edge + secrets mock (`WHATSAPP_OTP_PROVIDER=mock`) no ref loja
- [ ] Smoke UI manual (verificar + recuperar) com `debugCode`
- [ ] Troca `zapi` + secrets Z-API quando homologar envio real
