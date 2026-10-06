# Prompt mestre — Fase 8.1: Listas de Preços + Catálogo

**Uso:** copiar/colar (ou anexar) como instrução principal do Agent no Cursor **depois** da aprovação da documentação.  
**Data:** 2026-10-06  
**Specs:** [ESPECIFICACAO_FASE8_1_LISTAS_PRECOS_UX.md](./ESPECIFICACAO_FASE8_1_LISTAS_PRECOS_UX.md) · [BACKLOG_FASE8_1_CATALOGO_OPERACIONAL.md](./BACKLOG_FASE8_1_CATALOGO_OPERACIONAL.md) · [ESPECIFICACAO_FASE8_1_IMPORTACAO_CATALOGO.md](./ESPECIFICACAO_FASE8_1_IMPORTACAO_CATALOGO.md)

---

```text
PROJETO FAL PEÇAS AUTOMOTIVAS
FASE 8.1 — EVOLUÇÃO OPERACIONAL DE CATÁLOGO E LISTAS DE PREÇOS

OBJETIVO

Evoluir o módulo administrativo de produtos e listas de preços da FAL,
melhorando significativamente UX, importação, rastreabilidade, classificação
e operação em massa.

IMPORTANTE:
Não recriar a arquitetura existente.
Não criar tabelas paralelas.
Não alterar F7/F8/estoque/pedidos.
Não implementar tudo de uma vez.

ANTES DE ALTERAR QUALQUER ARQUIVO:

1. Inspecione o repositório.
2. Leia as páginas atuais.
3. Leia services.
4. Leia RPCs.
5. Leia migrations relevantes.
6. Leia testes.
7. Leia as especificações F8.1 (UX + backlog + importação catálogo).
8. Faça um diagnóstico do que já existe.
9. Liste gaps.
10. Só depois proponha alterações.

ARQUITETURA EXISTENTE

Reutilizar:

products
price_lists
price_list_items
imports
import_items
supplier_products
manufacturers
models
vehicle_versions
product_vehicle_compatibility
price_change_history

Não criar estruturas paralelas para preço.

Arquivos-base atuais (ponto de partida):

fal-pecas/src/pages/admin/prices/AdminPriceListsPage.tsx
fal-pecas/src/pages/admin/prices/AdminPriceListDetailPage.tsx
fal-pecas/src/services/admin/adminPriceListService.ts
fal-pecas/src/services/import/contracts.ts
fal-pecas/src/app/router.tsx

REGRAS INVIOLÁVEIS

1. Importação não publica produto.
2. Importação não define is_available=true automaticamente.
3. status, published e is_available não devem ser confundidos.
4. SKU é único.
5. Importação repetida deve ser idempotente.
6. Importação de preço nunca cria produto novo.
7. Produto inexistente deve aparecer no relatório de não encontrados.
8. price_origin deve permanecer: calculated | imported | manual
9. Preço manual/importado não pode ser sobrescrito silenciosamente por cálculo.
10. Recalcular só afeta itens calculated, salvo ação explícita do operador.
11. Compatibilidade veicular não pode ser inferida como definitiva.
12. Montadora sugerida não significa compatibilidade confirmada.
13. Não implementar código de fornecedor nesta rodada.
14. Não alterar place_order.
15. Não alterar motor F7/F8.
16. Não alterar estoque.
17. Não executar db push.
18. Não executar repair.
19. Não executar fetch.
20. Não fazer commit.
21. Não fazer push sem autorização explícita.

LAYOUT CANÔNICO DE CADASTRO (decisão eFe)

Importação de produtos/cadastro usa exatamente 4 colunas:

CODIGO | GRUPO | MONTADORA | DESCRICAO

Mapeamento:

CODIGO    → codigo_fal → products.sku (upsert)
DESCRICAO → descricao → products.name
GRUPO     → grupo → taxonomia/categoria (do arquivo; se vazio, regras sugerem)
MONTADORA → montadora_sugerida (metadado; NUNCA cria product_vehicle_compatibility)

Perfil HF padrão: "HF — Cadastro FAL (4 colunas)"

Esta grade NÃO importa preço, custo, fornecedor, estoque nem published.
Preço continua em fluxo separado (SKU + preço) no wizard de listas.

MONTADORA ≠ marca da peça (product_brands).
GRUPO ≠ subgrupo automático (subgrupo pode vir depois por regra/revisão).

OBJETIVO UX — LISTAS DE PREÇOS

Criar uma experiência administrativa clara:

/admin/precos

Página de Listas de Preços:

- cards de indicadores (ativas, total itens, com preço, sem preço);
- tabela de listas;
- criar lista;
- editar;
- ativar/inativar;
- excluir (com confirmação);
- duplicar;
- abrir lista.

Dentro da lista:

- resumo;
- configuração;
- produtos;
- formação;
- importação;
- exportação;
- histórico.

Abas sugeridas:

[Produtos] [Formação de preço] [Importações] [Configuração]

TELA DE PRODUTOS DA LISTA

Permitir:

- pesquisar SKU;
- pesquisar descrição;
- filtrar origem;
- filtrar com/sem preço;
- filtrar com/sem custo;
- filtrar marca;
- filtrar categoria;
- filtro Lista: selecionada = só aquela; vazia = todas as listas;
- selecionar página;
- selecionar todos os resultados filtrados;
- editar preço inline → origem manual;
- recalcular;
- voltar ao cálculo (com confirmação);
- exportar selecionados;
- remover da lista.

Custo continua vindo de supplier_products (sem estrutura paralela).
Preservar filtros e scroll após salvar preço.

IMPORTAÇÃO DE PREÇOS

Criar wizard:

1. Arquivo (CSV/XLSX, até 2.000 linhas)
2. Lista destino *
3. Modo
4. Mapeamento (+ perfil)
5. Regras
6. Preview
7. Confirmação
8. Processamento
9. Resultado

Modos:

- atualizar existentes;
- adicionar produtos existentes ausentes da lista;
- atualizar + adicionar;
- somente simular.

Nunca criar produto novo no catálogo no import de preço.

Preview obrigatório.
Nada deve ser gravado antes da confirmação (exceto status preview se já for o padrão).

Mostrar:

- atualizar;
- adicionar;
- sem alteração;
- erro;
- não encontrado.

Durante processamento:

- progresso real quando disponível;
- contadores;
- mensagem clara;
- não fechar tela.
- Se não houver progresso real: NÃO inventar porcentagem — usar "Processando… N de M".

Após processamento:

- resumo;
- erros;
- não encontrados;
- exportação do relatório.

HISTÓRICO

Mostrar:

- data;
- arquivo;
- perfil;
- operador;
- total;
- atualizados;
- adicionados;
- erros.

Permitir abrir detalhes (mapeamento, configuração, erros, não encontrados).
Usar imports / import_items (kind price_list).

PERFIS DE IMPORTAÇÃO

Permitir salvar mapeamento de colunas.

Exemplos:

HF — Lista de preços
  SKU → codigo_fal / sku
  PREÇO → preco / price

HF — Cadastro FAL (4 colunas)
  CODIGO → codigo_fal
  GRUPO → grupo
  MONTADORA → montadora_sugerida
  DESCRICAO → descricao

Detectar perfil automaticamente quando possível.

CATÁLOGO

Melhorar importação de produtos:

arquivo (4 colunas)
→ parsing
→ normalização
→ validação
→ anti-duplicidade
→ upsert
→ classificação (buracos/refino)
→ sugestões
→ revisão
→ produto pronto (draft)

NORMALIZAÇÃO

Preservar corretamente:

á ã é í ó õ ç ú

Corrigir problemas de encoding (mojibake: Ã© → é).
Não remover acentos válidos.

Tratar:

- BOM;
- caracteres de controle;
- espaços;
- aspas;
- delimitadores;
- quebras de linha.

CLASSIFICAÇÃO

Criar sistema auditável de regras FAL.

Exemplos:

PIVÔ → Suspensão / Pivô
TERMINAL → Direção / Terminal
BIELETA → Suspensão / Bieleta
BANDEJA → Suspensão / Bandeja
AMORTECEDOR → Suspensão / Amortecedor

Classificação deve possuir confiança:

Alta
Média
Baixa

Sugestões de baixa confiança não devem ser aplicadas automaticamente.
Se GRUPO veio no arquivo e for mapeável, priorizar o arquivo.

MONTADORA

Pode sugerir montadora com base na coluna do arquivo ou na descrição,
mas não pode criar compatibilidade definitiva.

Exemplo:

FOX → sugestão Volkswagen

Isso deve passar por revisão quando necessário.

PRODUTOS (admin catálogo — Gate N / P1)

Adicionar filtros avançados:

- código;
- descrição;
- status;
- marca;
- grupo;
- subgrupo;
- com preço;
- sem preço;
- com custo;
- sem custo;
- com imagem;
- sem imagem;
- completo;
- incompleto;
- disponível;
- indisponível.

Adicionar seleção em massa:

- página;
- resultados filtrados.

Ações:

- ativar;
- inativar;
- excluir;
- exportar.

Excluir sempre exige confirmação.

BUG PRIORITÁRIO (P0)

Investigar produtos importados que aparecem ativos no admin,
mas não aparecem corretamente no catálogo até serem desativados e ativados novamente.

Não mascarar o problema com workaround.
Encontrar a causa real do estado inconsistente entre status / is_available / published / filtros do catálogo.

ORIGEM DOS DADOS

Sempre que possível registrar origem:

- importação;
- HF;
- regra;
- sugestão;
- manual.

Isso deve permitir auditoria futura.

FASES (ordem fixa — uma por vez)

F8.1-I:
Redesign da visão geral das listas (/admin/precos).

F8.1-J:
Redesign do detalhe da lista (abas, produtos, formação, config).

F8.1-K:
Wizard completo de importação de preços (9 etapas).

F8.1-L:
Seleção e ações em massa.

F8.1-M:
Histórico e perfis.

F8.1-N:
Polimento + catálogo operacional (P0 → P1; P2 conforme aceite).

EXECUÇÃO

Uma fase por vez.

Para cada fase:

1. diagnóstico;
2. plano técnico;
3. implementação;
4. testes;
5. npm test;
6. npm run build;
7. revisão do diff;
8. relatório;
9. PARAR.

Não iniciar a próxima fase automaticamente.

Nunca assumir autorização para:

- migration apply / db push;
- repair;
- fetch;
- commit;
- push.

Se uma migration for necessária, apenas preparar e informar.

CRITÉRIOS DE QUALIDADE

Código simples.
UX intuitiva.
Feedback visual claro.
Estados de loading.
Estados vazios.
Estados de erro.
Confirmações destrutivas.
Mensagens úteis.
Sem dados fictícios.
Sem duplicação.
Sem regressão.

RESULTADO ESPERADO

O administrador deve conseguir:

1. criar uma lista;
2. configurar sua regra;
3. visualizar produtos;
4. filtrar;
5. pesquisar;
6. editar;
7. importar preços;
8. revisar antes de aplicar;
9. acompanhar progresso;
10. visualizar resultado;
11. consultar histórico;
12. reutilizar perfil;
13. exportar dados;
14. trabalhar em massa;
15. importar catálogo no layout CODIGO|GRUPO|MONTADORA|DESCRICAO;

sem precisar conhecer detalhes técnicos do banco ou das RPCs.

PRIMEIRO PASSO

NÃO IMPLEMENTE.

Faça somente a inspeção do estado atual e apresente:

- arquivos envolvidos;
- componentes existentes;
- RPCs;
- migrations;
- tabelas;
- fluxos atuais;
- funcionalidades já prontas;
- gaps;
- riscos;
- proposta da F8.1-I.

Aguarde autorização explícita para implementar F8.1-I.
```

---

## Notas de uso (humano)

1. Anexe também a [ESPECIFICACAO_FASE8_1_LISTAS_PRECOS_UX.md](./ESPECIFICACAO_FASE8_1_LISTAS_PRECOS_UX.md) e o [BACKLOG_FASE8_1_CATALOGO_OPERACIONAL.md](./BACKLOG_FASE8_1_CATALOGO_OPERACIONAL.md).  
2. Exija diagnóstico antes de qualquer PR/diff de código.  
3. Autorize **somente** o gate corrente (I, depois J, …).  
4. Não misture implementação de preços com inteligência de veículos.
