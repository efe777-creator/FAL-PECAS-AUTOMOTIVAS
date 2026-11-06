# VAL — O1-I: remover “← Voltar” ad hoc (pós-breadcrumbs)

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Depende:** [VAL breadcrumbs](./FAL_MARCHA_O1I_ADMIN_BREADCRUMBS_VAL_2026-11-06.md)

## Entrega

Removidos links de cabeçalho redundantes com a trilha do shell em:
pedidos (detalhe/área/visão/lista), logística (ME/próprio/caixas/origem/placeholder), preços (detalhe), fornecedores (imports), busca prep, imagens SKU, form produto.

**Mantidos:** CTAs de erro (“área/visão/lista não encontrada”), wizard “← Trocar tipo”, Forbidden “Voltar à loja”.

## Critérios

- [x] Sem “← Central/Logística/…” acima do H1 nas páginas tocadas
- [x] Navegação sobe via breadcrumb
- [x] `tsc -b` OK

## Gate humano

Nenhum.
