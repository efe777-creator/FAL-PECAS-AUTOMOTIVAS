# VAL — Onda 3: redesenho do topo da Home

**Data:** 2026-11-06  
**Auth:** MARCHA (pedido eFe — “muito feio”)  
**Item:** após Campanhas primeiro, o bloco navy “Buscar peça” competia com o banner e ficava pesado/vazio

## Diagnóstico

- Dois “heróis” empilhados (banner + faixa navy) = composição quebrada  
- Carimbo “Campanha” + H1 da marca + 3 botões outline = ruído  
- Sem slides ativos, só sobrava a faixa navy

## Entrega

| Peça | Mudança |
|------|---------|
| `HomeBannerCarousel` | Hero mais alto; sem label “Campanha”; dots alongados; loading skeleton |
| `HomeQuickEntry` | Faixa clara com marca + CTAs (primary / outline / link) |
| `HomePage` | Remove seção navy; usa `HomeQuickEntry` |

## Critérios

- [x] Campanha = único plano visual dominante no topo  
- [x] CTAs em faixa clara, sem segundo gradient navy  
- [x] Sem título “Peças certas…”  
- [x] `tsc -b` OK

## Gate humano

Nenhum — validar no espelho eFe após deploy.
