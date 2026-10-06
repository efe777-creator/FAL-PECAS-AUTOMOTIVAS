# Gate F8.1-H — E2E + regressão

**Data:** 2026-10-05  
**Escopo:** validação da cadeia F8.1 A–G; regressão F7/F8/checkout; auditoria migrations B–F.  
**Não inclui:** novas funcionalidades; commit/push; apply remoto (pendência operacional).

## 1. Veredito

| Área | Resultado |
|------|-----------|
| E2E domínio F8.1 (simulador + parsers + fórmulas) | **PASS** (Vitest) |
| Auditoria migrations B–F | **PASS** (asserts estáticos) |
| Integridade: F8.1 não toca place_order/inventário | **PASS** |
| Regressão código F7/F8/checkout presente | **PASS** (imports estáticos) |
| E2E remoto Supabase (RPC live admin/atendimento) | **PENDENTE** — requer migrations aplicadas + sessão |
| Ciclo pedido live (confirmação→entrega) | **PENDENTE** — suíte F7 já existente no produto; F8.1 não alterou |

## 2. Cadeia E2E coberta (automática)

Arquivo: `fal-pecas/src/services/fase81/fase81e2e.chain.test.ts`

1. Cadastro `codigo;descricao` → `draft` + `is_available=false` + não vendável  
2. Reimport cadastro idempotente (não publica)  
3. Conversão com fornecedor obrigatório  
4. Idempotência conversão; duplicata supplier_sku; SKU FAL inexistente (não cria produto)  
5. Custo válido/update; inválido; conversão inexistente; multi-fornecedor (fonte = `products.supplier_id`)  
6. Margem / markup / fixo / extra_cost / custo ausente / margem inválida / mudança %  
7. Import venda → `imported`; erros; reimport sem duplicar item; histórico  
8. Custo/regra **não** sobrescrevem `imported` nem `manual`  
9. “Voltar ao cálculo” explícito → `calculated` volta a recalcular  
10. Roles: atendimento/cliente bloqueados  
11. Checkout: só `published` + `is_available=true` vende; import não altera isso

## 3. Migrations (auditoria)

| Fatia | Arquivo | Checks |
|-------|---------|--------|
| B | `20261005120000_fase81b_catalog_import.sql` | `staff_can_import_catalog`; draft/false; apply; sem place_order |
| C | `20261005130000_fase81c_supplier_conversions.sql` | UNIQUE `(supplier_id,supplier_sku)`; sem insert products |
| D | `20261005140000_fase81d_supplier_costs.sql` | `extra_cost` / `list_extra_cost`; apply cost |
| E | `20261005150000_fase81e_pricing_formation.sql` | `price_origin`; RPCs regra/recalc/item; skip manual/imported |
| F | `20261005160000_fase81f_price_list_import_rpc.sql` | `imported`; sem recalc geral |

**Ordem:** B→C→D→E→F.  
**Sem:** `import_jobs`, DROP TABLE, alteração em pedidos/estoque.

**Permissão (contrato SQL):** todas as RPCs sensíveis checam `staff_can_import_catalog()` = `administrador` \| `gerente`. `GRANT EXECUTE … TO authenticated` + guard interno (atendimento autenticado ainda é bloqueado).

## 4. Regressão F7 / F8 / checkout

### Automático nesta fatia
- Migrations F8.1 **não** referenciam `place_order`, `transition_order_status`, fulfill/release, `inventory_mode*`, ship/deliver.
- Módulos ainda exportam: `placeOrder`, `transitionOrderStatus`, `get/setStoreInventoryMode`, lifecycle F7.

### Checklist operacional (remoto — após apply migrations B–F)

**Pedidos F7**
- [ ] Ciclo: recebido → confirmação → separação → envio → entrega  
- [ ] Cancelamento (quando aplicável) + reserva  
- [ ] Contadores / availability existentes

**Estoque F8**
- [ ] `inventory_mode` com_estoque / estoque_ficticio / sem_estoque  
- [ ] Snapshot `inventory_mode_at_order`  
- [ ] Reserva / fulfill / restore conforme modo

**Checkout (especialmente `sem_estoque`)**
- [ ] Veículo → catálogo → produto → carrinho → checkout → pedido  
- [ ] Published + available = vendável  
- [ ] Draft / `is_available=false` = não comprável  
- [ ] Import F8.1 não publica nem libera disponibilidade

**Segurança live**
- [ ] admin/gerente: apply catalog/conversion/cost/price/rule/recalc OK  
- [ ] atendimento: RPC retorna 42501 / mensagem de permissão

## 5. Integridade (contratos)

| Invariante | Evidência |
|------------|-----------|
| Sem duplicar produto por SKU | Upsert B + teste reimport |
| Sem duplicar conversão | UNIQUE C + teste reimport |
| Sem duplicar item de preço | Upsert F + reimport simulador |
| Sem auto-criar produto (C/D/F) | SQL + testes erro SKU |
| Sem published / available na import | SQL B + simulador |
| Sem estoque/pedido alterado | Migrations limpas + contadores sim=0 |

## 6. Comandos

```bash
cd fal-pecas
npm test
npm run build
```

## 7. Pendências explícitas

1. Aplicar migrations `fase81b`…`fase81f` no Supabase remoto.  
2. Smoke manual do checklist §4 com usuário admin + atendimento.  
3. Commit/push sob autorização.

## 8. Próximo

F8.1 **fechada em código/testes locais**. Operação remota e smoke live fora do escopo desta fatia de implementação.
