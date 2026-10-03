# Roadmap de Fases — FAL Peças Automotivas 3.0

**Status:** Fonte oficial de execução  
**Data:** 2026-10-03  
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
| 4–10 | — | Pendentes |

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

**Critérios de saída:** buscas do tipo “Pivô Palio”, “Nakata PVI1032” e Fiat→Palio→2015 retornam resultados corretos.

---

## Fase 5 — Experiência do cliente

**Pergunta:** Como o cliente se identifica e mantém seus dados?

**Escopo:** cadastro/login/recuperação, perfil, CPF/CNPJ, telefone, endereços, veículos salvos, favoritos, histórico/pedidos (consulta).

**Critérios de saída:** visitante vira cliente identificado com dados persistidos sob RLS.

---

## Fase 6 — E-commerce funcionando

**Pergunta:** Como ele efetivamente compra?

**Escopo:** Carrinho → Identificação → Endereço → Entrega → Pagamento → Revisão → Pedido; carrinho persistente; guest checkout; erros.

**Fora:** go-live público.

**Critérios de saída:** compra de ponta a ponta em ambiente de teste.

---

## Fase 7 — Operação interna

**Pergunta:** Como a FAL processa a compra internamente?

**Escopo:** status pós-pagamento, separação, conferência, envio, estoque/movimentações, indisponibilidade.

**Critérios de saída:** pedido flui do pagamento à entrega com histórico.

---

## Fase 8 — Back Office e Operação Administrativa

**Pergunta:** Como a equipe administra sem depender de código?

**Escopo:** CRUD produtos/categorias/veículos/referências/estoque/pedidos/clientes; importação Excel/CSV (upload→validação→prévia→upsert→relatório).

**Critérios de saída:** operação diária possível via painel + importação.

---

## Fase 9 — Integrações + qualidade

**Pergunta:** Como conectamos externos e endurecemos o sistema?

**Escopo:** gateway pagamento, frete, HF, analytics, SEO, segurança, performance, a11y, testes automatizados, monitoramento.

**Critérios de saída:** integrações críticas plugadas; suíte mínima de testes; observabilidade básica.

---

## Fase 10 — Teste real + entrada em operação

**Pergunta:** O sistema está pronto para operar?

**Escopo:** UAT caminho feliz + erros; produção; domínio; SSL; backups; logs; contingência; pedidos reais iniciais.

**Critérios de saída:** checklist MVP §17 validado em produção controlada.
