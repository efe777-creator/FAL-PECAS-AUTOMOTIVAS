# Relatório MARCHA — status pós inventário O1-A

**Data:** 2026-11-06b  
**Auth:** MARCHA  
**HEAD:** ver `main` após merge desta fatia  
**Espelho eFe:** https://fal-pecas-automotivas-efe.netlify.app  

## Inventário O1-A

Sem itens **CONSOLIDAR** abertos. Tudo **MANTER** / **NÃO TOCAR**.

## Feito nesta continuidade (PRs ~#109–#120)

- Import custo wizard unificado; toast em dezenas de telas admin  
- Packing ME sem max-eixos + redeploy `quote-shipping`  
- Copy SearchBar×catálogo (`searchCopy`) + toast erros image SKU  

## Standby

- API Gemini / embeddings / Grok  

## Gates humanos

1. Publish/créditos Netlify fernando  
2. D-FRETE C  
3. Pagamento produção  
4. Sinônimos (dados + ligar flag)  
5. ME etiqueta produção  

## Feito após 06b

- Home: “Buscar pelo carro” logo após o hero  
- `document.title` no funil e na conta (Onda 2 residual)  
- Admin produtos: paginação visível (banner + Carregar mais; `hasMore` pré-filtro imagem)  
- Admin estoque: paginação visível (banner + Carregar mais)  
- Admin aplicações: Carregar mais (total já existia; lote 250 deixava só “refine filtros”)  
- Admin importações: paginação visível (cap 150 + Carregar mais)  
- Admin hub: `document.title` em todos os itens do menu principal  
- Admin logística: titles nas subpáginas (origem, frete próprio, ME, caixas, placeholder)  
- Admin pedidos: titles nas subpáginas (lista, área, visão, detalhe)  
- Admin produtos: titles no form + wizards de import  
- Admin titles: residual fechado (preço detalhe, fornecedor, prep IA, placeholder) — 100% `pages/admin/*Page`  
- Admin pedidos: paginação em áreas e visões (cap 200 deixava de ser só na lista avançada)  
- Catálogo mobile: filtros em `MobileDrawer` + sticky contagem corrigida (O1-H residual)  
- Catálogo ↔ PDP: restaura scroll ao voltar (`ScrollToTop` ignora POP + sessionStorage)  
- Meus pedidos: cards mobile + CTA botão (Continuar pagamento / Responder loja)  
- Lightbox PDP acima da MobileNav (`z-[280]`) — fecha residual O1-H de empilhamento  

## Próximo código (opcional)

- Itens do plano mestre ainda P/N + gates humanos (frete/pagamento/ME/sinônimos)  

