# VAL — MARCHA Pacote MVP-1 · Prep deploy fim do dia (HANDOFF)

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` (sem publicar — só preparação)  
**Status código Pacote MVP-1:** **ENCERRADO**  
**Deploy:** **NÃO executado** nesta fatia — aguarda autorização explícita no fim do dia

---

## Veredito

Não há mais fatia de código obrigatória no Pacote MVP-1.  
Esta MARCHA entrega o **pacote de publicação**: o que mudou, o que redeployar, o que testar.

---

## 1. Inventário — o que sobe no deploy

### Front (Netlify / build Vite `fal-pecas/`)

Mudanças locais (não commitadas ainda) cobrindo as 8 fatias:

| Fatia | Escopo |
|-------|--------|
| Home/destaques | Ordem Campanhas→veículo→Destaques; híbrido; teto 24 |
| Apps/busca | Troca veículo; SearchBar erro; empty-state |
| Estoque | Lista separação A4; saldo no pedido |
| Pagamentos | Troca Pix↔cartão; Brick parcelas; erros PT |
| Legal/atendimento | Cookies; `/trocas-devolucoes`; aceite checkout |
| 030 | CPF opcional; CTAs carrinho |
| 033/034 | Margem no pedido; KPIs dashboard |
| 014 hardening | Ephemeral bloqueado; erros ME PT; `.env.example` |

**Novos arquivos relevantes:** `CookieConsentBanner`, `cookieNotice`, `legalVersions`, `adminOrderPrint`, `orderMarginSummary`, docs MVP em `docs/planejamento/`.

**Não publicar:** `.cursor/`, `supabase/.temp/`, secrets.

### Edges Supabase (obrigatório redeploy)

| Function | Motivo |
|----------|--------|
| `create-mp-payment` | Cancel pending na troca de método + erros PT |
| `quote-shipping` | `selectable: false` em `meq:ephemeral` |

Opcional se ainda não estiver no ambiente de teste: `melhorenvio-label`, `mercado-pago-webhook`.

### Migrations

Nenhuma migration nova nesta sessão MVP-1. Ambiente já precisa ter `place_order` meq/ownq + `shipping_quotes` + custos.

---

## 2. Variáveis / secrets (gate humano)

### Build loja

```
VITE_SHIPPING_PROVIDER=melhorenvio   # homolog
VITE_PAYMENT_PROVIDER=mercadopago
VITE_MP_PUBLIC_KEY=…
VITE_WHATSAPP_PHONE=…
VITE_SUPABASE_URL=…
VITE_SUPABASE_ANON_KEY=…
```

### Edge secrets (nunca VITE_)

- ME: token/sandbox conforme setup atual
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_ENV=test|production`

---

## 3. Ordem sugerida de publicação (quando eFe autorizar)

1. Commit/PR do acumulado MVP-1 (se for o fluxo do repo)
2. `npx supabase functions deploy create-mp-payment --linked`
3. `npx supabase functions deploy quote-shipping --linked`
4. Build + deploy Netlify (espelho eFe e/ou loja fernando — conforme política)
5. Smoke checklist §4
6. Só então considerar produção fernando

---

## 4. Smoke mínimo pós-deploy

| # | Cenário | OK? |
|---|---------|-----|
| 1 | Home: Campanhas → veículo → Destaques | ☐ |
| 2 | Carrinho guest → Criar conta (sem CPF) → checkout com doc | ☐ |
| 3 | Banner cookies + `/trocas-devolucoes` | ☐ |
| 4 | Cotar frete ME/próprio → `place_order` | ☐ |
| 5 | Pix → troca para cartão (pending cancelado) | ☐ |
| 6 | Admin: lista separação + margem no pedido + KPIs dashboard | ☐ |
| 7 | Admin: Expedição etiqueta ME (se credenciais) | ☐ |

---

## 5. O que NÃO é deploy

- Texto jurídico formal (advogado)
- Massa de apps/sinônimos/estoque
- Guest checkout total (evolução)
- Snapshot de custo histórico (evolução)
- Limpeza AJUSTE-001 (só em G8)

---

## STOP

**Pacote MVP-1 código:** fechado.  
**Deploy:** aguarda comando explícito de eFe (fim do dia).  
Próximo MARCHA útil: `MARCHA DEPLOY` / commit+publish **quando autorizado** — ou novo escopo fora do pacote.

**Assinatura:** VAL MVP-1 deploy-prep HANDOFF · 2026-11-09 · **não publicado**.
