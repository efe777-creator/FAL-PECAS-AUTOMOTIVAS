# VAL — Admin Melhor Envio (catálogo / nomes / logos)

**Data:** 2026-11-05  
**Branch:** `feat/me-admin-servicos-config-2026-11-05`  
**Spec:** [FAL_SPEC_ME_ADMIN_SERVICOS_2026-11-05.md](./FAL_SPEC_ME_ADMIN_SERVICOS_2026-11-05.md)

## Entregue

| Item | Artefato |
|------|----------|
| Tabela + seed PAC/SEDEX/Package ON | `20261105170000_me_shipping_services.sql` |
| Filtro + label + logo no Edge | `quote-shipping` |
| Status / sync catalog Edge | `action: me_admin_status` · `me_sync_catalog` |
| UI admin | `/admin/logistica/melhor-envio` |
| Vitrine logo | `ShippingOptionBrand` PDP/carrinho |
| Ordem preço ↑ | `quoteStorefrontShipping` |

## Ops pós-merge

1. Aplicar migration no wtbp  
2. Deploy Edge `quote-shipping`  
3. Staff: Logística → Melhor Envio → Atualizar catálogo → ligar serviços → Salvar  
4. Smoke PDP CEP capital  

## Aceite smoke

- [ ] Admin vê logos/nomes após sync  
- [ ] Só enabled na PDP  
- [ ] Status token/origem sem secret  
