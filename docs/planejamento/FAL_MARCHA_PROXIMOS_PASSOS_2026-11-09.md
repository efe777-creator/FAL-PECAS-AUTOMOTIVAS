# MARCHA — Próximos passos

**Data:** 2026-11-09 · ~14h  
**Posição:** Pacote MVP-1 **código ENCERRADO** · mudanças **locais, não publicadas**  
**Handoff:** [FAL_MARCHA_MVP1_DEPLOY_PREP_HANDOFF_2026-11-09.md](./FAL_MARCHA_MVP1_DEPLOY_PREP_HANDOFF_2026-11-09.md)

---

## Agora (bola humana / eFe)

| # | Passo | Como |
|---|--------|------|
| 1 | **Autorizar deploy** no fim do dia | Comando: `MARCHA DEPLOY` |
| 2 | Commit/PR do acumulado MVP-1 | Sem `.cursor/`, `.temp`, secrets |
| 3 | Redeploy Edges | `create-mp-payment` + `quote-shipping` |
| 4 | Build Netlify | Preferir espelho eFe antes da loja fernando |
| 5 | Smoke mínimo | Home · guest→conta · cookies/trocas · frete · Pix↔cartão · separação/margem/KPIs |

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
