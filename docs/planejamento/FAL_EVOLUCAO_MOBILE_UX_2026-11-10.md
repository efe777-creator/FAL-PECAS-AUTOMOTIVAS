# Evolução MOBILE-UX — Inventário, auditoria e correções

**Data:** 2026-11-10  
**Auth:** eFe — plano Evolução mobile FAL  
**Diretriz:** app responsiva de verdade (loja + conta + admin); auditoria em código/telas antes de patches amplos.

---

## 1. Inventário de telas

### Públicas (MainLayout)

| Rota | Página | Notas mobile |
|------|--------|--------------|
| `/` | Home | Hero + seções; MobileNav |
| `/catalogo` | Catálogo | Filtros em MobileDrawer |
| `/produto/:slugOrId` | PDP | Frete/retirada compactos |
| `/veiculo` | Busca por placa/veículo | Mantida; atalho a partir da garagem |
| `/carrinho` | Carrinho | Bottom bar |
| `/checkout` | Checkout (auth) | Forms stack |
| `/termos` `/privacidade` `/trocas-devolucoes` | Legais | Tipografia simples |
| `/login` `/cadastro` `/recuperar-senha` `/redefinir-senha` | Auth | Guest redirect com `from` |

### Cliente (`/conta/*`, auth via ProtectedRoute)

| Rota | Página |
|------|--------|
| `/conta` | Resumo |
| `/conta/perfil` | Perfil |
| `/conta/enderecos` | Endereços |
| `/conta/veiculos` | **Meus carros** (garagem + CTAs consulta placa/catálogo) |
| `/conta/favoritos` | Favoritos |
| `/conta/pedidos` · `/conta/pedidos/:id` | Pedidos |

### Admin (`/admin/*`)

| Área | Rotas |
|------|-------|
| Shell | AdminLayout drawer mobile (menu ≥44px) |
| Catálogo | produtos (+ form/imports), aplicações, preços, importações, categorias, home da loja, montadoras, veículos (+ import), fabricantes, fornecedores |
| Vendas | pedidos (hub/áreas/detalhe), clientes |
| Operação | estoque, logística (origem/ME/próprio/caixas/config), pagamentos (hub/MP/webhooks), relatórios, operadores |

Prioridade rotina mobile (cards, não só shrink): **produtos, veículos (+ configs), pedidos, home/destaques**.

---

## 2. Matriz de auditoria (A–E)

Viewports: phone ~375, phone large, landscape, tablet ~768, notebook, desktop.  
Severidade: **C** Crítico · **I** Importante · **M** Melhoria.

| ID | Frente | Achado | Sev | Viewport | Status |
|----|--------|--------|-----|----------|--------|
| NAV-01 | A | Menu hamburger: “Buscar pelo carro” ≠ intenção Meus carros | C | phone | **Corrigido** → Meus carros `/conta/veiculos` |
| NAV-02 | A | Bottom bar “Veículo” → `/veiculo` desalinhado | C | phone | **Corrigido** → Meus carros |
| NAV-03 | A | Hit target menu 40×40 &lt; 44px | I | phone | **Corrigido** → 44×44 |
| NAV-04 | A | Hub garagem sem atalho explícito para placa/catálogo | I | phone | **Corrigido** CTAs |
| NAV-05 | A | Conta: pills horizontais — reforçar min-height | M | phone | **Corrigido** min-h-11 |
| NAV-06 | A | Footer / hub conta “Meus veículos” vs bottom bar | M | phone | **Corrigido** → Meus carros |
| DES-01 | B | ProductCard line-clamp / stack CTAs | — | phone | OK |
| DES-02 | B | Cookie banner acima do MobileNav | — | phone | OK |
| ADM-01 | C | Lista produtos só tabela scroll-x | C | phone | **Corrigido** cards `md:hidden` |
| ADM-02 | C | Lista veículos + configs só tabela | C | phone | **Corrigido** cards |
| ADM-03 | C | Pedidos lista densas | I | phone | **Corrigido** cards em AdminOrdersListPanel |
| ADM-04 | C | Home destaques só tabela | I | phone | **Corrigido** cards |
| ADM-05 | C | Drawer admin hit targets &lt; 44px | I | phone | **Corrigido** min-h-11 |
| ADM-06 | C | Forms admin longos: grid já sm:cols | I | — | Parcial OK; follow-up se VAL apontar |
| RES-01 | D | MainLayout padding-bottom safe-area | — | phone | OK |
| RES-02 | D | Catálogo: filtros em MobileDrawer | — | phone | OK |
| RES-03 | D | Tabelas admin: sem scroll-x forçado no phone (cards) | C | phone | **Corrigido** rotinas |
| PERF-01 | E | Bundle Vite code-split rotas | M | all | Monitorar LCP pós-publish |
| PERF-02 | E | Imagens lazy em cards | — | — | OK |
| A11Y-01 | E | aria-hidden em ícones bottom bar | M | phone | **Corrigido** |

---

## 3. Critérios de aprovação (checklist)

- [x] Navegação mobile Meus carros  
- [x] Área cliente hub garagem + consulta  
- [x] Admin listas rotina (produtos/veículos/pedidos/home) em cards no phone  
- [x] Smoke multi-viewport pós-publish eFe (VAL)  
- [x] CWV documentado no VAL (medir CrUX/PageSpeed na janela ops)

---

## 4. Fora / follow-up

- Redesign total; reescrever todo admin; imports densos (HF/xlsx) — adaptação fina sob demanda.  
- Evolução 1 MVP (kits/CRM) permanece pós-G8.
