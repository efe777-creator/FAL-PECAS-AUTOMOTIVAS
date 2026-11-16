# FAL Fornecedores — Visão funcional (direção)

**Versão:** 1.0 · **Data:** 2026-11-16 · **Status:** FUTURO / direção  
**Não autoriza implementação agora.**

---

## 1. Público e proposta

**Público:** distribuidores e fornecedores.  
**Problema:** atualização manual de catálogo/preço/estoque; relação só compra-venda.  
**Proposta:** portal/rede integrada — catálogo, disponibilidade regional, pedidos, devoluções, desempenho; APIs no futuro.

---

## 2. Capacidades por maturidade

| Nível | Conteúdo |
|-------|----------|
| Hoje (interno) | Admin fornecedores, imports custo/conversão |
| Portal 1 | Login fornecedor; atualizar preço/estoque; ver pedidos |
| Portal 2 | API; disponibilidade regional; SLA |
| Rede 3 | Inteligência de abastecimento por demanda |

---

## 3. Entidades conceituais

Supplier org · catalog_feed · stock_feed · supply_order · discrepancy · performance_metric

Manter `suppliers` / `supplier_products` como base — evoluir, não substituir às cegas.

---

## 4. Fundação MVP a preservar

- `suppliers` / `supplier_products.cost`  
- Imports e matching  
- Produto FAL como SoT de publicação  
- Separação import ≠ publish  

---

## 5. Critérios para iniciar

1. Commerce estável e volume de SKUs  
2. Processo interno de custo/preço maduro  
3. 1–2 fornecedores piloto  
4. Contrato de dados (quem manda em qual campo)  

**Não construir antes:** marketplace B2B aberto sem curadoria; auto-publicação na loja.
