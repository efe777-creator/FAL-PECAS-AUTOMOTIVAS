# Relatório MARCHA — o que fizemos / onde estamos / o que falta

**Data:** 2026-11-06d (atualizado)  
**Plano:** `FAL_PLANO_MESTRE_SITE_2026-11-05.md`  
**HEAD:** `main` @ merge #185  
**Espelho eFe:** https://fal-pecas-automotivas-efe.netlify.app  

---

## 1. Onde estamos (leitura em 30s)

| Camada | Situação |
|--------|----------|
| **Onda 0** | Fechada no código (UI, bugs bloqueantes, copy residual fino) |
| **Onda 1 UX loja/admin** | Quase fechada — funil, CTAs, mobile, admin nav/paginação/blocker |
| **O1 B/C/D/E operação** | Parcial — código base existe; faltam dados eFe + VALs E2E + gates |
| **Ondas 2–4** | Parciais (SEO/busca/home admin já adiantados; escala ainda aberta) |
| **Produção comercial** | Travada nos **gates humanos** (não é MARCHA de código) |

**Veredito:** o site está operacional no espelho eFe; “produção plena” depende de eFe/fernando (frete, MP, Publish, sinônimos, tarifas, etiqueta).

---

## 2. O que fizemos

### 2.1 Bloco recente desta sessão (#164–#169)

| PR | Frente | Entrega |
|----|--------|---------|
| #164 | O1-G | Comprar agora aplica a qtd escolhida na PDP |
| #165 | O1-E / O0-B | ME: `useBlocker` + `beforeunload` com edições sujas |
| #166 | O1-D / O0-B | Frete próprio Gerais: blocker + banner |
| #167 | O0-B | Origem/expedição: blocker + banner |
| #168 | O1-F | Regra de senha visível no login + constante única |
| #169 | O0-C | Meus veículos sem jargão “cadastro mestre” |
| #170 | docs | Relatório MARCHA consolidado |
| #171 | Onda 3 | Carrossel Destaques sem cortar card ao meio |
| #172 | SOBERANA | Runbook + Home admin unsaved; **fernando Netlify STALE** |
| #173 | Onda 2 | Fotos card escala ideal (não pequenininhas) |
| #174 | O0-B | Classificação — blocker + banner se form sujo |
| #175 | O1-C / O0-B | Caixas — blocker + banner se form sujo |
| #176 | Onda 3 | Home: Campanhas primeiro; sem título “Peças certas” |
| #177 | Onda 3 | Topo Home redesenhado (banner + faixa clara CTAs) |
| #178 | O1-F | Recuperar senha preserva `from` do funil |
| #179 | O1-H | 404 loja com busca no catálogo |
| #180 | O1-A | Toast no detalhe do pedido admin |
| #181 | O1-A | Toast no estoque admin |
| #182 | O1-A | Toast na lista de produtos admin |
| #183 | O0-C / O1-A | Importações: copy + toast |
| #184 | O1-A / O0-C | Clientes: toast + copy |
| #185 | O1-A / O0-C | Relatórios: toast + copy |

### 2.2 Continuidade #122–#163 (resumo)

**Loja / funil:** drawer filtros, scroll catálogo↔PDP, pedidos mobile, lightbox, recota frete no carrinho, fotos contain, carregar mais, remover+desfazer, CPF readonly no checkout, frete 0 opções na PDP, resumo/foco checkout, buy-now qty, compat/ano/title SPA.

**Admin:** paginação listas, titles, 404 admin, dashboard loading real, nav por papel + path gate + breadcrumbs, ME sync dirty warn, settings de envio, motivo recusa cliente (SQL **ainda apply no wtbp**).

**Antes (ondas):** O0 fundação; O1-A inventário; O1-G CTAs; Onda 2/3 parciais (SearchBar, SEO, home veículo/destaques, admin home/campanhas).

### 2.3 Já no código (mas ainda “P” no plano por gate/dados)

- O1-B: painel integridade + merge A→B (massa = revisão eFe)
- O1-C: templates de caixa + menor caixa na cotação
- O1-D/E: hubs frete próprio / ME sob D-FRETE **B**
- Onda 2: combobox busca, JSON-LD Product/Home/breadcrumb, robots/sitemap, favoritos em lote
- Onda 3/4: admin home (banners/destaques/cond. pag.), relacionados curados base, import imagens página existe

---

## 3. O que falta

### A) Gates humanos (bloqueiam produção plena)

1. Publish / créditos Netlify (**fernando**) — **STALE:** produção em `#74` / `b7cd113`; tip `main` em `#171`+  
2. **D-FRETE C** (cutover frete) — só com assinatura eFe  
3. Mercado Pago **produção**  
4. Sinônimos (dados + ligar flag)  
5. ME etiqueta produção (**M7**)  
6. Tarifas frete próprio (dados eFe)  
7. **Apply SQL** `20261106140000_customer_respond_decision_reason` no wtbp (motivo recusa cliente)

### B) Código ainda aberto (próximas MARCHAs)

| Frente | Status | O que falta de código |
|--------|--------|------------------------|
| **O1-B** | P | Revisão dados eFe antes de merge em massa |
| **O1-C** | P | Padrões por categoria finos / smoke packing E2E se faltar |
| **O1-D** | P | Smoke `ownq` place_order E2E (tarifas = gate) |
| **O1-E** | P | Allowlist/toggles finos; etiqueta = gate |
| **Onda 2** | P | Facetas/SEO finos se aparecer finding |
| **Onda 3** | P/N | Carrosséis finos; **cond. pagamento 11/12 = decisão eFe** |
| **Onda 4** | N/P | Import SKU robusto; prep IA; curadoria relacionados em escala |
| Paralelo | — | Cancelamento pós-pago/estorno (M8); webhook M9 |

### C) Critério “Onda 1 concluída” (plano §3)

- [x] Funil guest/CPF/confirmação/CTAs/mobile drawer/paginação admin (grande parte)  
- [ ] Merge classificação usável em massa + caixa/padrão categoria “fechados” operacionalmente  
- [ ] VAL `ownq` place_order + VAL M7  
- [ ] Cutover frete **só com assinatura eFe**  

---

## 4. Próximo passo sugerido

| Quem | Ação |
|------|------|
| **eFe** | Apply migration reject-reason · tarifas own · decisão cond. pag. · D-FRETE C / MP prod quando for a hora |
| **fernando** | Publish / créditos Netlify |
| **MARCHA código** | Residuals finos **ou** smoke `ownq` / packing E2E **sem** cutover |

---

## 5. VALs recentes (âncoras)

`O1A_CUSTOMERS_TOAST` · `O1A_REPORTS_TOAST` · `SOBERANA_PLANO_MESTRE_2026-11-06` · (+ série #150–#184 no histórico)

**Soberana:** `FAL_MARCHA_SOBERANA_PLANO_MESTRE_EXEC_2026-11-06.md`
