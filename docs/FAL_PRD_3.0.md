# FAL Peças Automotivas 3.0 — PRD

**Versão:** 1.0  
**Status:** Planejamento / Pré-desenvolvimento  
**Prioridade:** Mobile-first  
**Mercado inicial:** Brasil, com foco operacional inicial em São Paulo e Grande São Paulo  

## 1. Visão geral
A FAL 3.0 será uma plataforma própria de comércio eletrônico especializada em peças automotivas. O produto deve permitir encontrar e comprar a peça correta por busca textual, código e veículo, enquanto a operação interna gerencia catálogo, compatibilidade, estoque, pedidos, clientes e importações.

A FAL permanecerá independente da HF Comércio de Peças. A HF pode atuar como fonte de produtos/estoque, mas a FAL terá catálogo, regras comerciais, pedidos e controles próprios.

## 2. Objetivos
- Loja online própria e escalável.
- Busca por nome, código, categoria e veículo.
- Filtros de veículo parciais ou combinados.
- Catálogo preparado para grande volume.
- Cadastro manual e importação Excel/CSV.
- Controle de estoque e pedidos.
- Arquitetura preparada para integrações e aplicativo.

## 3. Princípios
- Mobile-first.
- Foco em "encontrar a peça certa para o veículo".
- FAL e HF operacionalmente independentes.
- API-first.
- Compatibilidade estruturada.
- Monólito modular no início.
- Lógica de negócio no backend.

## 4. Escopo funcional
### Loja
Home, busca, catálogo, categorias, produto, veículo, carrinho, checkout, conta e pedidos.

### Catálogo
Produtos, categorias, marcas, códigos, atributos e aplicações.

### Veículos
Montadora, modelo, ano, motor, versão e compatibilidade.

### Conta
Cadastro, login, recuperação de senha, endereços, pedidos, favoritos e veículos salvos.

### Operação
Estoque, movimentações, pedidos, pagamentos, entrega e importação.

### Admin
Dashboard, produtos, estoque, pedidos, clientes, veículos, compatibilidade, imagens e relatórios.

## 5. Requisitos funcionais principais
1. Busca por nome, SKU, código, marca, categoria e termos relacionados.
2. Busca por veículo usando Montadora, Modelo, Ano, Motor e Versão.
3. Qualquer filtro de veículo pode ser usado sozinho ou combinado.
4. Produto apresenta compatibilidade de forma estruturada.
5. Carrinho permite adicionar, remover e alterar quantidade.
6. Conta suporta cadastro, login e recuperação de senha.
7. Cliente pode manter múltiplos endereços.
8. Checkout suporta identificação, CPF/CNPJ quando aplicável, endereço, entrega e pagamento.
9. Pedido mantém histórico de status.
10. Estoque mantém saldo e movimentações.
11. Admin cadastra e altera produtos.
12. Importação Excel/CSV faz validação, preview e upsert por SKU.
13. Sistema identifica produtos incompletos.
14. Favoritos são suportados.
15. API deve permitir consumo futuro pelo aplicativo.

## 6. Regras de negócio
- SKU é identificador operacional único.
- Produto sem imagem pode existir, mas deve ser sinalizado no Admin.
- Alterações de estoque geram movimentações.
- Preço do item do pedido é preservado no histórico.
- WhatsApp é canal excepcional, não fluxo principal de venda.
- Indisponibilidade deve possuir fluxo próprio de confirmação/tratamento.
- Validações críticas devem existir no backend.

## 7. Catálogo e compatibilidade
Cada produto deve possuir identidade, dados comerciais, classificação, dados técnicos, aplicação, mídia, estoque e dados de busca/SEO.

A compatibilidade deve ser modelada como relação entre produto e veículo, e não como um único texto livre.

## 8. Checkout e pedidos
**Fluxo:** Carrinho → Identificação → CPF/CNPJ quando aplicável → Endereço → Entrega → Pagamento → Revisão → Pedido.

**Status de referência:** Pendente → Aguardando pagamento → Pagamento aprovado → Em separação → Preparando envio → Enviado → Entregue.

## 9. Importação
**Fluxo:** Upload → leitura → validação → preview → correção → confirmação → importação → relatório.

Erros críticos bloqueiam a linha. Avisos permitem importação e ficam registrados. SKU existente atualiza; SKU novo cria.

## 10. Arquitetura técnica
- Cursor
- TypeScript
- Next.js + React + App Router
- Tailwind CSS
- NestJS
- REST API
- Prisma
- SQLite no desenvolvimento
- PostgreSQL em produção
- Object Storage para imagens
- OpenAPI/Swagger
- Git/GitHub
- Vitest + Playwright
- React Native + Expo no futuro

### Estrutura prevista
```text
apps/web
apps/api
apps/admin
packages/ui
packages/types
packages/validation
database/prisma
database/migrations
docs/
```

## 11. Módulos da API
`auth`, `users`, `customers`, `addresses`, `products`, `categories`, `brands`, `vehicles`, `compatibility`, `search`, `inventory`, `carts`, `orders`, `payments`, `shipping`, `imports`, `media`, `favorites`, `notifications`, `admin`, `analytics`.

## 12. Segurança e LGPD
- Hash seguro de senhas.
- Autorização por função/permissão.
- Validação no backend.
- Proteção de endpoints administrativos.
- Logs de operações relevantes.
- Controle de acesso a dados pessoais.
- Minimização de dados.
- Segregação de secrets por ambiente.

## 13. Requisitos não funcionais
Performance, responsividade, escalabilidade, observabilidade, manutenibilidade, confiabilidade, acessibilidade e segurança devem ser tratados desde o MVP.

## 14. Testes
- Unitários para regras de negócio.
- Integração para API/banco.
- E2E para fluxos críticos.
- Testes responsivos.
- Testes de importação e casos-limite.

## 15. MVP
### Obrigatório
Home, busca, catálogo, busca por veículo, compatibilidade, produto, carrinho, cadastro/login, endereços, checkout, pedidos, admin de produtos/estoque/pedidos e importação CSV/Excel.

### Pós-MVP
Aplicativo mobile, busca por imagem, marketplace, B2B completo, fidelidade e integrações avançadas.

## 16. Fases
1. Planejamento.
2. Fundação técnica.
3. Catálogo.
4. Loja.
5. Checkout.
6. Administração.
7. Testes e qualidade.
8. Produção.

## 17. Critérios de aceite do MVP
- Busca funciona por produto e código.
- Filtros de veículo funcionam isoladamente ou combinados.
- Produto exibe preço, disponibilidade e compatibilidade.
- Carrinho funciona.
- Cadastro/login/recuperação funcionam.
- Múltiplos endereços funcionam.
- Checkout de teste gera pedido.
- Admin controla produto e estoque.
- Importação valida e informa erros/avisos.
- Importação não duplica SKU silenciosamente.
- Produtos incompletos são sinalizados.
- Fluxos principais funcionam em mobile e desktop.

## 18. Decisões ainda abertas
- Gateway de pagamento.
- Provedores de frete.
- Provedor de object storage.
- Infraestrutura de produção.
- Fonte dos dados de veículos.
- Interface de integração com HF.
- Requisitos fiscais específicos.

## 19. Próximos documentos
1. `ARCHITECTURE.md`
2. `DATABASE.md`
3. `API.md`
4. `UX.md`
5. `IMPORT.md`
6. Backlog técnico e critérios de aceite por história.

---

**Conclusão:** o objetivo central da FAL 3.0 é transformar a necessidade "preciso desta peça para este carro" em uma compra concluída de forma simples, rápida e confiável, enquanto a operação ganha uma base própria, estruturada e escalável.
