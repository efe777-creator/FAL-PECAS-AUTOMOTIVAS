# Roadmap de Fases — FAL Peças Automotivas 3.0

**Status:** Fonte oficial de execução  
**Data:** 2026-10-04 (gate documental F7 / F7A entregue)  
**PRD:** [../entrada/FAL_PRD_3.0.md](../entrada/FAL_PRD_3.0.md) (visão de produto; §16 antigo é substituído por este documento)  
**Stack:** Vite + React + TypeScript + Tailwind + Supabase

---

## Regra de gate

Não iniciar a implementação da fase **N+1** sem cumprir os critérios de saída da fase **N** (exceto shells UI já criados na Fase 1).

---

## Mapeamento PRD §16 (antigo) → roadmap novo

| PRD §16 | Roadmap novo |
|---------|--------------|
| 1. Planejamento | Absorvido (docs + este roadmap) |
| 2. Fundação técnica | **Fase 1** — Fundação e estrutura visual |
| 3. Catálogo | **Fases 2–3** — Arquitetura + catálogo real |
| 4. Loja | **Fases 4–5** — Busca + conta |
| 5. Checkout | **Fase 6** — E-commerce |
| 6. Administração | **Fases 7–8** — Operação + back office |
| 7. Testes e qualidade | **Fase 9** (+ parte da 10) |
| 8. Produção | **Fase 10** |

**MVP PRD (§15–17):** fases **2→8**.  
**Produção plena:** fases **9–10**.

---

## Status atual

| Fase | Nome | Status |
|------|------|--------|
| 1 | Fundação e estrutura visual | Concluída (~90%) |
| 2 | Arquitetura de Dados e Estrutura Funcional | Concluída (schema + services) |
| 3 | Catálogo e estrutura comercial real | Concluída (admin catálogo + dados reais) |
| 4 | Motor de busca | Concluída (RPC + searchCatalog + UI) |
| 4B | Painel admin (auditoria/polimento) | Concluída |
| 5 | Experiência do cliente | Concluída |
| 6 | E-commerce | Concluída (checkout auth + frete mock + pagamento simulado) |
| 6B | Listas de preços | Concluída |
| 6C | Endereços, CEP e motor de frete | Concluída |
| 6D | Ciclo completo do pedido (especificação) | Concluída (docs) |
| 7 | Operação do pedido (master) | Gate documental concluído — [spec](./ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md) · [execução](./EXECUCAO_FASE7.md) · [auditoria](./AUDITORIA_FASE7_2026-10-04.md) |
| 7A | Fundação do ciclo de pedidos | Concluída — [EXECUCAO_FASE7A](./EXECUCAO_FASE7A.md) |
| 7B | Recepção e confirmação pela FAL | **Próximo gate de código** |
| 7C–7F | Separação → entrega → estoque operacional | Contratos registrados; sem schema/UI ainda |
| 8–10 | Backoffice / integrações / go-live | Pendentes |

---

## Fase 1 — Fundação e estrutura visual

**Pergunta:** Como o usuário enxerga e navega pela FAL?

**Escopo:** identidade, layout, Header/Footer/nav, responsividade, componentes, telas-base, Auth inicial, estrutura React.

**Fora:** schema DB, catálogo real, checkout real, admin.

**Critérios de saída:** app navegável mobile-first; Auth e-mail/senha; carrinho local; rotas da loja.

---

## Fase 2 — Arquitetura de Dados e Estrutura Funcional

**Pergunta:** Como o sistema será estruturado por dentro?

**Escopo:** schema Postgres + RLS; categorias administráveis; relações produto/aplicação/referência/imagem; veículos; clientes; contratos tela↔dados; services lendo o banco (seed mínimo).

**Fora:** catálogo comercial massivo; busca avançada; checkout; admin UI.

**Critérios de saída:** ver [ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md](./ESPECIFICACAO_FASE2_ARQUITETURA_DADOS.md).

---

## Fase 3 — Catálogo e estrutura comercial real

**Pergunta:** Como colocamos o conteúdo real nessa estrutura?

**Escopo:** categorias/montadoras/modelos reais; referências; fabricantes; fornecedores; aplicações; imagens; atributos; disponibilidade; **backoffice de catálogo** (`/admin` — adianta parte da Fase 8 só para catálogo).

**Fora:** checkout, pedidos completos, importador complexo, busca por placa, pagamento/frete.

**Spec:** [ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md](./ESPECIFICACAO_FASE3_CATALOGO_COMERCIAL.md)  
**Execução:** [EXECUCAO_FASE3.md](./EXECUCAO_FASE3.md)  
**Auditoria:** [AUDITORIA_FASE3_2026-10-03.md](./AUDITORIA_FASE3_2026-10-03.md) — **APROVADA**.

**Antecipação:** backoffice de **catálogo** da Fase 8 foi entregue na Fase 3. Vendas/estoque/relatórios admin permanecem na F8.

**Critérios de saída:** cumpridos (CA-01…CA-26) — ver auditoria.

---

## Fase 4 — Motor de busca

**Pergunta:** Como o cliente encontra o que procura?

**Escopo:** texto, código, referência, categoria, fabricante, veículo (filtros parciais/combinados), ordenação, paginação, relevância.

**Spec:** [ESPECIFICACAO_FASE4_MOTOR_BUSCA.md](./ESPECIFICACAO_FASE4_MOTOR_BUSCA.md)  
**Execução:** [EXECUCAO_FASE4.md](./EXECUCAO_FASE4.md)  
**Auditoria:** [AUDITORIA_FASE4_2026-10-03.md](./AUDITORIA_FASE4_2026-10-03.md) — **APROVADA**.

**Critérios de saída:** cumpridos — “Pivô Palio”, “Nakata PVI1032”, Fiat→Palio→2015, 1.0≠1.4, paginação Carregar mais.

---

## Fase 4B — Painel admin (auditoria e polimento)

**Pergunta:** O painel `/admin` está completo o suficiente para operar o catálogo?

**Escopo:** entrada staff na Conta/Header; veículos editar/status; arquivar com confirmação; labels PT. Sem novo painel; sem F5–F8.

**Spec:** [ESPECIFICACAO_FASE4B_ADMIN.md](./ESPECIFICACAO_FASE4B_ADMIN.md)  
**Execução:** [EXECUCAO_FASE4B.md](./EXECUCAO_FASE4B.md)  
**Auditoria:** [AUDITORIA_FASE4B_2026-10-03.md](./AUDITORIA_FASE4B_2026-10-03.md) — **APROVADA**.

---

## Fase 5 — Experiência do cliente

**Pergunta:** Como o cliente se identifica e mantém seus dados?

**Escopo:** cadastro/login/recuperação, perfil, CPF/CNPJ, telefone, endereços, veículos salvos, favoritos, histórico/pedidos (consulta).

**Spec:** [ESPECIFICACAO_FASE5_CLIENTE.md](./ESPECIFICACAO_FASE5_CLIENTE.md)  
**Execução:** [EXECUCAO_FASE5.md](./EXECUCAO_FASE5.md)  
**Auditoria:** [AUDITORIA_FASE5_2026-10-03.md](./AUDITORIA_FASE5_2026-10-03.md) — **APROVADA**.

**Critérios de saída:** cumpridos — conta sob RLS; role travada; sem checkout.

---

## Fase 6 — E-commerce funcionando

**Pergunta:** Como ele efetivamente compra?

**Escopo:** Carrinho → Identificação → CPF/CNPJ → Endereço → Entrega → Pagamento → Revisão → Pedido; carrinho persistente (auth); checkout **somente logado**; cotação de frete via contrato interno + provider **mock**; pagamento **simulado**; `place_order` atômico (recálculo server-side, reserva, idempotência, snapshots); erros.

**Spec:** [ESPECIFICACAO_FASE6_ECOMMERCE.md](./ESPECIFICACAO_FASE6_ECOMMERCE.md)  
**Execução:** [EXECUCAO_FASE6.md](./EXECUCAO_FASE6.md)  
**Auditoria:** [AUDITORIA_FASE6_2026-10-03.md](./AUDITORIA_FASE6_2026-10-03.md) — **APROVADA**.

**Fora:** go-live público; **guest checkout** (adiado); gateway real; APIs reais de frete/transportadora.

**Critérios de saída:** cumpridos — compra ponta a ponta em ambiente de teste; adapters de frete/pagamento isolados para troca na F9.

---

## Fase 6B — Listas de preços e precificação comercial

**Pergunta:** Qual é o preço aplicável deste produto neste contexto comercial?

**Escopo:** `price_lists` / `price_list_items`; Lista Base + Promocional; migração a partir de `products.price`/`promo_price`; `resolve_product_price`; admin `/admin/precos`; importação CSV/XLSX com preview; histórico; integração catálogo + ajuste mínimo em `place_order` (preservar F6); ganchos para cliente/grupo→lista no futuro.

**Spec:** [ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](./ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md)  
**Execução:** [EXECUCAO_FASE6B.md](./EXECUCAO_FASE6B.md)  
**Auditoria:** [AUDITORIA_FASE6B_2026-10-03.md](./AUDITORIA_FASE6B_2026-10-03.md) — **APROVADA**.

**Fora:** cupons/CRM/descontos complexos; segmentação completa B2B; reconstruir checkout; importador genérico de catálogo (permanece F8).

**Critérios de saída:** preço resolvido por lista; importação segura; F6 intacta (totais server-side, reserva, idempotência, snapshots).

---

## Fase 6C — Endereços, CEP e motor de frete

**Pergunta:** Como o cliente informa o destino e obtém frete rápido, com arquitetura pronta para carriers reais?

**Escopo:** `CepProvider` (ViaCEP) + form CEP-first; campo `reference`; endereço inline no checkout; `FreightService` (cache/debounce) sobre `ShippingProvider` mock; peso/dims opcionais; origem FAL admin simples; stubs futuros Correios/Frenet/Carrier; preservar `place_order` e F6/F6B.

**Spec:** [ESPECIFICACAO_FASE6C_ENDERECOS_FRETE.md](./ESPECIFICACAO_FASE6C_ENDERECOS_FRETE.md)  
**Execução:** [EXECUCAO_FASE6C.md](./EXECUCAO_FASE6C.md)  
**Auditoria:** [AUDITORIA_FASE6C_2026-10-03.md](./AUDITORIA_FASE6C_2026-10-03.md) — **APROVADA**.

**Fora:** integrações comerciais reais de frete (F9); guest; gateway; reconstruir checkout.

**Critérios de saída:** CEP autofill; endereço no checkout; cotação rápida; mock abstraído; F6/F6B intactas.

---

## Fase 6D — Ciclo completo do pedido (especificação)

**Pergunta:** Qual é a única fonte de verdade do ciclo pós-pagamento (status, eventos, projeção cliente, confirmação, estoque conceitual)?

**Escopo:** documentação apenas — máquina de estados interna vs timeline cliente; eventos append-only; confirmação por item; indisponibilidade sem cancelamento automático (operador altera prazo ou cancela controlado); contratos futuros; gates F7A–F7F. **Sem** Dashboard, RPCs, migrations aplicadas ou alteração de `place_order`.

**Spec:** [ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md](./ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md)  
**Execução:** [EXECUCAO_FASE6D.md](./EXECUCAO_FASE6D.md)

**Fora:** implementação operacional; aceite do cliente à ressalva; notificações; APIs reais.

**Critérios de saída:** modelo consumível por site/admin/app sem regras divergentes; F7A tem gate claro.

---

## Fase 7 — Operação completa do pedido (master)

**Pergunta:** Como a FAL opera o pedido pago até entrega, com estoque consistente?

**Spec:** [ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md](./ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md)  
**Execução:** [EXECUCAO_FASE7.md](./EXECUCAO_FASE7.md)  
**Auditoria:** [AUDITORIA_FASE7_2026-10-04.md](./AUDITORIA_FASE7_2026-10-04.md) — **APROVADA** (gate documental).

**Base de construção:** `order_events` → `transition_order_status` → projeção timeline → UI admin.

**Permissões (roles existentes):** operar/confirmar/avançar = `operador`+`gerente`+`administrador`; cancelar = `gerente`+`administrador`; cliente **nunca** altera status.

**Lacuna F7A registrada (não corrigir escondido):** cancel via `transition_order_status` **não** libera reserva → requisito **F7F**.

**Fora do master neste momento:** implementar `/admin/pedidos` ou schema F7B–F7F antes do gate F7B.

---

## Fase 7A — Fundação do ciclo de pedidos

**Escopo:** evoluir status/transições; `order_events`; timeline cliente; RPC `transition_order_status`; Comprar novamente; sessão persistente.

**Execução:** [EXECUCAO_FASE7A.md](./EXECUCAO_FASE7A.md) — **concluída** (remoto + frontend).

**Gate:** histórico consistente + timeline correta + recompra funcional — **cumprido**.

---

## Fase 7B — Recepção e confirmação pela FAL

**Status:** próximo gate de **código** (após gate documental F7).

**Escopo:** substituir placeholder `/admin/pedidos`; fila + filtros + detalhe; disponibilidade por item (`disponivel` \| `disponivel_com_prazo` \| `indisponivel`); ressalva / `aguardando_*`; cancel controlado (gerente+); contadores reais no dashboard; cliente só vê projeção.

**Construir sobre:** `order_events` → `transition_order_status` → timeline → operação administrativa.

**Não neste gate:** separação, expedição, baixa de estoque, APIs externas.

**Gate de saída:** FAL recebe pedido pago → analisa por item → confirma / ressalva / encaminha decisão / cancela controlado.

---

## Fase 7C — Separação

**Escopo:** fila `confirmado` → `em_separacao`; checklist por item; conclusão → `pronto_para_envio` + evento.

**Gate:** pedido confirmado separado e marcado pronto para envio.

---

## Fase 7D — Expedição

**Escopo:** evoluir `shipments` (carrier/service/tracking); `pronto_para_envio` → `enviado`; sem API real de transportadora.

**Gate:** pedido sai da FAL como enviado.

---

## Fase 7E — Entrega e encerramento

**Escopo:** `enviado` → `entregue`; prova/método (contrato); timeline final cliente.

**Gate:** ciclo Pedido → Pagamento → FAL → Confirmação → Separação → Envio → Entrega.

---

## Fase 7F — Estoque operacional

**Escopo:** reserva (já em `place_order`) → baixa na operação; **liberar reserva no cancel staff** (corrige lacuna F7A); divergência; concorrência; auditoria de movimentos.

**Gate:** estoque e pedidos consistentes; cancel não deixa reserva órfã.

---

## Fase 8 — Back Office e Operação Administrativa

**Pergunta:** Como a equipe administra sem depender de código?

**Escopo:** CRUD produtos/categorias/veículos/referências/estoque/pedidos/clientes; importação Excel/CSV de **catálogo** (upload→validação→prévia→upsert→relatório). *(Importação de **preços por lista** antecipada na Fase 6B.)*

**Critérios de saída:** operação diária possível via painel + importação.

---

## Fase 9 — Integrações + qualidade

**Pergunta:** Como conectamos externos e endurecemos o sistema?

**Escopo:** **gateway real de pagamento** e **APIs/provedores de frete/transportadoras** (substituem adapters mock/simulado da F6 sem redesenhar o checkout); HF; analytics; SEO; segurança; performance; a11y; testes automatizados; monitoramento.

**Critérios de saída:** integrações críticas plugadas nos contratos FAL da F6; suíte mínima de testes; observabilidade básica.

---

## Fase 10 — Teste real + entrada em operação

**Pergunta:** O sistema está pronto para operar?

**Escopo:** UAT caminho feliz + erros; produção; domínio; SSL; backups; logs; contingência; pedidos reais iniciais.

**Critérios de saída:** checklist MVP §17 validado em produção controlada.
