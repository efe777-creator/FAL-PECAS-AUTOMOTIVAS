# Handoff — Prep MP + ME para conta nova (PG03)

**Data:** 2026-11-09  
**Status:** preparação **local** concluída nesta MARCHA · **produção não ativada**  
**Relacionados:** [PG01 auditoria](./FAL_AUDITORIA_PAGAMENTOS_PG01_2026-11-09.md) · [PG02 vars](./FAL_INVENTARIO_VARS_SECRETS_MP_ME_PG02_2026-11-09.md) · [D-FRETE](./FAL_D_FRETE_DECISAO_2026-10-10.md)

---

## Objetivo

Subir o MVP FAL em **outra conta** (crédito Netlify) com Mercado Pago e Melhor Envio **operacionais**, sem reconstruir checkout/pedidos.  
Conexões e secrets: **você** no momento certo. Código já env-driven.

---

## Ordem sugerida (humano + agente quando autorizado)

| # | Passo | Quem |
|---|--------|------|
| 1 | Conta Netlify nova + site + repo/build `fal-pecas/` | eFe |
| 2 | Projeto Supabase (mesmo wtbp ou novo) + link CLI | eFe |
| 3 | App MP produção + webhook URL Edge | eFe |
| 4 | App/token ME produção + `MELHOR_ENVIO_API_BASE` | eFe |
| 5 | Colar vars Netlify (matriz PG02) | eFe |
| 6 | `supabase secrets set` (matriz PG02) | eFe / agente **autorizado** |
| 7 | Deploy Edges (`create-mp-payment`, `mercado-pago-webhook`, `quote-shipping`, `melhorenvio-label`) | agente autorizado |
| 8 | Deploy front Netlify | CI / eFe |
| 9 | Smoke G3 (Pix/cartão + webhook) · G4 (frete + etiqueta) | eFe + agente |
| 10 | Gates MVP restantes (atendimento, margem) | eFe |

---

## Webhook MP (copiar no painel)

```
https://<PROJECT_REF>.supabase.co/functions/v1/mercado-pago-webhook
```

Usar secret = valor de `MP_WEBHOOK_SECRET`. Ambiente do painel = mesmo do token.

---

## Código local desta MARCHA (PG04)

- Edge ME: `mode` + disclaimer conforme `meApiBase()` (prod vs sandbox).
- Front: `VITE_SHIPPING_ME_ENV=production` → registry/disclaimer live; default sandbox.
- `.env.example` com matriz TEST/PROD.
- **Não** foi feito: `secrets set`, deploy Netlify, ativação produção.

---

## Diretriz produto (lembrete)

FAL controla a integração; MP é o **primeiro** provedor. Menu Admin → Pagamentos (incl. **Métodos → Mercado Pago**) = próxima onda — ver [plano mestre](./FAL_PLANO_MESTRE_PAGAMENTOS_INTEGRACOES_2026-11-09.md).

**Assinatura:** Handoff conta nova PG03 · 2026-11-09.
