# MARCHA — Próximos passos

**Data:** 2026-11-09 · ~15h  
**Posição:** Pacote MVP-1 código ENCERRADO · prep **MP/ME ops local** (PG01–PG04) · sem secrets/deploy prod  
**Handoff conta nova:** [FAL_MARCHA_OPS_MP_ME_CONTA_NOVA_HANDOFF_2026-11-09.md](./FAL_MARCHA_OPS_MP_ME_CONTA_NOVA_HANDOFF_2026-11-09.md) · [Plano mestre Pagamentos](./FAL_PLANO_MESTRE_PAGAMENTOS_INTEGRACOES_2026-11-09.md)

---

## Feito

| # | Passo | Status |
|---|--------|--------|
| 1 | Deploy código + Edges | DONE (PR #249) |
| 2 | Netlify eFe live | DONE |
| 3 | Fernando prod | Mantido bloqueado (crédito) — decisão eFe |
| 4 | Smoke UI eFe | DONE — [SMOKE_EFE](./FAL_MARCHA_MVP1_SMOKE_EFE_VAL_2026-11-09.md) |
| 5 | Smoke **G4** frete guest | DONE — [SMOKE_G4](./FAL_MARCHA_MVP1_SMOKE_G4_FRETE_GUEST_VAL_2026-11-09.md) |
| 6 | Smoke **G3** Pix create (agente) | DONE — [SMOKE_G3](./FAL_MARCHA_MVP1_SMOKE_G3_PIX_VAL_2026-11-09.md) · pedido `1ad15ec6…` R$ 78,04 |

## Agora (bola humana / eFe)

| # | Passo | Como |
|---|--------|------|
| 1 | Conta nova (crédito) | Netlify + vars PG02 + secrets MP/ME prod no momento certo |
| 2 | Deploy Edges + front | Após vars · smoke G3/G4 reais |
| 3 | G3 restante (ambiente atual) | Pagar Pix TEST + webhook · cartão (opcional até conta nova) |
| 4 | Smoke admin | Separação A4 · margem · KPIs |
| 5 | PG12–PG18 | Config DB, webhooks UI, refunds, monitor, permissões finas |
| 6 | Conta nova | Vars PG02 + deploy + smoke G3/G4 |

### Credenciais a conferir antes do smoke

- `VITE_SHIPPING_PROVIDER=melhorenvio` · `VITE_PAYMENT_PROVIDER=mercadopago`
- `VITE_MP_PUBLIC_KEY` · `VITE_WHATSAPP_PHONE`
- Secrets Edge: ME + `MP_ACCESS_TOKEN` / webhook / `MP_ENV`

---

## Em seguida (gates G1–G8, sem código novo obrigatório)

| Prioridade | Gate | Ação |
|------------|------|------|
| Alta | G3 | Pix create DONE · falta approve webhook + cartão |
| Média | G4 | Frete guest DONE · falta etiqueta/postagem ME |
| Média | G1 | Qualidade apps + sinônimos + estoque em massa |
| Média | G6 | Texto jurídico formal (advogado) |
| Média | G7 | E2E cenários oficiais do plano MVP |
| Baixa (depois) | G8 | AJUSTE-001 limpeza + primeiras vendas acompanhadas |

---

## Home experiência — Onda 1 + UX entrada (atualizado 2026-11-10 tarde)

| Passo | Status |
|-------|--------|
| Auditoria + spec + pacotes 2–4 | DONE — [RELATÓRIO](./FAL_MARCHA_RELATORIO_HOME_EXPERIENCIA_2026-11-10.md) |
| Código Onda 1 (ordem, trust, vigência, qtd destaques) | DONE (working tree) — [VAL](./FAL_MARCHA_HOME_ONDA1_VAL_2026-11-10.md) |
| UX: entrada unificada + menus Categorias/Meus veículos na vitrine | DONE (working tree) |
| SQL Home `vigencia` + settings / publish / smoke | PENDENTE eFe |
| Onda 2 (catálogo/PDP/025) | FORA — aguarda autorização · [PACOTES](./FAL_MARCHA_HOME_ONDAS_2_4_PACOTES_2026-11-10.md) |

## Evolução 1 — placa 028 (atualizado 2026-11-10)

| Passo | Status |
|-------|--------|
| Código PoC mock + scaffold apiplacas | DONE (working tree) — [VAL](./FAL_MARCHA_BUSCA_POR_PLACA_EVO1_VAL_2026-11-10.md) |
| PR / SQL `cached_plates` / Edge `plate-lookup` / smoke eFe | PENDENTE eFe — [HANDOFF](./FAL_MARCHA_HOME_OPS_PLACA_HANDOFF_2026-11-10.md) |
| API real (apiplacas ou similar) | FORA — Evolução 2/3 · sem saldo sem autorização |

## V3 — intervalo PVC anos da aplicação (2026-11-10)

| Passo | Status |
|-------|--------|
| `expandYearsForSelector` + regra única (`17/...` / `20/26`) | DONE (working tree) — [VAL](./FAL_MARCHA_V3_PVC_YEAR_RANGE_VAL_2026-11-10.md) |
| Admin apps (ano inicial obrigatório) + admin veículos sem montadora | DONE |
| Smoke eFe catálogo/admin | PENDENTE eFe |
| PR / publish | PENDENTE autorização |

## Fora da fila agora (resto Evolução)

Guest checkout total · placa 028 **produção plena** (Evo 3+) · wallets 019/020 · snapshot de custo · BI pleno · kits.

---

## Comandos MARCHA úteis

| Comando | Efeito |
|---------|--------|
| `MARCHA DEPLOY` | Publica acumulado + Edges (quando autorizar) |
| `MARCHA RELATORIO…` | Status/posição |
| Novo escopo nomeado | Só se sair do Pacote MVP-1 |

**Assinatura:** Próximos passos MVP-1 · 2026-11-09.
