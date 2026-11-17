# PRD Mestre 4.0 — FAL Peças Automotivas

**Versão:** 4.0.2  
**Data:** 2026-11-16  
**Status:** CANÔNICO — documento-base de produto (não autoriza implementar tudo)  
**Execução imediata:** [FAL_MVP_PLANO_CONSOLIDACAO.md](../planejamento/FAL_MVP_PLANO_CONSOLIDACAO.md) frente **G8** (STOP 8.3 — vendas controladas)  
**Substitui como produto:** [FAL_PRD_3.0.md](./FAL_PRD_3.0.md) (histórico)  
**Visão:** [FAL_VISAO_ECOSSISTEMA_2040.md](./FAL_VISAO_ECOSSISTEMA_2040.md)  
**Arquitetura:** [FAL_ARQUITETURA_360.md](../arquitetura/FAL_ARQUITETURA_360.md)  
**Dados:** [FAL_DADOS_FONTES_VERDADE.md](../arquitetura/FAL_DADOS_FONTES_VERDADE.md)  
**MVP:** [FAL_MVP_COMPLETO_4.0.md](../planejamento/FAL_MVP_COMPLETO_4.0.md)  
**Roadmap:** [FAL_ROADMAP_MESTRE_4.0.md](../planejamento/FAL_ROADMAP_MESTRE_4.0.md)  
**Evidência:** [FAL_AUDITORIA_CONSOLIDADA_PRD4.md](../planejamento/FAL_AUDITORIA_CONSOLIDADA_PRD4.md)  
**Índice:** [FAL_INDICE_CANONICO.md](./FAL_INDICE_CANONICO.md)

---

## Legenda de estado

| Estado | Significado |
|--------|-------------|
| **CONCLUÍDO** | Implementado e validado no escopo |
| **EM VALIDAÇÃO** | Existe; falta smoke/gate |
| **PARCIAL** | Existe com remenda ou lacuna |
| **PLANEJADO** | MVP / fase ativa |
| **FUTURO** | Visão sem compromisso imediato |
| **DECISÃO PENDENTE** | Gate humano |
| **NÃO VERIFICADO** | Evidência insuficiente |

---

# 1. Identidade, problema, visão e objetivos

## 1.1 Identidade

A FAL é uma **plataforma própria** de comércio e operação automotiva: começa pelo Commerce de peças e evolui para ecossistema (Garage, Parceiros, Workshop, Fornecedores, Intelligence).

## 1.2 Problema

Cuidar de um veículo exige vários lugares e sistemas. Internamente, plataformas remendadas geram duplicidade, fluidez quebrada e custo de reestruturação.

## 1.3 Visão

Ver [FAL_VISAO_ECOSSISTEMA_2040.md](./FAL_VISAO_ECOSSISTEMA_2040.md): resolver a vida automotiva do proprietário com ambientes conectados e uma verdade por domínio.

## 1.4 Objetivos

1. Operar Commerce com qualidade (vender, pagar, entregar, atender, margem).  
2. Manter arquitetura expansível sem reconstrução.  
3. Construir relacionamento via veículo (semente Garage → Garage rica).  
4. Abrir Parceiros/Workshop só com maturidade comercial e jurídica.

**Não é objetivo imediato:** ERP/WMS/PIM corporativo, microsserviços, marketplace de oficinas, app nativo, WhatsApp agentic.

---

# 2. Usuários, papéis e experiências

| Perfil | Experiência | Papel |
|--------|-------------|-------|
| Cliente / proprietário | Loja + conta + garagem seed | Navegar, comprar, acompanhar |
| Operador / estoque / atendimento | Admin | Catálogo, pedidos, estoque, clientes |
| Gerente / administrador | Admin | Config, preços, pay, logística, operadores |
| Oficina (futuro) | Workshop / Parceiros | OS, orçamentos, agenda |
| Fornecedor (futuro) | Portal | Catálogo, estoque, pedidos B2B |

Roles staff atuais: `administrador` | `gerente` | `operador` | `estoque` | `atendimento`. Matriz granular módulo×CRUD = evolução (não bloqueia G8 se RLS básica ok).

---

# 3. Princípios e anti-remendo

1. **Uma verdade por domínio.**  
2. **Reutilizar antes de criar.**  
3. **Importação não publica.**  
4. **Sem alteração silenciosa de preço.**  
5. **`status` ≠ `is_available`.**  
6. **Mobile-first na loja.**  
7. **Independência operacional** de fontes externas.  
8. **Evolução controlada:** auditar → planejar → autorizar → implementar → testar → gate.  
9. **Um contrato por capacidade** (ex.: um `searchCatalog`, um `place_order`, um `resolveVehicleIdentity`).  
10. **Não inventar** fitment, diagnóstico ou dados financeiros.  
11. **Modular monolith** até critério de extração.  
12. Feature nova só se: cabe na fase ativa + respeita SoT + não cria segundo canal.

Antes de mudar algo relevante, responder:

1. Qual problema?  
2. Qual fonte de verdade?  
3. Já existe?  
4. Impacto em outras áreas?  
5. Como validar que não quebramos o que funciona?

---

# 4. Domínios e capacidades

| Domínio | Capacidade MVP | Futuro |
|---------|----------------|--------|
| Catálogo | CRUD, imports, refs, imagens | Equivalências F12 |
| Fitment / INV | PVC + INV aditivo + placa | Generations, engines ricos |
| Garage | Seed veículos | Histórico, TO, despesas, docs |
| Preço | Listas, resolve, promo gate | Formação avançada |
| Estoque | Saldo, modos, movimentos | WMS |
| Compra | Cart, checkout, endereço | Guest pleno, boleto |
| Pagamento | Híbrido MP/Asaas | Split Parceiros |
| Frete | ME + own + packing | Multi-carrier pleno |
| Pedidos | Lifecycle admin/cliente | Serviços + peças |
| Atendimento | Inbox + legais + cancel | Omnichannel WA |
| Parceiros | — | Marketplace |
| Workshop | — | OS / agenda |
| Fornecedores | Cadastro/import interno | Portal B2B |
| Intelligence | INV, notif, Edges | IA agentic |

---

# 5. Fontes de verdade

Resumo; detalhe em [FAL_DADOS_FONTES_VERDADE.md](../arquitetura/FAL_DADOS_FONTES_VERDADE.md).

| Domínio | Fonte |
|---------|-------|
| Produto | `products` |
| Custo | `supplier_products.cost` |
| Preço | `resolve_product_price(s)` |
| Estoque | `inventory` |
| Pedido | `orders` / `order_items` via `place_order` |
| Fitment | PVC |
| Identidade veículo | manufacturers / models / vehicle_versions |
| Garagem seed | `customer_vehicles` |
| Pagamento | `payments` + Edges |
| Frete | `shipping_quotes` / `shipments` |

---

# 6. Regras comerciais atuais (travadas)

### 6.1 INV

- Camada **aditiva**; não substitui mestre/PVC.  
- Identidade ≠ configuração técnica completa ≠ fitment.  
- Ambíguo/incerto não navega sozinho nem grava garagem sem confirmação.

### 6.2 Pagamentos (alvo híbrido)

| Método | Regra |
|--------|-------|
| PIX ≤ R$ 201 | Mercado Pago |
| PIX > R$ 201 | Asaas |
| Cartão | Asaas |
| Boleto | Asaas (roteado; **fora do checkout MVP** até decisão) |

Admin controla métodos/provedores. Webhooks + sync + idempotência obrigatórios.

### 6.3 Frete

- Cotação do **carrinho como conjunto**.  
- Packing físico ≠ POL.  
- Controlar volumes, caixas, dims, pesos, valor, modalidades, prazos, rastreio.  
- Frete próprio na PDP e checkout quando aplicável.  
- Mock não é shippable.

### 6.4 Preço e estoque

- Preço único card → PDP → cart → checkout → pedido.  
- Estoque e modo de loja consistentes; não vender sem regra clara.

### 6.5 Parceiros / split

Pagamento único peças+mão de obra = **FUTURO** após análise jurídica/tributária/financeira. **Não** implementar split agora.

### 6.6 WhatsApp

Canal da FAL (não sistema paralelo). MVP: inbox app + atendimento humano. WA agentic = futuro.

---

# 7. Jornadas ponta a ponta

Detalhe em [FAL_MVP_MAPA_TELAS_JORNADAS.md](../planejamento/FAL_MVP_MAPA_TELAS_JORNADAS.md).

| Jornada | Objetivo MVP |
|---------|--------------|
| Descoberta | Achar peça certa com veículo/contexto |
| Compra | Checkout confiável |
| Pagamento | Cobrança correta sem duplicar |
| Processamento | Análise/separação |
| Entrega | Despacho + rastreio |
| Pós-venda | Cancel/confirm + canal; RMA mínimo |
| Admin | Operar catálogo/estoque/pedidos/pay/frete |
| Atendimento | Inbox + resposta |

---

# 8. Estado atual comprovado (2026-11-16)

Síntese da auditoria consolidada:

| Área | Estado |
|------|--------|
| Loja + admin rotas | CONCLUÍDO (código) |
| Busca + NL + placa | PARCIAL / EM VALIDAÇÃO |
| Pedidos lifecycle | PARCIAL (flui; ops humana) |
| Pay híbrido | PARCIAL (código; WT/ops) |
| Frete | PARCIAL |
| Garage seed | CONCLUÍDO (código) |
| Parceiros/Workshop | FUTURO (inexistente) |
| G8 venda plena | NÃO — gates humanos |

---

# 9. MVP completo aprovado

**Definição:** FAL Commerce operacional até **G8** + **semente FAL Garage**.

**Done:** compra real → pagamento → separação → despacho → entrega → atendimento → margem contabilizada, com veículo no funil quando o cliente tiver carro salvo.

Escopo detalhado: [FAL_MVP_COMPLETO_4.0.md](../planejamento/FAL_MVP_COMPLETO_4.0.md)  
**Passos de execução (canônico):** [FAL_MVP_PLANO_CONSOLIDACAO.md](../planejamento/FAL_MVP_PLANO_CONSOLIDACAO.md) — P0–G7 **PASS**; frente aberta **G8** (§11 / VAL G8).

**Fora do MVP:** Garage rica, Parceiros, Workshop, Fornecedores portal, boleto checkout, WA agentic, app nativo, manutenção preditiva, split.  
**Regra:** nenhuma MARCHA de ecossistema até G8 PASS.

---

# 10. Requisitos

### Funcionais (MVP)

- RF01 Catálogo published com preço resolvido e disponibilidade coerente  
- RF02 Busca por texto, categoria, veículo (placa/manual/NL) no mesmo contrato  
- RF03 Compatibilidade compreensível no card/PDP  
- RF04 Carrinho e checkout com endereço, frete e pagamento  
- RF05 Pay híbrido conforme §6.2  
- RF06 Pedido criado só via `place_order`; status via RPCs  
- RF07 Admin separa, despacha, rastreia  
- RF08 Cliente acompanha pedido; cancel unpaid; confirm receipt  
- RF09 Garagem: listar/adicionar/primário/remover veículo  
- RF10 Inbox notificações cliente/staff  
- RF11 Páginas legais acessíveis  

### Não funcionais

- RNF01 Mobile-first loja  
- RNF02 Sem secrets no client  
- RNF03 Idempotência pay/pedido  
- RNF04 Degradação segura de integrações  
- RNF05 Observabilidade mínima de falhas críticas  
- RNF06 Testes automatizados nos núcleos pay/frete/INV tocados  

---

# 11. Segurança, privacidade, auditoria

- Auth Supabase; ProtectedRoute / StaffRoute  
- RLS + RPC como enforcement  
- LGPD: mínimos necessários; políticas publicadas  
- Auditoria de status/pagamentos/eventos  
- Backup antes de limpeza destrutiva  
- Operações sensíveis = gate admin  

---

# 12. Métricas

| Métrica | Uso |
|---------|-----|
| Taxa checkout → pago | G3 |
| Tempo análise → enviado | G5 |
| Zero-result busca / fitment miss | G1 |
| Chargebacks / duplicidade pay | G3 |
| Pedidos com rastreio | G4 |
| Margem por pedido | G5/G8 |
| NPS / tickets pós-venda | G6 |

---

# 13. Roadmap por maturidade

Ver [FAL_ROADMAP_MESTRE_4.0.md](../planejamento/FAL_ROADMAP_MESTRE_4.0.md). Fase ativa = estabilização → G8. Ambientes futuros = docs em `docs/futuro/`.

---

# 14. Decisões abertas (gates humanos)

| ID | Decisão | Bloqueia |
|----|--------|----------|
| D-ASAAS | Confirmar `asaas_enabled` e secrets em prod | G3 |
| D-DEPLOY-PAY | Alinhar WT pay (commit/deploy Edges+Netlify) | G3 |
| D-G3-SMOKE | Approve/recusa/duplicado reais | G3/G8 |
| D-G4-ME | Etiqueta purchase → ship | G4/G8 |
| D-G6-LEGAL | Textos jurídicos finais | G6 |
| D-G8 | Liberação venda controlada + crédito hosting | G8 |
| D-BOLETO | Incluir boleto no checkout ou adiar | Pós-MVP |
| D-GUEST | Compra sem login plena | Pós-MVP |
| D-SPLIT | Modelo Parceiros (jurídico) | Fase 3+ |

---

# 15. Glossário canônico

| Termo | Significado |
|-------|-------------|
| SKU | Identificador técnico FAL (`products.sku`) |
| Código referência | Exibição comercial (`commercial_ref`) |
| Fitment / PVC | Compatibilidade produto × versão |
| INV | Inteligência/normalização veicular (aditiva) |
| VehicleFilter | Params canônicos maker/model/year/engine/version |
| SoT | Fonte de verdade |
| place_order | Única criação de pedido |
| G8 | Gate de comercialização controlada |
| Seed Garage | Cadastro/seleção de veículos sem histórico rico |
| OS | Ordem de serviço (futuro Workshop) |
| MARCHA | Ciclo de execução com VAL |

---

# 16. Regra mestra

> **FAL = plataforma própria + operação própria + catálogo mestre próprio + arquitetura aberta a um ecossistema conectado — crescendo por maturidade, sem remendo e sem reconstrução desnecessária.**

Este PRD é a base consolidada 4.0. Detalhe de telas, consolidação e futuro vivem nos documentos apontados no cabeçalho.
