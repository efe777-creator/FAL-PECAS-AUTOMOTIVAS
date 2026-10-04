# UX — FAL Peças Automotivas 3.0

**Status:** Fonte de verdade (Fase 1.5)  
**Fontes:** PRD, protótipo HTML 3.3/3.5, implementação Fase 1

---

## 1. Princípios

- Mobile-first
- Objetivo: **encontrar a peça certa para o veículo**
- Três caminhos: busca textual, categoria, veículo
- Clareza > densidade
- Feedback em toda ação assíncrona (loading / sucesso / erro / vazio)
- WhatsApp é canal excepcional, não o fluxo principal de venda (PRD)

---

## 2. Navegação

### Desktop

- Topbar informativa
- Header sticky: Logo | SearchBar | Conta / Pedidos / Carrinho
- Nav navy: categorias + CTA amarelo “Encontre peças para seu veículo”

### Mobile (≤900px)

- Actions/nav desktop ocultos
- **MobileNav** fixo inferior: Início | Buscar | Veículo | Carrinho | Conta
- `padding-bottom` para não cobrir conteúdo
- Drawer (`MobileDrawer`) reservado a painéis (ex.: filtros de catálogo futuros)

---

## 3. Fluxos

### Home (implementada)

Hero → VehicleSelector → Categorias → Destaques → Notice → Footer

### Busca

- Campo global: peça, código, aplicação, veículo
- Sugestões ao digitar; Enter → `/catalogo?q=`
- Fase atual: mocks; futuro: índice real

### Busca por veículo (regra crítica)

- Termo UI: **Montadora** (nunca “marca do carro”)
- Campos: Montadora, Modelo, Ano, Motor (+ Versão no futuro)
- **Nenhum campo obrigatório**
- Combinações válidas: qualquer subconjunto (só Montadora; Modelo+Ano; Ano sozinho; Motor sozinho; todos; etc.)
- Submit navega para catálogo com query params

### Catálogo

- Alvo: filtros, chips, ordenação, paginação, grid
- Fase atual: placeholder estruturado com chips de query

### Produto

- Alvo: galeria, preço, estoque/disponibilidade, compatibilidade estruturada, códigos, CTA carrinho
- Fase atual: página estrutural com mocks

### Carrinho

- Add / remove / qty / subtotal
- Frete “A calcular” até integração
- Persistência visitante: localStorage

### Checkout (alvo PRD)

Carrinho → Identificação → CPF/CNPJ quando aplicável → Endereço → Entrega → Pagamento → Revisão → Pedido  
Fase atual (F6): steps reais com frete mock e pagamento simulado.  
**F6C (planejado):** CEP com autofill; **+ Adicionar endereço** inline no checkout; cotação rápida com feedback de loading/erro.

### Conta

- Login / cadastro / recuperar senha (Supabase)
- Alvo: dados, endereços, pedidos, favoritos, veículos salvos, segurança
- Fase atual: hub conta F5 + pedidos F6
- **F6C (planejado):** formulário de endereço CEP-first (máscara, consulta, número obrigatório, complemento/referência opcionais)

### Pedidos

- Alvo: lista + detalhe + timeline de status
- Fase atual: empty state protegido

---

## 4. Estados de UI

| Estado | Componente |
|--------|------------|
| Loading | `Loading` |
| Vazio | `EmptyState` |
| Erro | `ErrorState` |
| Feedback curto | `Toast` |

Nunca deixar a página aparentemente travada.

---

## 5. Responsividade

| Breakpoint | Uso |
|------------|-----|
| &lt; 620px | Mobile estreito |
| 620–900px | Tablet / mobile largo |
| ≥ 900px | Desktop (nav superior) |

Container máx. ~1240px; tipografia fluida no hero.

---

## 6. Acessibilidade (mínimo)

- `alt` no logo e imagens de produto
- Labels em campos
- Contraste navy/amarelo do protótipo
- Foco visível em inputs
- Evitar depender só de cor para status

---

## 7. Pontos pendentes de UX

- Microcopy final do checkout e indisponibilidade
- Empty states de catálogo com recomendações
- Validação visual de logo no footer (fundo escuro)
- F6C: estados CEP (loading / não encontrado / provider offline) e frete (calculando / indisponível) em PT-BR
- F6C: ProductCard — remover badge absoluto de qty no carrinho (manter controle inferior)
- Acessibilidade WCAG formal (auditoria futura)
