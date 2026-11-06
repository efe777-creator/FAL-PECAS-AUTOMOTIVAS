# Relatório MARCHA — o que foi feito × o que falta

**Data:** 2026-11-06  
**Auth:** MARCHA relatório  
**HEAD:** `0393425` (`main`)  
**Espelho eFe:** https://fal-pecas-automotivas-efe.netlify.app  
**Produção fernando:** bloqueada (créditos/Publish / PAT time)

---

## 1. Resumo executivo

| Frente | Estado |
|--------|--------|
| Onda 0 (bugs + fundação UI) | **Feita** no código (VAL O0) |
| Onda 1 (operação / funil / admin UX) | **Quase fechada** — residual inventário + gates humanos |
| Ondas 2–4 | **Grandes fatias já shipadas** (busca/SEO, home, import SKU, relacionados…) |
| Cutover frete (D-FRETE C) | **Não** — gate eFe |
| Deploy canônico fernando | **Não** — gate créditos/Publish |

---

## 2. O que foi feito (por onda)

### Onda 0 — crítico + fundação
- Button outline legível, Toast no router, ConfirmDialog (admin + conta)
- Bugs loja: senha, cartão recusado, carregar mais, frete/CEP, Pix, CPF perfil
- Bugs admin: paginação/aviso 200, reload silencioso pedido, romaneio, produto dirty/toast, Base/Promo, relatórios → lista
- Copy: jargão técnico fora do texto renderizado (residual admin tratado)

### Onda 1 — operação e funil
| Fatia | Entregue |
|-------|----------|
| **O1-A** inventário | Publicado; várias consolidates já **MANTER** |
| **O1-B** classificação | Merge, relatório, cascata published, arquivados, form/browse/painel extraídos |
| **O1-C** caixas + padrões | Templates + padrão por categoria + packing em cotação |
| **O1-D** frete próprio | UX admin, abas/shell O1-I, smoke `ownq` sob B |
| **O1-E** Melhor Envio | Hub, serviços, etiqueta M7, smoke — sob B |
| **O1-F** funil | Auth/CPF/from, confirmação pedido, carrinho toast |
| **O1-G** CTAs | Comprar agora / Adicionar / card sem lightbox |
| **O1-H** mobile | Carrinho 768–899, drawer filtros, 404 |
| **O1-I** admin UX | Paginação, lote só com seleção, splits: form produto, preços (abas), frete próprio, classificação |

### Inventário O1-A — já consolidado nesta sessão (2026-11-06)
- Expire não pagos ×3 → `adminExpireUnpaidFlow` + toast Hub/Lista/Área
- Status admin ≡ operador
- Máscaras origem frete
- Preço resolvido no form de produto (+ nota legado `products.price`)
- `PricingRuleFields` (formação lista × aba; modal item distinto)
- Classificação: menu arquivados, form, browse bar, painel lista/árvore
- Toast: classificação + listas de preços
- Teste payment provider alinhado ao env

### Ondas 2–4 (visão plano — já há VAL no repo)
- **2:** busca/SEO P1, facetas, sugestões RPC, PDP slug/path, sitemap, favoritos batch  
- **3:** home P1/controle, carrosséis, admin listas/home, pagamento (decisão comercial parcial)  
- **4:** import imagens SKU, prep IA busca, relacionados curados  

### Deploy / qualidade recente
- Espelho eFe deployado e VAL registrado  
- Suite: `tsc` + **347** testes verdes (último verify)

---

## 3. O que falta

### Gates humanos (não são MARCHA de código)
1. **Publish / créditos** Netlify time fernando → URL canônica  
2. **Cutover D-FRETE C** (sair do mock) — assinatura eFe  
3. **Pagamento produção** (credenciais / go-live MP)  
4. **Sinônimos** busca (dados/ops)  
5. **ME etiqueta** produção (além sandbox/smoke)  
6. Revisão merge em massa de classificação (dados eFe)

### Inventário ainda **CONSOLIDAR**
| Item | Nota |
|------|------|
| Volumes ME ↔ templates O1-C | Cotação já tem packing; fechar “só max eixos” residual se ainda existir |
| SearchBar vs busca catálogo | Copy — Onda 2 residual |
| Tabela pedidos Hub/Lista/Área | Unificar via `AdminOrdersListPanel` |
| Import custo wizard × página fornecedor | 2 fluxos |
| CRUD Fabricantes / Montadoras / Fornecedores | Genérico |
| Toast admin residual | Detalhe preço, frete próprio, produtos lista, etc. ainda `<p>` |

### Critérios de Onda 1 do plano (checagem)
- [x] Merge/relatório classificação usáveis  
- [x] Caixa + padrão categoria  
- [x] VAL ownq + M7 (smoke)  
- [x] Funil guest/`from` + CPF + confirmação (código)  
- [x] CTAs O1-G + mobile carrinho  
- [ ] Admin “sem listas cortadas silenciosamente” — paginação existe; revalidar 100% telas  
- [ ] Cutover frete **não** sem eFe  

### Ondas 2–4 — faltas típicas (não inventário O1)
- Polimento SEO/busca (combobox “ver todos”, titles por página)  
- Home: “buscar pelo carro” no topo se ainda residual; condições pagamento cards (decisão eFe)  
- Escala: upload múltiplo com progresso; IA além do prep  

---

## 4. Próximas MARCHAs sugeridas (ordem)

1. Toast residual (detalhe preços / frete próprio / produtos)  
2. Unificar tabela pedidos → `AdminOrdersListPanel`  
3. CRUD genérico Fabricantes/Montadoras/Fornecedores  
4. Import custo: um fluxo canônico  
5. Fechar volumes ME × caixas (se grep ainda achar max-eixos puro)  
6. Deploy produção quando fernando liberar créditos  

---

## 5. Fora do escopo deste relatório

- Editar o plano mestre (regra: sem editar plano aprovado sem pedido)  
- Alterar D-FRETE B sem gate  

**Assinatura:** MARCHA relatório 2026-11-06.
