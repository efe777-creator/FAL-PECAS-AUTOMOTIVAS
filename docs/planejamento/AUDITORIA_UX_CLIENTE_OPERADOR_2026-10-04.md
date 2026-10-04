# Auditoria UX — Cliente + Operador

**Data:** 2026-10-04  
**Método:** testes reais browser (`localhost:5173`), desktop (~960–1280) e mobile (390×844)  
**Conta:** Fernando Felicio / staff (`efe.comercioltda@gmail.com`)

---

## 1. Resumo executivo

| Persona | Veredito |
|---------|----------|
| **Cliente** | Fluxo compra → checkout → pedido **funciona** e é compreensível. Pagamento simulado bem rotulado. Mobile tem bottom nav útil. |
| **Operador** | Ciclo completo confirmação→separação→envio→entrega **PASS** no pedido `55d4e224…`. Labels operacionais OK. |
| **Mobile** | Loja OK; conta empurra conteúdo abaixo do menu; admin drawer existe. |

**Bloqueadores P0:** nenhum nesta sessão.

---

## 2. Matriz de fluxos

### Cliente

| Fluxo | Viewport | Resultado | Evidência |
|-------|----------|-----------|-----------|
| Home + veículo | desktop | PASS | Seletor + CTAs “Selecionar veículo” / “Explorar catálogo” |
| Catálogo filtros/ordenação | desktop | PASS | selects cat/brand/sort/maker; produtos listados |
| Produto + add carrinho | desktop | PASS | “Adicionar” → stepper “No carrinho” |
| Carrinho qty/remover/CTA | desktop | PASS | “Ir para checkout”; frete “A calcular” |
| Checkout 5 passos | desktop | PASS | CPF → endereço → frete → “Pagamento (simulado)” → revisão |
| Pedido criado + timeline | desktop | PASS | `/conta/pedidos/55d4e224…` · Em confirmação · Comprar novamente |
| Home mobile + bottom nav | mobile | PASS | Nav “Início/Buscar/Veículo/Carrinho/Conta”; pad 56px |
| Categorias no header | mobile | PARCIAL | Categorias header **ocultas** (0 visíveis) — acesso via catálogo |
| Conta / detalhe pedido | mobile | PARCIAL | Menu da conta (grid 2 cols) **acima** do pedido — atrito |

### Operador

| Fluxo | Viewport | Resultado | Evidência |
|-------|----------|-----------|-----------|
| Detalhe operacional | desktop | PASS | Status “Em análise”; disponibilidade por item |
| Finalizar confirmação | desktop | PASS | → Confirmado |
| Separação + concluir | desktop | PASS | checkbox item |
| Expedir + entregar | desktop | PASS | Status final **Entregue** |
| Estoque UI | desktop | PASS | Modo “Com estoque (real)” |
| Pedidos mobile | mobile | PASS | chips + tabela `overflow-x: auto` |
| Ações com `confirm`/`prompt` | desktop | FAIL UX | Nativo do browser — pouco intuitivo / frágil |

---

## 3. Atritos priorizados

### P0 — Bloqueador
Nenhum.

### P1 — Alta (corrigir nesta rodada)

1. **Operador — confirmações nativas** em `AdminOrderDetailPage` (`window.confirm` / `window.prompt` no cancel).  
   Impacto: ações críticas pouco claras, sem contexto visual FAL, cancelamento via prompt pobre.  
   Ação: diálogos inline (motivo + confirmar/cancelar).

2. **Cliente mobile — menu da conta acima do conteúdo** (`AccountLayout`).  
   Impacto: em detalhe de pedido, usuário vê 8+ links antes do pedido.  
   Ação: nav compacta horizontal no mobile; conteúdo prioritário.

### P2 — Média (depois)

3. Footer sempre mostra link “Entrar” mesmo logado.  
4. Categorias do header só desktop (mitigado pelo bottom nav / catálogo).  
5. Empty state lista clientes se zero linhas (sem mensagem dedicada).  
6. `confirm` ao mudar modo de estoque (aceitável, melhorar depois).

### P3 — Baixa

7. Texto técnico no produto (“Dados via Supabase…”).  
8. Privacidade/Termos “em breve” no footer (mock consciente).

---

## 4. O que NÃO mexer

- Pagamento/frete mock (já rotulados como simulado)  
- Regras F7/F8 de estoque/pedido  
- Redesign / F8.1  

---

## 5. Correções desta rodada

1. Diálogos inline no detalhe admin do pedido (finalizar / separar / enviar / entregar / cancelar com motivo) — **aplicado**.  
2. `AccountLayout` mobile: navegação compacta horizontal (scroll) + conteúdo prioritário — **aplicado**.

## 6. Reteste + build

| Item | Viewport | Resultado | Evidência |
|------|----------|-----------|-----------|
| Confirmação inline admin | desktop → mobile | PASS | Pedido `d4c17483…` · clique em “Finalizar confirmação” → painel “Finalizar confirmação?” + Confirmar/Voltar (sem dialog nativo) |
| Nav conta compacta | mobile 390 | PASS | `/conta/pedidos` · `nav[aria-label=Menu da conta]` flex + `overflow-x-auto`; aside oculto; lista de pedidos logo abaixo |
| `npm run build` | — | PASS | `tsc -b && vite build` OK (188 modules) |

P0/P1 desta rodada encerrados. Sem push até autorização.
