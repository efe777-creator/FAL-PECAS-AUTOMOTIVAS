# VAL — Deploy Busca Inteligente P0

**Data:** 2026-11-11  
**Git tip:** `2f96506` (`feat(search): unifica busca textual com PVC e corrige year-range`)  
**Push:** `main` → origin OK  
**Netlify:** site `fal-pecas-automotivas` deploy `6af4920d3fcd54a0923773cb` **ready**  
**URL:** https://fal-pecas-automotivas.netlify.app  

## Já em produção (Supabase)

- RPC `search_products` year-range/wildcard
- VV HB20: engine 1.0/1.6 saneados

## Smoke sugerido no site

1. Buscar `HB20 2015` → deve listar TDI2116/TDI2117  
2. Autocomplete HB20 → seção Veículos  
3. `TDI2116` → hit código  
4. Seletor Hyundai → HB20 → 2015 → mesmos SKUs  

## Ainda pendente eFe

- BRD2109 reimport  
- Preços TDI*  
- Migrations commercial_ref / search_prep  
- IA (orçamento)
