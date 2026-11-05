# Plano de correções — Melhor Envio (FAL)

**Data:** 2026-11-05  
**Tipo:** planejamento de correções / follow-ups (**sem** implementação nesta marcha)  
**Política:** D-FRETE **B** · default loja = `mock`  
**Arquitetura:** D12 — cotação/`meq:`/prepare; etiqueta **manual** na Expedição; **nunca** purchase no webhook MP  
**Referências:** [VAL D12](./FAL_MARCHA_ME_HIBRIDO_VAL_2026-11-04.md) · [SEC](./FAL_MARCHA_ME_SEC_VAL_2026-11-04.md) · [SMOKE CALC](./FAL_MARCHA_ME_SMOKE_CALC_VAL_2026-11-04.md) · [canônico](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md) · [frete próprio v2](./FAL_PLANEJAMENTO_FRETE_PROPRIO.md)

---

## 1. Estado atual (FATO pós VAL)

| Item | Estado |
|------|--------|
| Carrier `melhorenvio` + Edge calculate | IMPLEMENTADO · smoke calc PASS |
| `shipping_quotes` + `meq:` + `place_order` | IMPLEMENTADO (wtbp) |
| Prepare-on-approve (`prepared`) | IMPLEMENTADO |
| `loadCartLogistics` no carrinho | IMPLEMENTADO |
| Secrets `MELHOR_ENVIO_*` | SET (SEC VAL) |
| Etiqueta Expedição HTTP | PARCIAL — falta M7 E2E humano |
| UI `/admin/logistica/melhor-envio` | STUB |
| Configurações de envio hub | STUB |
| Default Netlify ME | HOLD (não sem aceite / C se produção) |

---

## 2. Matriz de correções

| ID | Correção | Situação atual | Desejado | Ação | Pri |
|----|----------|----------------|----------|------|-----|
| ME-C1 | Rebase docs canônico/auditoria vs VAL D12 | Parcialmente feito 05/11 | Docs = FATO | Manter sync | P0 |
| ME-C2 | Versionar no git migrations own/origem só no wtbp | Drift repo | DDL no `supabase/migrations/` | MARCHA ops dump/apply doc | P0 |
| ME-C3 | Smoke E2E etiqueta Expedição (M7) | Pendente | Pedido âncora → print | Humano + VAL | P1 |
| ME-C4 | UI hub Melhor Envio (status, ambiente, UA mascarado) | Placeholder | Staff vê saúde integração | MARCHA UI | P1 |
| ME-C5 | Filtro `service_id` ME (P-ME-3) | Todas do calculate | Lista admin allowlist | Decisão + UI | P1 |
| ME-C6 | `MELHOR_ENVIO_API_BASE` prod vs sandbox sob B | Smoke usou prod API | Decisão explícita eFe | Registrar na ficha / ops | P0 |
| ME-C7 | Configurações de envio (volumes, block sem medidas) | Stub | Regras gerais | Após own v2 / ME UI | P2 |
| ME-C8 | Webhook ME → sem auto ship/deliver | Stub OK | Manter; não expandir | Nenhuma agora | P2 |
| ME-C9 | Opt-in Netlify `VITE_SHIPPING_PROVIDER=melhorenvio` | mock | Opt-in com disclaimer B | Só com aceite | P2 |
| ME-C10 | Regressão own + meq + mock + MP | Parcial | Suite contínua | Em toda MARCHA frete | P1 |
| ME-C11 | Disclaimer B visível com provider ME | Checklist VAL aberto | UI clara | Smoke UI | P1 |
| ME-C12 | Cart ME no approve (P-ME-4) | Só snapshot | v1 = só Expedição | Manter rec; não implementar cart no WH | P2 |

---

## 3. Ordem sugerida de MARCHAs

1. **ME-C1/C2** — docs + drift SQL (já iniciado rebase canônico)  
2. **ME-C6** — decisão API_BASE (bloqueia interpretação sandbox vs prod)  
3. **ME-C3** — M7 E2E etiqueta  
4. **ME-C4 + ME-C11** — UI hub + disclaimer  
5. **ME-C5** — filtro serviços  
6. **ME-C9** — opt-in loja (se desejado sob B)  
7. **ME-C7** — configs gerais  
8. Gate **D-FRETE C** se frete ME for produção comercial  

Paralelo permitido: frete próprio v2 ([planejamento](./FAL_PLANEJAMENTO_FRETE_PROPRIO.md)) — motores **separados**.

---

## 4. Regras que não mudam

- Etiqueta: **só** Expedição manual (`confirm:true`).  
- Webhook MP: no máximo `label_state: prepared`.  
- Secrets: `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_USER_AGENT`, opcional `MELHOR_ENVIO_WEBHOOK_SECRET`, `MELHOR_ENVIO_API_BASE`.  
- Remetente: `store_shipping_origin`.  
- Preço: server-side (`meq:`).  

---

## 5. Critério de conclusão deste plano docs

- [x] Gaps ME listados com prioridade  
- [x] Alinhado a D12 / VAL  
- [x] Sem autorizar purchase no webhook MP  
- [x] Sem alteração de código/secrets nesta marcha  

**Assinatura agente:** plano correções ME 2026-11-05 — documentação apenas.
