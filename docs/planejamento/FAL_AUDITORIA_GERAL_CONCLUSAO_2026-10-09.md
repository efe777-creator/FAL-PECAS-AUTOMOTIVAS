# Auditoria geral, consolidação e plano de conclusão — FAL 3.0

**Data:** 2026-10-09  
**Tipo:** auditoria abrangente — **somente leitura** (sem código, schema, deploy, commit, secrets)  
**Runtime canônico:** `wtbpwuiayednvlhvuhbh` (HF ≠ verdade comercial)  
**Protocolo:** [PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md](./PROTOCOLO_OPERACIONAL_AUDITORIA_FAL_v1.0.md)  
**Git referência (FATO):** `main` @ `bf225b5` (PR #20 — PDP A–D)

**Legenda:** **FATO** · **RELATO** · **HIPÓTESE** · **DECISÃO** · **PENDÊNCIA DE DECISÃO** · **BLOQUEIO**

---

## A. Resumo executivo

**Situação geral:** A FAL 3.0 tem **fundação e operação comercial parcial** em produção de código (`main`): loja (catálogo, PDP A–D, apps PVC, preços, liberar, carrinho, checkout, pedidos), admin amplo, Edge MP e frete sandbox. Onda 0–1 e FIND-004 M1–M5 estão **ENCERRADOS** com VALs. O gargalo para **primeira operação comercial confiável com pagamento real** não é mais o catálogo/PDP — é o **gate humano de smoke Mercado Pago** + polish F9-F, mais a **decisão D-FRETE**.

**Principais resultados:**
- F1–F8.1 base + F9-E local — **RELATO** PRD/ROADMAP; código MP/frete presente — **FATO**
- F10 Onda 1 **FECHADA** — **FATO** [STATUS_ONDA1](./STATUS_ONDA1_2026-10-09.md)
- FIND-004 M1–M5 **ENCERRADO** (100/100 published com PVC) — **FATO** [M5 VAL](./FAL_FIND004_MARCHA5_SMOKE_VAL_2026-10-09.md)
- UI apps/anos + PDP A–D em `main` — **FATO** git + VALs PDP-A…D / MARCHA UI
- IMP-10 Liberar, IMP-07/11 card/PDP domínio, IMP-19 UX, FIND-012 sort — **RELATO** VALs + **FATO** rotas/código

**Principais pendências:** smoke MP (H1–H6); MARCHA F9-F; D-FRETE; E2E compra completa; sync documental; B3 HOLD; Bloco F.

**Bloqueadores:** (1) smoke MP / secrets — **BLOQUEIO** humano; (2) D-FRETE — **PENDÊNCIA DE DECISÃO**; (3) B3 repair — **HOLD**.

**Riscos:** docs desatualizados (STATUS_CONSOLIDADO / ROADMAP / PRD §7) sugerem estado anterior a FIND-004+PDP; checkout ainda oferece `pix_simulated`/`card_simulated` — risco de venda “simulada” se Netlify não apontar MP; volume de fotos Storage baixo — **HIPÓTESE** operacional.

**Próxima decisão recomendada:** eFe executar checklist [FAL_MP_SMOKE_PREP](./FAL_MP_SMOKE_PREP_2026-10-09.md) **ou** declarar modelo de operação controlada sem MP (WhatsApp/manual) com aceite de risco explícito.

---

## B. Escopo e fontes

### Documentos examinados (amostra prioritária)
| Fonte | Papel |
|-------|--------|
| [docs/entrada/FAL_PRD_3.0.md](../entrada/FAL_PRD_3.0.md) | Escopo produto / lacunas / critérios |
| [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md) | Fases F1–F13 |
| [BACKLOG_CONSOLIDACAO…](./BACKLOG_CONSOLIDACAO_FAL_3.0_2026-10-08.md) | Ordem MARCHAs |
| [STATUS_ONDA1…](./STATUS_ONDA1_2026-10-09.md) | Fechamento Onda 1 + pós |
| [TRANSICAO_POS_ONDA1…](./TRANSICAO_POS_ONDA1_2026-10-09.md) | Matriz IMP pós-Onda1 |
| [FAL_STATUS_CONSOLIDADO_MOLDE…](./FAL_STATUS_CONSOLIDADO_MOLDE_2026-10-09.md) | Molde estados (**desatualizado** em UI/FIND-004) |
| VALs FIND-004 M5, PDP A–D, IMP-*, STOP G/F/F9, B3 HOLD, MP smoke prep | Evidências / gates |
| Auditorias Fase 0 / consolidação 2026-10-08 | Baseline |

### Código / infra inspecionados
- `fal-pecas/src/app/router.tsx` — rotas loja/admin/conta  
- `pages/Product|Catalog|Cart|Checkout`, `services/{products,search,payments,shipping,orders,cart}`  
- `supabase/functions/{create-mp-payment,mercado-pago-webhook}` + `_shared/`  
- Contagem: **43** arquivos `*.test.ts` sob `src`; **55** SQL em `supabase/migrations`  
- Deploy: `netlify.toml` na **raiz do monorepo** (`base = "fal-pecas"`) — **FATO**; ausente dentro de `fal-pecas/`  
- Git: `main`/`dev` alinhados pós PR #19/#20  
- Confirmação paralela de mapa de código: [mapa fal-pecas](390d36d4-c444-4764-bcd0-bda109c4e01c) (somente leitura)

### Ambientes
| Ambiente | Acesso nesta auditoria |
|----------|------------------------|
| Código local + `main`/`dev` remoto | **FATO** |
| UI local (`localhost:5173`) | **NÃO VERIFICADO** nesta execução (smoke PDP/apps = **RELATO** VALs do dia) |
| Supabase wtbp SQL/MCP | **NÃO VERIFICADO** aqui (sem execute_sql nesta marcha) |
| Config Netlify (arquivo) | **FATO** (`../netlify.toml`); URL/prod pós-#20 = **NÃO VERIFICADO** |
| Secrets MP / Netlify env | **NÃO VERIFICADO** (proposital — não ler secrets) |

### Limitações
- Sem reexecução de smoke browser/MP/E2E nesta auditoria.  
- Sem consulta SQL wtbp nesta execução.  
- PRD §7 ainda descreve apps “cobertura parcial” e catálogo “em validação” — diverge do pós FIND-004/PDP.

---

## C. Estado geral por frente

| Frente | Estado | Evidência | Pendências | Dependências | Pri | Critério de conclusão |
|--------|--------|-----------|------------|--------------|-----|------------------------|
| Fundação F1–F7 | ENCERRADO | PRD/ROADMAP **RELATO** + rotas/código **FATO** | — | — | — | Não reabrir sem regressão |
| F8 / F8.1 ops | VALIDADO (base) | Admin produtos/preços/import **FATO** | Polimento dados | — | P2 | Operação diária sem workaround |
| F10 Onda 0–1 | ENCERRADO | STATUS + VALs IMP-01…10/07 | Sync docs | — | — | Mantido |
| Catálogo cliente | VALIDADO (escopo) | CatalogPage + search + FIND-004 M5 / FIND-012 VALs | Fotos em escala | Storage | P2 | Listagem elegível + filtros |
| PDP | VALIDADO (A–D) | ProductPage + VALs A–D + `bf225b5` | Vídeo; volume imagens | Storage | P2 | Compra/apps/desc/relacionados |
| Apps / PVC | ENCERRADO (dados) | M5: 100/100 PVC | 21 reviews + TDI0150 | Planilha | P3 | Não reabrir trilho |
| Preços / Liberar | VALIDADO | IMP-08/09/10 VALs | Liberação em escala | Ops | P1 | SKU comprável só se checklist OK |
| Carrinho | IMPLEMENTADO → parcial VAL | CartContext + FIND-006 VAL **RELATO** | E2E com place_order | — | P1 | Totais = RPC |
| Checkout | IMPLEMENTADO | CheckoutPage + place_order | F9-F; frete real | MP / D-FRETE | P0/P1 | Pedido + pagamento coerentes |
| Pagamentos MP | IMPLEMENTADO / **BLOQUEADO** smoke | Edge + createMpPaymentFlow **FATO**; STOP G **FATO** | H1–H6; F9-F | Humano | P0 | Smoke Pix+cartão sandbox |
| Frete | IMPLEMENTADO sandbox / **BLOQUEADO** prod | shippingService providers **FATO**; D-FRETE PRD | Decisão provedor | eFe | P1 | Cotação prod aprovada |
| Pedidos | IMPLEMENTADO | Admin/Account pedidos **FATO** | IMP-14 profundidade | Schema | P1 | Ciclo pago→entrega |
| Conta cliente | IMPLEMENTADO | Rotas conta **FATO** | — | Auth | P2 | CRUD básico |
| Admin / operadores | IMPLEMENTADO | router admin + Operadores **FATO** | Bloco F granular | STOP F | P2 | RLS por módulo |
| Auth / segurança | IMPLEMENTADO (base) | AuthContext / roles **RELATO** | Matriz F; advisors | — | P1 | Sem exposição crítica |
| Migrations / B3 | BLOQUEADO (HOLD) | [B3 HOLD](./FAL_B3_MIGRATION_REPAIR_HOLD_2026-10-09.md) | Pacote repair | eFe | P2 | `db push` coerente |
| Deploy / Netlify | IMPLEMENTADO (config) | `netlify.toml` raiz **FATO** | Confirmar URL/prod pós-#20 | Pipeline | P1 | Build+URL OK |
| Testes | PARCIAL | 43 `*.test.ts` **FATO** (5 em payments); E2E/smoke MP **ausente** no repo | IMP-24/25 | MP | P1 | Suite crítica verde |
| Docs / governança | DESATUALIZADA | STATUS_CONSOLIDADO vs reality **FATO** | Sync pós-auditoria | Auth edit | P1 | Docs = código |
| F11+ mestre | NÃO INICIADO | ROADMAP | Gate F10 | — | P3 | Fora 1ª operação |

---

## D. O que já temos

### Encerrado / validado (não reabrir sem finding)
- Onda 0 + Onda 1 (IMP-01…10/07) — docs STATUS  
- FIND-004 M1–M5 — smoke + SQL nos VALs  
- MARCHA UI apps/anos — VAL dedicado  
- PDP A–D — VALs + merge `main`  
- Contrato PDP v0.1 aceito  
- IMP-11 card visual / PDP domínio / FIND-012 / IMP-19 (VALs)  
- F9-E hardening local (PRD + testes relatados)

### Implementado (código) sem validação comercial completa
- Edge `create-mp-payment` + `mercado-pago-webhook`  
- Checkout com caminhos MP **e** simulated  
- Frete mock/Correios/Frenet sandbox via `VITE_SHIPPING_PROVIDER`  
- Relacionados PDP por categoria  
- Admin estoque/frete origem/relatórios/operadores  

### Parcialmente implementado
- Imagens produto (wire Storage; volume real **NÃO VERIFICADO** hoje)  
- Permissões (tela Operadores ≠ matriz Bloco F)  
- Pedidos profundos vs IMP-14 “condicionado a schema”  
- Observabilidade (logs edge existem; monitoring prod **NÃO VERIFICADO**)

### Relatado, não reconfirmado nesta auditoria
- 100/100 PVC e smokes browser FIND-004/PDP do mesmo dia  
- Vitest counts nos VALs IMP  
- Deploy Netlify refletindo `bf225b5`  

---

## E. O que falta (priorizado, sem duplicar)

### P0 — Bloqueador operação/pagamento
1. **Smoke MP sandbox** (secrets + redeploy + Pix/cartão) — [STOP_BLOCO_G](./STOP_BLOCO_G_PAGAMENTOS_2026-10-07.md), [MP_SMOKE_PREP](./FAL_MP_SMOKE_PREP_2026-10-09.md)  
2. **Decisão:** operar só com pagamento simulado / WhatsApp até MP — aceite de risco explícito se smoke adiado  

### P1 — Primeira operação confiável
3. **MARCHA F9-F** — checkout alinhado a MP ativo; retirar UX enganosa de simulação  
4. **D-FRETE** — escolher provedor produção + plano IMP-15  
5. **E2E crítico** — catálogo → PDP → carrinho → checkout → pedido (sandbox) — IMP-24/25  
6. **Sync documental** — PRD §7, ROADMAP “agora”, STATUS_CONSOLIDADO, BACKLOG, TRANSICAO  
7. **Confirmar prod** — Netlify + env `VITE_*` pós-merge PDP  
8. **Liberação comercial em escala** — processo ops com D-LIBERAR (não só código)

### P2 — Evolução importante
9. B3 migration repair (só com pacote HOLD)  
10. Bloco F permissões granulares + RLS  
11. Volume/proveniência de imagens  
12. Placeholder emoji ainda no **ProductCard** (PDP já neutro)  
13. IMP-04 categorias / IMP-17–18 dashboard-relatórios profundos  
14. Residuais FIND-004 (21 reviews + TDI0150) se negócio exigir  

### P3 — Futuro
15. F11 catálogo mestre; F12 enriquecimento; vídeo PDP; “quem viu” avançado  

---

## F. Bloqueios e decisões humanas

| Bloqueio | Motivo | Evidência | Impacto | Ação | Desbloqueio |
|----------|--------|-----------|---------|------|-------------|
| Smoke MP | Secrets/redeploy | STOP G + MP prep H? | Sem pagamento real validado | Humano H1–H6 + evidências | Checklist PASS |
| F9-F | Depende smoke | PRD §7 / STOP F9 | Checkout pode mentir “simulado” | MARCHA F9-F pós-smoke | Auth eFe |
| D-FRETE | Decisão comercial | PRD §36 | Frete prod indefinido | Escolher Correios/Frenet/outro/manual | Decisão escrita |
| B3 repair | Drift migrations | B3 HOLD | `db push` frágil | Pacote órfãs+rollback+auth | Auth explícita |
| Bloco F | Adiado | STOP_BLOCO_F | Risco ACL | Matriz + RLS | MARCHA F |
| IMP-14 estoque profundo | Schema/congelado | TRANSICAO / STATUS | Não aprofundar | Só se gap concreto | Auth |

---

## G. Auditoria dos fluxos críticos

| Fluxo | Situação | Estado |
|-------|----------|--------|
| Descoberta / busca | Catalog + RPC search + filtros veículo/categoria/marca — **FATO** código; smoke M5 **RELATO** | VALIDADO (escopo) |
| Visualização produto | PDP A–D em main — galeria/buy-box/specs/desc/relacionados — **FATO** | VALIDADO |
| Compatibilidade | PVC + grupos + YY + Mais apps — **FATO** VALs UI + M5 | VALIDADO dados+UI |
| Carrinho | Persistência + FIND-006 pricing — **RELATO** VAL; código **FATO** | IMPLEMENTADO |
| Checkout | place_order + frete quote + payment method — **FATO**; simulated ainda default path — **FATO** | PARCIAL |
| Pagamento | MP code **FATO**; smoke **BLOQUEADO** | BLOQUEADO comercial |
| Pedido / pós-venda | Conta + admin pedidos — **FATO** rotas | IMPLEMENTADO |
| Frete / entrega | Sandbox/mock **FATO**; prod **BLOQUEADO** D-FRETE | BLOQUEADO prod |
| Admin | CRUD amplo + Liberar + imports — **FATO** | VALIDADO base |

---

## H. Divergências documentais e técnicas

| Divergência | Docs | Realidade (evidência) | Tipo |
|-------------|------|------------------------|------|
| UI Mais apps / YY | STATUS_CONSOLIDADO: NÃO INICIADO | Código + VAL UI + main | Doc atrasado |
| FIND-004 | TRANSICAO/PRD: cobertura parcial / 17/100 | M5: 100/100 PVC | Doc atrasado |
| ROADMAP “F10-O0 agora” | ROADMAP §status | Onda 0–1 fechadas; PDP A–D merged | Doc atrasado |
| PRD §7 EM VALIDAÇÃO apps | PRD | Trilho dados ENCERRADO | Doc atrasado |
| Relacionados FIND-016 | TRANSICAO diz fora IMP-11 | PDP-D implementou por categoria | Evolução pós-doc |
| Checkout simulated | Docs F9-F pendente | UI ainda tem `pix_simulated` / `card_simulated` | Alinhado ao STOP; risco ops |
| Mock catálogo vs RPC | — | Path mock não aplica filtros veículo; path real usa `search_products` | Gap só se mocks ligados |
| AdminPlaceholderPage | — | Arquivo existe; **não** está no router (páginas admin reais ligadas) | Ruído; não é lacuna de rota |

**Não reconciliar silenciosamente** — atualizar docs só com MARCHA/auth de documentação.

---

## I. Matriz de riscos

| Risco | Impacto | Prob. | Evidência | Mitigação |
|-------|---------|-------|-----------|-----------|
| Venda com pagamento simulado em prod | Alto | Média se env errado | Checkout simulated **FATO** | Smoke MP + F9-F; env Netlify |
| Frete fictício cobrado/prometido | Alto | Média | mock default shipping | D-FRETE; copy honesta |
| Docs guiam MARCHA errada | Médio | Alta | STATUS_CONSOLIDADO | Sync docs P1 |
| Drift migrations (B3) | Médio | Média | HOLD | Pacote repair |
| ACL só por menu | Médio | Média | STOP F | Bloco F |
| SKU sem foto / apps residual | Baixo–médio | Alta fotos | Placeholder PDP | Conteúdo ops |
| Reabrir FIND-004 sem necessidade | Retrabalho | — | Protocolo | Só com finding novo |

---

## J. Plano de conclusão por fases

### Fase α — Primeira operação comercial controlada
**Objetivo:** vender com pagamento sandbox/validado e frete honesto.  
**Pré:** wtbp + Netlify + catálogo liberável (já).  
**Tarefas:** (1) MP smoke H1–H6; (2) evidências Pix/cartão; (3) MARCHA F9-F; (4) decisão frete (mesmo que “retirada/combinar”); (5) E2E 1 pedido sandbox; (6) confirmar PDP em prod.  
**Gate:** eFe assina “operação controlada OK”.  
**Doc:** `FAL_VAL_OPERACAO_CONTROLADA_*.md`

### Fase β — Fechar F10 (consolidação)
**Objetivo:** plataforma coerente sem gaps P1.  
**Tarefas:** sync docs; IMP-24/25 regressão; Bloco F se auth; B3 se auth; polish card placeholder; liberação em escala.  
**Gate:** checklist F10 DoD.  
**Doc:** atualizar ROADMAP/PRD status.

### Fase γ — Escopo PRD “completo” (sem F11+)
**Objetivo:** tudo previsto até F10 + F9 fechados.  
**Tarefas:** frete prod IMP-15; pedidos/estoque profundos se schema OK; dashboard/relatórios.  
**Fora:** F11–F13.

### Paralelos OK
- Sync docs ∥ prep MP  
- Conteúdo imagens ∥ F9-F  
- **Não** misturar: B3 repair ∥ apply dados ∥ F9-F no mesmo commit sem gates

---

## K. Critérios finais de encerramento

| Critério | Evidência exigida | Estado agora | Pendência | Auth |
|----------|-------------------|--------------|-----------|------|
| Catálogo + PDP | Smoke + VAL | VALIDADO A–D | Prod deploy | — |
| Apps PVC | SQL + UI | ENCERRADO M5 | Residuais opcionais | — |
| Carrinho | Totais = RPC | PARCIAL | E2E | — |
| Checkout | Pedido criado | IMPLEMENTADO | F9-F | eFe |
| Pagamento | Smoke Pix+cartão | BLOQUEADO | H1–H6 | Humano |
| Pedidos | Admin+conta | IMPLEMENTADO | Ciclo completo | — |
| Frete | Política + teste | BLOQUEADO prod | D-FRETE | eFe |
| Admin ops | Liberar/import/preço | VALIDADO base | Escala | Ops |
| Segurança | Sem secrets vazados; RLS base | PARCIAL | Bloco F | — |
| Testes | Vitest + E2E crítico | PARCIAL | IMP-25 | — |
| Docs = realidade | PRD/ROADMAP/STATUS sync | FALHA sync | Edit auth | eFe |
| Monitoramento | Logs edge + runbook | NÃO VERIFICADO | Observabilidade | — |

**Projeto “pronto para operação”** só com: α completa **ou** aceite de risco escrito listando P0 abertos.

---

## L. Atualizações documentais recomendadas (não feitas agora)

| Arquivo | Prioridade | Justificativa |
|---------|------------|---------------|
| `FAL_STATUS_CONSOLIDADO_MOLDE_2026-10-09.md` | P1 | UI/FIND-004/PDP desatualizados |
| `STATUS_ONDA1_2026-10-09.md` | P1 | Fechar pós-Onda1 (PDP A–D, UI) |
| `ROADMAP_FASES_3.0.md` | P1 | “F10-O0 agora” obsoleto |
| `docs/entrada/FAL_PRD_3.0.md` §7/31 | P1 | Apps/PDP/estado |
| `BACKLOG_CONSOLIDACAO…` | P2 | Próximas MARCHAs = MP/F9-F/D-FRETE |
| `TRANSICAO_POS_ONDA1…` | P2 | FIND-004 17/100 → 100/100; relacionados |
| Novo índice “fonte da verdade status” | P2 | Evitar N status conflitantes |

---

## M. Próximas ações (ordem)

1. **Humano:** completar H1–H6 MP smoke prep e registrar evidências (ou aceite de risco sem MP).  
2. **Auth:** `MARCHA F9-F` (checkout/MP).  
3. **Decisão:** `D-FRETE` (provedor ou política transitória).  
4. **Auth:** smoke E2E / `MARCHA IMP-24` (ou nome equivalente).  
5. **Auth docs:** sync PRD/ROADMAP/STATUS (sem misturar com código).  
6. **Confirmar** Netlify `main` pós-#20.  
7. **Hold contínuo:** B3, Bloco F, F11 — só com MARCHA nomeada.  
8. **Não tocar:** FIND-004 apply, inventar frete/parcelas/reviews, repair migrations “de passagem”.

---

## N. Conclusão operacional

| Pergunta | Resposta |
|----------|----------|
| Onde estamos? | Pós F10 Onda1 + dados apps + PDP A–D em `main`; pagamento/frete comerciais ainda em gate |
| O que falta? | Smoke MP → F9-F; D-FRETE; E2E; sync docs; (depois) F/B3/F11 |
| O que bloqueia? | Humano MP; decisão frete; HOLD B3 |
| Caminho? | α operação controlada → β fechar F10 → γ PRD sem F11+ |
| 1ª ação com autorização? | **Smoke MP (humano)** ou **aceite de risco**; depois `MARCHA F9-F` |
| O que não tocar agora? | FIND-004 trilho; B3 repair; Bloco F; F11; inventar frete/MP |

---

## STOP

- Relatório gravado: este arquivo.  
- **Nenhuma** alteração de código, schema, env, deploy ou docs mestres.  
- **Nenhuma** tarefa encerrada só por esta análise.  
- Aguardar autorização humana nomeada: `SMOKE MP` / `MARCHA F9-F` / `D-FRETE` / `SYNC DOCS` / etc.

**Resultado:** fotografia consolidada da FAL 3.0 em 2026-10-09 com plano de conclusão verificável até a primeira operação controlada e o fechamento do escopo F10/F9.
