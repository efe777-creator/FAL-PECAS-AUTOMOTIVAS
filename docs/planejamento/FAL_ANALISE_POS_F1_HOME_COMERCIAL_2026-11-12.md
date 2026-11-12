# FAL — Análise Gate pós-Frente 1 · Home Comercial

**Projeto:** FAL — Peças Automotivas  
**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA` (Gate pós-F1)  
**Status:** Gate assinado para abrir Frente 2 — **zero P0 aberto**  
**Plano mestre:** [FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md](./FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md)  
**Backlog:** [FAL_HOME_BACKLOG_01_08.md](./FAL_HOME_BACKLOG_01_08.md)

---

## 1. O que a Frente 1 entregou

| Pacote | Estado | Evidência |
|--------|--------|-----------|
| Docs canônicos + Onda 3 supersedida | DONE | mestre + backlog |
| HOME-01 auditoria preços | DONE | [AUDITORIA](./FAL_AUDITORIA_HOME_01_PRECOS_2026-11-12.md) |
| HOME-06a auditoria pagamentos | DONE | [AUDITORIA](./FAL_AUDITORIA_HOME_06_PAGAMENTOS_2026-11-12.md) |
| Spec consolidação Opção A + P0 | DONE | [SPEC](./FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md) |
| HOME-03 gate + admin Promoções | DONE remoto | migration + `/admin/home/promocoes` |
| HOME-06b P0 parcelas | DONE remoto | Brick 1x off + Edge enforcement |
| HOME-04 smoke resolve | DONE | [VAL](./FAL_MARCHA_HOME_04_GATE_SMOKE_VAL_2026-11-12.md) |

**Veredito F1:** estrutura comercial mínima (lista ≠ ativação + checkout alinhado em parcelas) está no ar.

---

## 2. Checklist do gate (perguntas)

| Tema | Achado | Classe |
|------|--------|--------|
| Promoções — ativação individual cobre o fluxo? | Sim no núcleo (SQL+admin básico). Falta massa, agendamento UX, lote, filtros ricos | **Ajuste F2** / polish |
| Resolve / preço — gate claro? | Sim: item sem ativação → Base; com ativação → promocional | OK |
| Destaques — independência preservada? | Sim (código não acopla). Admin featured ainda sem preço/selo/preview | **Ajuste F2** (HOME-02) |
| Pagamentos — anúncio × checkout | P0 enforcement feito. PIX%/faixas/cards Home ainda não | **Adiar** (06b fase 2) |
| Copy / IA — Ofertas vs Promoções vs Destaques | Copy Home admin melhorou link Promoções; Ofertas rail automático ainda pode confundir | **Ajuste F2** (B4) |
| Mobile admin Promoções | Cards mobile básicos existem | **Ajuste F2** (refino) |
| Lista Promocional `inactive` em prod | Bloqueia campanha até ops ativar a lista | **Ops / Ajuste F2** (aviso na UI) |
| F8.5 % adicional | Não comprovado ponta a ponta | **Adiar** / trilha preços |
| Jornada UI card→pedido com promo | Não exercitada com massa persistente | **Verificação F3** |
| interest_free = copy | Ainda não amarrado ao MP | **Adiar** / 06b fase 2 |

---

## 3. Classificação dos achados

### Correção P0 (bloqueia F2)

| ID | Achado | Estado |
|----|--------|--------|
| — | Nenhum | **P0 = 0** |

### Ajuste Frente 2 (usabilidade / polish)

| ID | Pacote | Item |
|----|--------|------|
| B-01 | HOME-02 | Destaques admin: imagem, preço normal/promo, selo informativo, preview |
| B-02 | HOME-02 | Preview Home desktop/tablet/mobile com dados reais |
| B-03 | HOME-05 | Cards: % desconto, hierarquia selo/strike unificada |
| B-04 | HOME-07 | Config gerais: toggles de exibição (selo, %, PIX futuro, parcelas) |
| B-05 | B4 copy | Textos Ofertas (rail) ≠ Promoções (admin) ≠ Destaques |
| B-06 | HOME-03+ | Aviso se Lista Promocional estiver `inactive`; atalho para `/admin/precos` |
| B-07 | HOME-03 | Filtros (agendada/expirada), ends_at mais claro, ações em massa se couber |

### Verificação Frente 3

| ID | Item |
|----|------|
| C-01 | Smoke UI: ativar lista + SKU + promo → card → PDP → cart → pedido |
| C-02 | 022-E1 formal com evidências |
| C-03 | Regressão parcelas (display on/off) no checkout real |
| C-04 | Busca/legado `promo_price` vs resolved |
| C-05 | HOME-08 homologação integrada |

### Adiar

| ID | Item | Motivo |
|----|------|--------|
| D-01 | PIX% / acumulação / faixas parcelamento | HOME-06b fase 2; decisão comercial aberta |
| D-02 | Cards de pagamento da Home administráveis | Depende D-01 |
| D-03 | F8.5 apply/validação integral | Trilha módulo preços, não bloqueia F2 |
| D-04 | Job cron expire → inactive | Resolve já respeita `ends_at`; cron é higiene |

---

## 4. Ordem recomendada Frente 2

1. **B-06** (aviso lista inactive) — baixo esforço, alto valor ops  
2. **HOME-02** (B-01/B-02) — Destaques ricos + preview  
3. **HOME-05** (B-03) — cards promocionais  
4. **HOME-07** (B-04) + **B-05** copy  
5. **B-07** polish Promoções  

Depois: Gate implícito → **Frente 3** (C-01…C-05).

---

## 5. Aceite do Gate pós-F1

| Critério | Resultado |
|----------|-----------|
| Doc de análise publicado | PASS |
| Achados classificados | PASS |
| Zero P0 aberto | PASS |
| Frente 2 priorizada | PASS |
| Autorização para iniciar F2 | **SIM** (este gate) |

**Assinatura:** Gate pós-F1 Home Comercial PASS · Frente 2 liberada · 2026-11-12 · eFe/MARCHA.
