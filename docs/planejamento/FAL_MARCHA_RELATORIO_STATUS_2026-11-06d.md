# Relatório MARCHA — o que fizemos / o que falta

**Data:** 2026-11-06d  
**Plano:** `FAL_PLANO_MESTRE_SITE_2026-11-05.md`  
**HEAD:** `main` @ merge #164 (+ ME unsaved blocker em ship)  
**Espelho eFe:** https://fal-pecas-automotivas-efe.netlify.app  

---

## 1. O que fizemos (continuidade recente — PRs #122–#149+)

### Loja / funil
| PR | Entrega |
|----|---------|
| #132–#135 | O1-H: drawer filtros, scroll catálogo↔PDP, pedidos mobile cards, lightbox z-index |
| #136 | O1-D: recota frete no carrinho ao mudar qty |
| #137 | Fotos contain sem moldura cinza |
| #138 | Carregar mais sem pular ao topo |
| #139 | Remover + Desfazer no toast |
| #140 | Checkout: CPF/CNPJ modo leitura + avanço |
| #141 | PDP: mensagem frete 0 opções |
| #144 | Checkout: resumo itens, foco no erro, Salvar endereço → Entrega |

### Admin
| PR | Entrega |
|----|---------|
| #122–#131 | Paginação listas + `document.title` hubs/subpáginas |
| #142 | 404 `/admin/*` |
| #143 | Dashboard sem zeros falsos no loading |

### Antes (ondas fechadas no código)
- **Onda 0** fundação UI + bugs bloqueantes (toast, ConfirmDialog, copy, senha, cartão, etc.)
- **O1-A** inventário duplicidades (sem CONSOLIDAR aberto)
- **O1-G** CTAs Comprar agora / Adicionar; card → PDP
- **Onda 2/3 parciais:** SearchBar combobox, titles, robots/sitemap, Buscar pelo carro no topo, carrosséis/admin home em fatias anteriores

---

## 2. O que falta para “concluir” o plano

### A) Gates humanos (bloqueiam “produção plena” — não é MARCHA de código)
1. Publish / créditos Netlify (fernando)  
2. **D-FRETE C** (cutover frete)  
3. Pagamento Mercado Pago produção  
4. Sinônimos (dados + ligar flag)  
5. ME etiqueta em produção (M7)  
6. Tarifas frete próprio (dados eFe)  

### B) Código ainda P/N no plano (próximas MARCHAs / ondas)

| Frente | Status | O que falta |
|--------|--------|-------------|
| **O1-B** Classificação | P | Relatório + merge A→B; revisão dados eFe antes de massa |
| **O1-C** Caixas / padrões categoria | P/N | Templates + regra menor caixa; integrar cotação |
| **O1-D** Frete próprio | P | Smoke `ownq` E2E; tarifas = gate; cutover = gate |
| **O1-E** Melhor Envio | P | Allowlist finos; configs toggles; etiqueta = gate |
| **Onda 2** Busca/SEO | P | Facetas classificação; JSON-LD residual se faltar; favoritos em lote |
| **Onda 3** Home comercial | P/N | Carrosséis/campanhas finos; **cond. pagamento (11/12) = decisão eFe** |
| **Onda 4** Escala | N | Import imagens SKU; prep IA; relacionados curados |
| Paralelo | — | Cancelamento pós-pago/estorno (M8); webhook M9 |

### C) Critério “Onda 1 concluída” (plano §3)
- [x] Funil guest/CPF/confirmação/CTAs/mobile drawer/paginação admin (grande parte)  
- [ ] Merge classificação usável + caixa/padrão categoria  
- [ ] VAL `ownq` place_order + VAL M7  
- [ ] Cutover frete **só com assinatura eFe**  

---

## 3. Leitura rápida

| Camada | Situação |
|--------|----------|
| Onda 0 | Fechada no código |
| Onda 1 UX loja/admin | Quase fechada; faltam B/C/E + gates frete |
| Ondas 2–4 | Parciais / futuras |
| Produção comercial | Travada nos **gates humanos** |

**Feito após 06d:**  
- O1-B relatório + merge A→B (`CategoriesIntegrityPanel`)  
- Onda 2 SEO: title `/veiculo`, JSON-LD Home, `OrdersPage` → `/conta/pedidos`  
- O1-E: ME sync avisa edições não salvas  
- O1-I: AdminLayout mobile Escape + inert + título da página  
- O1-I: detalhe pedido — seções 1–6 + painel confirmação junto dos botões  
- O1-I: menu/dashboard filtrados por papel (`adminNavAccess`) — VAL `O1I_ADMIN_NAV_ROLE`  
- O1-I: gate de rota (`AdminForbiddenPage`) — VAL `O1I_ADMIN_PATH_GATE`  
- O1-I: breadcrumbs no shell (`AdminBreadcrumbs`) — VAL `O1I_ADMIN_BREADCRUMBS`  
- O1-I: limpeza “← Voltar” ad hoc — VAL `O1I_ADMIN_BACK_LINKS`  
- O0-B: `useBlocker` form produto sujo — VAL `O0B_PRODUCT_UNSAVED_BLOCKER`  
- Verify: tsc + vitest 363 + build PASS; blocker com guard anti-dup — VAL `VERIFY_SUITE`  
- O0-C: copy retomada MP + disclaimers frete sem VITE_/D-FRETE/sandbox — VAL `O0C_PAYMENT_SHIPPING_COPY`  
- Onda 3: Buscar pelo carro abaixo de Destaques — VAL `ONDA3_HOME_VEICULO_ABAIXO_DESTAQUES`  
- O1-E: Configurações de envio (ME-C7 leve) + copy sandbox/auth — VAL `O1E_SHIPPING_SETTINGS_COPY`  
- O1-F: motivo obrigatório recusa alterações (cliente) — VAL `O1F_CUSTOMER_REJECT_REASON` · **apply SQL wtbp**  
- Compat: resumo `+N` com motor/versão — VAL `COMPAT_SUMMARY_ENGINE_DEDUPE`  
- `useDocumentTitle` sem restore no cleanup (SPA) — VAL `DOCUMENT_TITLE_SPA`  
- PDP: filtro catálogo sem viés da 1ª montadora — VAL `PDP_CATALOG_FILTER_COPY`  
- Ano app só-fim → `.../YY` — VAL `VEHICLE_YEAR_END_ONLY`  
- Compat apps: keys React únicas — VAL `COMPAT_APPS_REACT_KEYS`  
- O1-G: Comprar agora aplica qtd da PDP — VAL `O1G_BUY_NOW_QTY`  
- O1-E / O0-B: ME — `useBlocker` + `beforeunload` com edições sujas — VAL `O1E_ME_UNSAVED_BLOCKER`  

**Próxima MARCHA sugerida (código):** residuals finos **ou** gates humanos.  
**Próximo gate eFe:** apply migration reject-reason · tarifas own / D-FRETE C / pagamento prod / ME etiqueta.  
