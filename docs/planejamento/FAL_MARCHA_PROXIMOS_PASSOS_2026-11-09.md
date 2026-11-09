# MARCHA — Próximos passos

**Data:** 2026-11-09 · ~14h  
**Posição:** Pacote MVP-1 **código ENCERRADO** · mudanças **locais, não publicadas**  
**Handoff:** [FAL_MARCHA_MVP1_DEPLOY_PREP_HANDOFF_2026-11-09.md](./FAL_MARCHA_MVP1_DEPLOY_PREP_HANDOFF_2026-11-09.md)

---

## Feito

| # | Passo | Status |
|---|--------|--------|
| 1 | Deploy código + Edges | DONE (PR #249) |
| 2 | Netlify eFe live | DONE |
| 3 | Fernando prod | Mantido bloqueado (crédito) — decisão eFe |
| 4 | Smoke UI eFe | DONE — [SMOKE_EFE](./FAL_MARCHA_MVP1_SMOKE_EFE_VAL_2026-11-09.md) |

## Agora (bola humana / eFe)

| # | Passo | Como |
|---|--------|------|
| 1 | Smoke **G3** pagamento TEST no eFe | Pix + cartão + troca método + webhook |
| 2 | Smoke **G4** frete | Cotar ME/próprio → pedido → (etiqueta se credenciais) |
| 3 | Smoke admin | Separação A4 · margem pedido · KPIs dashboard |
| 4 | Quando crédito OK | Redeploy produção fernando (opcional) |

### Credenciais a conferir antes do smoke

- `VITE_SHIPPING_PROVIDER=melhorenvio` · `VITE_PAYMENT_PROVIDER=mercadopago`
- `VITE_MP_PUBLIC_KEY` · `VITE_WHATSAPP_PHONE`
- Secrets Edge: ME + `MP_ACCESS_TOKEN` / webhook / `MP_ENV`

---

## Em seguida (gates G1–G8, sem código novo obrigatório)

| Prioridade | Gate | Ação |
|------------|------|------|
| Alta | G3 | Smoke Pix + cartão + webhook reais |
| Alta | G4 | Cotação → etiqueta → postagem (ME/próprio) |
| Média | G1 | Qualidade apps + sinônimos + estoque em massa |
| Média | G6 | Texto jurídico formal (advogado) |
| Média | G7 | E2E cenários oficiais do plano MVP |
| Baixa (depois) | G8 | AJUSTE-001 limpeza + primeiras vendas acompanhadas |

---

## Fora da fila agora (Evolução 1)

Guest checkout total · placa 028 plena · wallets 019/020 · snapshot de custo · BI pleno · kits.

---

## Comandos MARCHA úteis

| Comando | Efeito |
|---------|--------|
| `MARCHA DEPLOY` | Publica acumulado + Edges (quando autorizar) |
| `MARCHA RELATORIO…` | Status/posição |
| Novo escopo nomeado | Só se sair do Pacote MVP-1 |

**Assinatura:** Próximos passos MVP-1 · 2026-11-09.
