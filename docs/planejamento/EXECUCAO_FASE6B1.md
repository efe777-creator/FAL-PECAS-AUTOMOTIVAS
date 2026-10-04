# Execução — Fase 6B.1 — Preço avulso

**Data:** 2026-10-04  
**Spec:** [ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](./ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md) §1.1 / §6.2

## Entregue

- [x] Modelo comercial documentado (lista padrão; avulso exceção)
- [x] Migration `product_price_overrides` + hierarquia no `resolve_product_price`
- [x] Services TS + admin CRUD avulso no formulário de produto
- [x] Badge “Avulso ativo” na detalhe da lista de preços
- [x] Import de lista permanece por SKU e não altera overrides

## Hierarquia

```text
avulso válido → lista public (priority) → is_default → erro
```

## Gate

Produto com avulso ativo aplica o avulso na vitrine/`place_order`; sem avulso, lista/base.
