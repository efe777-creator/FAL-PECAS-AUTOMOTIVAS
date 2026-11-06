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

1. ~~Checkout: CPF/CNPJ modo leitura + avanço~~ — feito (VAL `O1F_CHECKOUT_DOC_READONLY`)  
2. PDP: mensagem quando cotação OK com 0 opções de frete (O1-D)  
3. Admin: rota 404 `path:'*'` (O1-H/I)  
4. Dashboard: não mostrar zeros no “Fluxo operacional” enquanto `loading` (O1-I)  

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

## Standby

- API Gemini / embeddings / Grok  
