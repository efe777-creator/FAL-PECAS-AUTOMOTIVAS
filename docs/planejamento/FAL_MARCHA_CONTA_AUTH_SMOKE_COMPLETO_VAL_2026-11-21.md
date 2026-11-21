# VAL — Smoke completo (CP) Conta / Auth / Perfil / 48h

**Data:** 2026-11-21 · **Branch:** `dev`  
**Ambiente:** localhost `127.0.0.1:5173` · Supabase loja `wtbpwuiayednvlhvuhbh`

## Achado crítico (corrigido no smoke)

Migrations da marcha 48h tinham sido aplicadas antes no projeto MCP antigo (`owllmfcpbodqmoerdfxx`), **não** no projeto do `.env.local`.  
**Ação:** aplicadas no projeto da loja (`wtbpwuiayednvlhvuhbh`) durante este smoke. Sync `account_verified_at` deixou de spammar console quando schema faltava.

## Testes automatizados

| Suite | Resultado |
|-------|-----------|
| `pnpm exec tsc --noEmit` | **PASS** |
| `accountVerification` + `accountUsername` | **10 tests PASS** |
| `pnpm test:ui-layout-antiregress` | **36 tests PASS** |

## Smoke SQL / RPC (remoto loja)

| Check | Esperado | Status |
|-------|----------|--------|
| Colunas `account_verified_at` / `phone_verified_at` / `verification_grace_ends_at` | existem + backfill | **PASS** — 29/29 com graça; 29 verificados (e-mail Auth) |
| `resolve_login_identifier('eFe')` / `'efe'` | e-mail da conta | **PASS** |
| `resolve_login_identifier` inexistente | `null` | **PASS** |
| `resolve_login_identifier('a@b.com')` | e-mail normalizado | **PASS** |

## Smoke browser (UI)

| Passo | Esperado | Status |
|-------|----------|--------|
| `/login` | Label **E-mail ou usuário** + hint + **Mostrar senha** | **PASS** |
| `/conta` (sessão staff) | **✓ Conta confirmada** (sem banner obrigatório morto) | **PASS** |
| `/conta/perfil` | Seções Dados / Usuário `eFe` / E-mail / Senha / Encerrar | **PASS** |
| Toggle Mostrar→Ocultar senha no perfil | `aria-pressed` + label Ocultar | **PASS** |
| Admin `/admin/clientes` → guia Fernando | Bloco **VERIFICAÇÃO (SOMENTE LEITURA)** com datas graça/verificado | **PASS** |
| `/recuperar-senha` | Copy: recuperação **só por e-mail** (não username) | **PASS** |
| Login por username (UI submit) | Entrar com `eFe` + senha | **SKIP** — sem `E2E_USER_PASSWORD` no ambiente |
| Troca real de e-mail / senha | Submit com senha atual | **SKIP** — smoke destrutivo; UI presente |
| Conta pós-graça sem verify → gate checkout | Redirect `/conta/verificar` | **SKIP** — sem conta de teste não verificada |
| `/cadastro` logado | Redirect `/conta` | **PASS** (comportamento esperado) |

## Análise

- **Produto loja alinhado:** schema + RPC no mesmo projeto do Vite.
- **Perfil/admin coerentes** com a marcha (username, senha, e-mail, flags RO).
- **Login username:** backend resolvido (RPC); falta smoke de submit autenticado com credencial E2E.
- **Flake observado:** em HMR/reload, `/conta/*` às vezes flasha `/login` antes da sessão reidratar — não bloqueia aceite; monitorar se persistir em cold load.

## Aceite CP

| Critério | Status |
|----------|--------|
| Automação verde (tsc + unit auth + antiregress layout) | **PASS** |
| RPC + schema no projeto da loja | **PASS** |
| UI login/perfil/recuperar/admin flags | **PASS** |
| Fluxos destrutivos (troca senha/e-mail, gate 48h real) | **SKIP** (próximo: conta smoke dedicada) |

**Assinatura:** SMOKE CP conta/auth · 2026-11-21 · eFe / Cursor · **PASS com skips documentados**

---

## Follow-up — WhatsApp vs e-mail (mesmo dia)

- Cadastro/perfil: campo **WhatsApp (celular)** — se preenchido, valida celular BR (11 dígitos + 9).
- Sem WhatsApp: confirmação pela **e-mail** (canal principal na `/conta/verificar`).
- Com WhatsApp válido: seção OTP preparada; e-mail segue disponível.
- Helper: `isValidWhatsAppPhone` + testes em `phone.test.ts`.

## Follow-up — quando a confirmação é obrigatória (mesmo dia)

| Momento | Comportamento |
|---------|----------------|
| Dentro de 48h e sem 1º pagamento | Aviso leve (opcional confirmar) |
| Após 48h | Aviso persistente + **próximo login** → `/conta/verificar` (WhatsApp preferido) |
| Pagamento do **1º pedido** | Checkout bloqueia → `/conta/verificar` (mesmo na graça) |
| Conta | **Não** tranca toda a área `/conta` só por ter passado 48h |

## Follow-up — recuperar senha (mesmo dia)

- `/recuperar-senha`: canal principal **WhatsApp (código)** (UI preparada; envio com `VITE_AUTH_WHATSAPP_RECOVERY=1`).
- **E-mail (link)** só com domínio linkado: `VITE_AUTH_EMAIL_RECOVERY=1` (+ Site URL / Redirect no Auth).
- Sem as flags: e-mail oculto/desligado; WhatsApp mostra “em breve”.
