# Especificação — Fase 6C: Endereços, CEP e Motor de Frete

**Status:** Implementada  
**Data:** 2026-10-03  
**Branch:** `plan`  
**Base:** [ESPECIFICACAO_FASE6_ECOMMERCE.md](./ESPECIFICACAO_FASE6_ECOMMERCE.md), F6B (listas de preços), [DATABASE.md](../entrada/DATABASE.md), [API.md](../entrada/API.md), [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md)  
**Execução:** [EXECUCAO_FASE6C.md](./EXECUCAO_FASE6C.md)

---

## 1. Objetivo

Evoluir a experiência de **endereço e frete** da FAL:

CEP → descoberta automática do endereço → número/complemento → endereço válido → cotação rápida → escolha da entrega → checkout.

Preparar arquitetura para Correios / Frenet / transportadoras **sem** integrar contratos comerciais reais nesta fase. Preservar integralmente F1–F6B.

Também (Etapa B M0): remover badge absoluto de quantidade no `ProductCard` (já existe “No carrinho N” no rodapé do card).

---

## 2. Auditoria do estado atual (Etapa A)

| Tema | Achado |
|------|--------|
| Schema endereços | `customer_addresses` completo (exceto `reference`); RLS own |
| Conta | CRUD + default em `AccountAddressesPage` / `addressService` — CEP **manual**, sem autofill |
| Checkout | Seleção de endereço; link para `/conta/enderecos` — **sem** cadastro inline |
| Cotação | `quoteShipping` no step Entrega; mock por CEP (surcharge 1º dígito) |
| Adapter frete | `ShippingProvider` + `shippingService` + `mockShippingProvider` |
| Server | `resolve_mock_shipping_option` + `place_order` revalida frete; ignora preço do client |
| ViaCEP / CepProvider | **Inexistente** |
| Peso/dims produto | **Inexistentes** (só `attrs` jsonb genérico) |
| Origem loja / admin frete | **Inexistente** |
| Campo referência | **Inexistente** no schema |

**Reutilizar:** schema endereços, services conta, adapter frete, SQL mock, `place_order`, checkout em steps.

---

## 3. Escopo

### Implementar (Etapa B, após gate)

- `CepProvider` + implementação ViaCEP (sem segredo no frontend acoplado à UI)
- Form CEP-first compartilhado (máscara, lookup, estados de loading/erro)
- Campo `reference` opcional em endereços
- Conta: UX evoluída (sem duplicar CRUD)
- Checkout: **+ Adicionar endereço** inline → seleciona → recota frete
- `FreightService` (debounce + cache curto) sobre `ShippingProvider`
- Estender contrato de quote (itens/peso/dims opcionais); mock continua funcional
- Colunas opcionais peso/dims em `products` (sem inventar dados)
- Config origem FAL simples + admin enxuto
- Stubs tipados providers futuros (Correios/Frenet/Carrier)
- M0 ProductCard; testes T1–T26; regressão F6/F6B

### Fora (explícito)

- Gateway pagamento real; guest checkout
- Integração comercial Correios/Frenet/transportadora
- Cupons/CRM/marketplace/ERP
- Reconstruir checkout; microserviços; painel multi-carrier complexo
- Importador genérico de catálogo (F8)

---

## 4. Decisões oficiais (fechadas)

| Tema | Decisão |
|------|---------|
| Provider CEP atual | **ViaCEP** atrás de `CepProvider`; UI só fala com service interno |
| Segredo | ViaCEP público — sem token; se futuro provider exigir segredo → Edge Function |
| Falha CEP | Erro amigável + **edição manual** permitida (não bloqueio permanente) |
| Número | Obrigatório; complemento e referência opcionais |
| Frete | Preservar mock TS + SQL; `FreightService` = facade + cache/debounce |
| place_order | Continua resolvendo frete no server via `resolve_mock_shipping_option`; client só envia `shipping_option_id` |
| Preço frete do client | **Nunca** fonte de verdade |
| Peso/dims | Colunas opcionais; mock ignora até haver dados; não inventar valores |
| Admin | Origem FAL (CEP + endereço) simples; sem painel de carriers |
| Checkout endereço | Form/modal inline; após salvar → selecionado + recota |
| ProductCard | Remover badge 🛒 absoluto; manter “No carrinho N” inferior |

---

## 5. Modelo de dados (deltas Etapa B)

### 5.1 `customer_addresses`

| Campo novo | Tipo | Regra |
|------------|------|--------|
| `reference` | text null | Ponto de referência opcional |

Demais campos já existem e permanecem.

### 5.2 `products` (logística opcional)

| Campo | Tipo | Regra |
|-------|------|--------|
| `weight_kg` | numeric null | Opcional |
| `height_cm` | numeric null | Opcional |
| `width_cm` | numeric null | Opcional |
| `length_cm` | numeric null | Opcional |

### 5.3 Origem da loja

Tabela simples `store_shipping_origin` (1 linha) ou `store_settings` jsonb com:

- cep, street, number, complement, district, city, state  
Leitura staff write; usada como CEP origem nas cotações (mock pode usar default se vazio).

### 5.4 Sem mudança obrigatória em `place_order`

Payload continua: `address_id`, `shipping_option_id`, itens, doc, idempotency. Totais e frete no server.

---

## 6. Contratos TypeScript

### 6.1 CepProvider

```ts
lookupByCep(cep: string): Promise<{
  cep: string        // 8 dígitos
  street: string     // logradouro
  district: string   // bairro
  city: string
  state: string      // UF
}>
```

Service: `addressLookupService` / `cepService` — normaliza CEP, chama provider ativo, mapeia erros (`invalid`, `not_found`, `unavailable`).

### 6.2 FreightService → ShippingProvider

```
FreightService.quote(req)  // debounce caller + cache TTL curto
    → ShippingProvider.quote(req)
        ├── MockShippingProvider (F6 — ativo)
        ├── CorreiosShippingProvider (stub futuro)
        ├── FrenetShippingProvider (stub futuro)
        └── CarrierShippingProvider (stub futuro)
```

### 6.3 ShippingQuoteRequest (estendido, retrocompatível)

Campos atuais: `postalCode`, `state`, `city`, `subtotal`, `itemCount`.  
Novos opcionais: `originPostalCode?`, `items?: { productId, quantity, weightKg?, dims? }[]`, `totalWeightKg?`.

### 6.4 ShippingQuoteOption

Manter: `id`, `provider`, `serviceCode`, `label`, `amount`, `etaDaysMin?`, `etaDaysMax?`, `metadata?`.  
UI pode exibir `label` / preço / prazo — não travar nomes “Econômica/Expressa/Retirada”.

### 6.5 Cache de cotação

Chave: origem + CEP destino + hash estável de itens/qtds/peso/dims/subtotal relevante.  
TTL curto (ex.: 60–120s). Cache **nunca** é verdade no `place_order`.

---

## 7. Fluxos UX

### 7.1 Endereço (conta e checkout)

1. Usuário digita CEP (máscara `00000-000`)  
2. Ao completar 8 dígitos → lookup (loading)  
3. Preenche street/district/city/state (editáveis)  
4. Número obrigatório; complemento/referência opcionais  
5. Label/destinatário conforme form atual  
6. Salvar → lista / seleção

### 7.2 Checkout

- Listar endereços + radio  
- **+ Adicionar novo endereço** (inline)  
- Após save: seleciona novo → avança/recota  
- Step Entrega: opções do `FreightService`; estados loading / vazio / erro  
- Recotar quando mudam CEP/endereço, itens, quantidades (não a cada render)

### 7.3 Estados obrigatórios (PT-BR)

Carregando CEP; CEP encontrado; CEP não encontrado; provider indisponível; calculando frete; frete disponível; frete indisponível; endereço incompleto.

---

## 8. Segurança

| Ator | Pode |
|------|------|
| Anon | Não ler/escrever endereços de clientes |
| Customer | CRUD só dos próprios; default só nos próprios |
| Customer A | Não acessa endereços de B |
| Staff | Conforme RLS/admin existentes; origem loja |

- Nunca `service_role` no frontend  
- Nunca confiar em freight amount / provider / total enviados pelo client  
- `place_order` revalida option + CEP do endereço persistido  

---

## 9. Arquivos-alvo (Etapa B)

```
src/services/address/cepProvider.ts          (interface + ViaCEP)
src/services/address/addressLookupService.ts
src/services/shipping/freightService.ts      (cache + debounce helper)
src/services/shipping/*StubProviders.ts      (futuro)
src/components/address/AddressForm.tsx       (compartilhado)
pages: AccountAddressesPage, CheckoutPage
admin: origem FAL (page + service)
migration: reference + weight/dims + store origin
ProductCard.tsx                              (M0)
```

Preservar: `placeOrderService`, núcleo `place_order`, mock SQL (ajustar só se contrato server exigir origem — preferir mínimo).

---

## 10. Critérios de aceite

- [ ] CEP consulta e preenche endereço  
- [ ] Número/complemento/referência  
- [ ] CRUD + default na conta  
- [ ] Novo endereço no checkout  
- [ ] Cotação rápida com debounce/cache correto  
- [ ] Mock e `ShippingProvider` intactos/abstraídos  
- [ ] Stubs futuros presentes  
- [ ] Peso/dims auditados/colunas opcionais  
- [ ] place_order seguro; RLS ok  
- [ ] F6 + F6B íntegras; build/TS/lint  
- [ ] ProductCard sem badge 🛒 absoluto  

### Testes T1–T26

T1 CEP válido · T2 inválido · T3 inexistente · T4 provider indisponível · T5 autofill · T6 edição manual · T7 número obrigatório · T8 criação conta · T9 edição · T10 exclusão · T11 default · T12 RLS · T13 endereço no checkout · T14 cotação após CEP · T15 mudança CEP · T16 mudança qty · T17 mudança carrinho · T18 cache sem preço errado · T19 seleção frete · T20 persistência seleção · T21 manipulação preço frete client · T22 place_order · T23 regressão F6 · T24 regressão F6B · T25 mobile · T26 desktop.

---

## 11. Gate

1. Aprovar esta spec + [EXECUCAO_FASE6C.md](./EXECUCAO_FASE6C.md) (humano)  
2. Só então Etapa B (código/migrations)  
3. Sem push sem autorização  
4. Não editar `.cursor/plans`  

**Estado:** Etapa B concluída — implementação + build + checklist T1–T26.
