# VAL — PDP: atalho catálogo alinhado à montadora

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** link “pelo veículo” usava só a 1ª montadora das apps

## Entrega

`buildPdpCatalogFilterLink`: 1 montadora → `?maker=` + copy “da montadora X”; várias → `/catalogo` sem viés.

## Critérios

- [x] Testes productDescription PASS
- [x] `tsc -b` OK

## Gate humano

Nenhum.
