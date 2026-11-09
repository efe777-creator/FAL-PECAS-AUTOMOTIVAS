# VAL — MARCHA Pacote MVP-1 · Guest / fricção (030)

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` (fatia G3 fricção)  
**AJUSTE:** 030  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Deploy:** só no **fim do dia**

---

## Contexto

Carrinho guest + cotação sem login já existiam. Checkout continua exigindo conta (`ProtectedRoute` + `place_order` com `auth.uid()`). Checkout guest ponta a ponta = migration/RPC — **adiado**.

## Entregas

| Item | Resultado |
|------|-----------|
| CPF opcional no cadastro (documento no checkout) | PASS |
| CTAs carrinho: criar conta + entrar (`from: /checkout`) | PASS |
| Copy login/cadastro quando veio do checkout | PASS |
| Teste regra CPF opcional | PASS — 3 |

## Arquivos

- `fal-pecas/src/pages/Register/RegisterPage.tsx`
- `fal-pecas/src/pages/Cart/CartPage.tsx`
- `fal-pecas/src/pages/Login/LoginPage.tsx`
- `fal-pecas/src/lib/registerCpfOptional.test.ts`

## Gate humano / evolução

- Confirmação de e-mail Supabase pode interromper retorno ao checkout (config Auth)
- Checkout **sem login** + pedido anônimo = Evolução (RPC/RLS)

## STOP / próximo

Próxima fatia MVP-1: **033/034** (margem + dashboard) ou homolog **014**/smoke **017**.

**Assinatura:** VAL MVP-1 030 fricção código PASS · 2026-11-09.
