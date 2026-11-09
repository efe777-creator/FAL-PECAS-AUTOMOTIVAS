# Relatório — Onde estamos e o que falta (comercial eFe)

**Data:** 2026-11-09 · ~15h55  
**Auth:** eFe — `VERIFICAR GARANTIR COMITS PUSH E DEPLOY RELATORIO`

---

## Veredito (30s)

| Camada | Estado |
|--------|--------|
| Código tip `main` | `3953a80` ↔ `origin/main` (sync) + commit pós-verificação (test/VAL/handoff) |
| Deploy eFe | Live · https://fal-pecas-automotivas-efe.netlify.app |
| Fernando prod | **Bloqueado** (crédito Netlify) |
| MP/ME no eFe | **Produção** (vars + secrets + smoke create Pix + frete live) |
| Venda plena / G8 | **NÃO** — falta pagar/webhook + gates humanos G1–G8 |

---

## Onde estamos

1. **Plano mestre código** — ENCERRADO (#247 / relatório FINAL).  
2. **MVP-1 código** — no `main` (#249 + motor pagamentos `07dbb76`).  
3. **Gestão pagamentos** — PG05–PG11b no código; PG12–18 adiado.  
4. **Espelho eFe comercial** — vars prod + Edges prod + smoke:
   - Vitest **415** PASS  
   - Frete ME **live**  
   - Pix create **PASS** (`4a1e1249-…` · R$ 63,35)  
5. **Bola:** humano (pagar Pix / webhook / cartão / admin / etiqueta / G8).

---

## Git / deploy (esta rodada)

| Check | Resultado |
|-------|-----------|
| `main` vs `origin/main` (antes) | Sync em `3953a80` |
| Locais pendentes | test ME env + VAL verificação + handoff atualizado |
| Não versionar | `.cursor/*`, `tmp-*.json`, `supabase/.temp` |
| Deploy eFe recente | ready (upload) — redeploy após push deste commit |

---

## O que falta (fila útil)

### Imediato (ops eFe)

| # | Item | Bloqueia |
|---|------|----------|
| 1 | Pagar Pix verificação + webhook → aprovado | G3 completo |
| 2 | Smoke cartão Brick | G3 cartão |
| 3 | Confirmar webhook no painel MP | G3 approve automático |
| 4 | Etiqueta ME (saldo) | G4 contratável |
| 5 | Admin staff smoke pagamentos | ops |

### Gates MVP G1–G8 (ainda humanos)

| Gate | Nota |
|------|------|
| G1–G2 | Catálogo/preço confiáveis (massa) |
| G3 | Pix create OK · **approve/webhook + cartão** pendentes |
| G4 | Cotação live OK · **etiqueta/rastreio** pendente |
| G5 | Separar/despachar (031+015) |
| G6–G7 | Jurídico/E2E/monitor |
| G8 | Liberação controlada + primeiras vendas |

### Fora / bloqueado

| Item | Status |
|------|--------|
| Fernando publish prod | Crédito Netlify |
| Evolução 1 / Onda 4 / M8–M9 | Fora do cutover agora |
| PG12–18 pagamentos finos | Adiado |

---

## Próximo passo sugerido

1. eFe paga o Pix do pedido `4a1e1249-…` e valida status aprovado.  
2. Se webhook não atualizar: checar `MP_WEBHOOK_SECRET` + URL no painel.  
3. Smoke cartão.  
4. Quando crédito Netlify voltar: publish fernando ← tip `main`.

**Assinatura:** Relatório status comercial eFe · create Pix/frete live PASS · G8 ainda humano · 2026-11-09.
