# MARCHA SOBERANA — plano mestre (06/11)

**Tipo:** runbook soberano (evidência + máximo agente + STOP)  
**Plano:** `FAL_PLANO_MESTRE_SITE_2026-11-05.md`  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Espelho eFe:** https://fal-pecas-automotivas-efe.netlify.app  
**Loja fernando:** https://fal-pecas-automotivas.netlify.app  
**Premissa:** α ENCERRADA · D-FRETE **B** · Onda 0 fechada no código · Onda 1 UX quase fechada  

---

## Sequência desta soberana

| Step | Item | Estado | Evidência |
|------|------|--------|-----------|
| S0 | Tip `main` | **PASS** | `17666d2` · merge **#171** (carousel no-half-card) |
| S0b | Espelho eFe HTTP | **PASS** | 200 · bundle `assets/index-tiTU4gYt.js` |
| S0c | Loja fernando × tip | **STALE** | Netlify deploy `6aecd125…` · `commit_ref` **`b7cd113`** (PR **#74**, 05/11) — **atrás** de `main` |
| S1 | D-FRETE | **B** | Cutover C = gate humano — **não** alterar |
| S2 | SQL reject-reason | **PENDENTE eFe** | Migration `20261106140000_…` no repo; apply wtbp não confirmado |
| S3 | M7 etiqueta ME | **HOLD** | Ops E2E + D-FRETE B — sem ligar ME no Netlify sem C |
| S4 | Código agente (esta soberana) | **PASS** | Home admin: blocker campanha/pagamento não salvos |

---

## Achado crítico (bola fernando / eFe)

A loja **produção** `fal-pecas-automotivas.netlify.app` **não** está no tip `main`.  
Último publish observado: **#74** (`b7cd113`, 2026-11-05).  
Espelho eFe responde 200 com bundle próprio — usar espelho para validar #164–#171 até republish.

---

## O que o agente NÃO fecha sozinho

1. Publish / créditos Netlify no site fernando (republish `main`).  
2. Apply SQL reject-reason no wtbp.  
3. Tarifas frete próprio · D-FRETE C · MP prod · sinônimos · ME etiqueta M7.  
4. Cond. pagamento 11/12 = decisão comercial eFe (admin já existe).

---

## Próxima fila (pós-STOP)

| # | Nome | Quem |
|---|------|------|
| 1 | **Publish fernando ← `main`** | fernando / eFe |
| 2 | Apply `20261106140000` reject-reason | eFe |
| 3 | MARCHA código | residuals / smoke `ownq` **sem** cutover |
| 4 | M7 / D-FRETE C / MP prod | gates humanos |

---

## STOP

Soberana plano mestre **fechada em evidência**. Código tip OK (#171+).  
**Bola humana #1:** republish produção fernando (stale desde #74).  
**Bola humana #2:** gates do relatório 06d.

**Assinatura agente:** MARCHA SOBERANA plano mestre 2026-11-06 · `17666d2` + Home admin unsaved.
