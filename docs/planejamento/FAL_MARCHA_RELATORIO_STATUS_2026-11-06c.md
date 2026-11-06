# Relatório MARCHA — verificação plano + status

**Data:** 2026-11-06c  
**Auth:** MARCHA  
**Plano:** `FAL_PLANO_MESTRE_SITE_2026-11-05.md`  
**Espelho eFe:** https://fal-pecas-automotivas-efe.netlify.app  

## Verificação (plano × código)

### Fechado no código (amostra)

O0/O1-H: 404 loja, MobileNav `lg:hidden`, ScrollToTop só pathname + load-more sem jump, scroll catálogo↔PDP, drawer filtros, lightbox z-index.  
O1-G: imagem do card → PDP.  
O1-F: confirmação de pedido, preço unitário, cadastro preserva `from`, **Remover + Desfazer** (esta fatia).  
O1-D: recota qty no carrinho; mensagem medidas/zero opções no bloco do carrinho.  
O1-I: paginação listas; lote produtos só com seleção.  
Onda 2/3 parciais: SearchBar combobox, titles, robots/sitemap, “Buscar pelo carro” no topo.

### Aberto acionável (próximas MARCHAs)

1. ~~Checkout: CPF/CNPJ modo leitura + avanço~~ — feito  
2. ~~PDP: cotação OK com 0 opções~~ — feito  
3. ~~Admin 404 `path:'*'`~~ — feito  
4. ~~Dashboard zeros no loading~~ — feito (VAL `O1I_DASHBOARD_LOADING`)  

**Residuais O1 da lista rápida:** esgotados.  
**+ O1-F fino:** resumo itens + foco erro + Salvar endereço → Entrega (VAL `O1F_CHECKOUT_RESUMO_FOCO`).  

Seguir plano mestre (O1-B/C/E gates, Onda 2/3/4) + gates humanos.  

### Gates humanos (não código)

1. Publish/créditos Netlify fernando  
2. D-FRETE C  
3. Pagamento produção  
4. Sinônimos (dados + flag)  
5. ME etiqueta produção  
6. Tarifas frete próprio (dados eFe)  

## Feito nesta continuidade

- #137 enquadramento fotos contain  
- #138 Carregar mais sem pular ao topo  
- #139 Remover carrinho + Desfazer  
- Checkout Identificação: documento do perfil em modo leitura + avanço auto  
- PDP frete: mensagem quando cotação OK com 0 opções  
- Admin 404 (`AdminNotFoundPage` + `path:'*'`)  
- Dashboard: loading real no Fluxo operacional (sem zeros falsos)  
- Checkout: resumo de itens, foco no erro, Salvar endereço → Entrega  

## Standby

- API Gemini / embeddings / Grok  
