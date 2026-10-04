# Auditoria E2E — 3 Modos de Estoque

**Data:** 2026-10-04  
**Método:** browser (`localhost:5173`) + SQL/MCP (`wtbpwuiayednvlhvuhbh`)  
**SKU âncora:** TEST-001 (Pivô Suspensão Palio 1.0 Fire) · `c6666666-6666-6666-6666-666666666001`

---

## 1. Objetivo

Fechar tecnicamente a **F8 Fatia A**: evidenciar que os três modos respeitam reserva/baixa/snapshot e que mudança de config da loja não altera pedidos antigos.

## 2. Baseline

| Item | Valor |
|------|--------|
| Branch | `plan` |
| Commit | `85c786ff8207f3257ae67aadfadd49ba0e2d2d50` |
| Mensagem | `feat(f8): fecha fatia A e usabilidade operacional de pedidos` |
| Build pré-E2E | PASS (`npm run build`) |
| Migration F8 | `20261004170000_fase8_inventory_modes.sql` (remoto já aplicado) |
| Push | **NÃO EXECUTADO** |

## 3. Ambiente

| Item | Valor |
|------|--------|
| Browser | Cursor IDE browser · desktop |
| Cliente / staff | Fernando Felicio · `efe.comercioltda@gmail.com` |
| Produto âncora | TEST-001 |

## 4. Estado inicial do estoque (antes do E2E)

| Campo | Valor |
|-------|------:|
| Modo loja | `com_estoque` |
| TEST-001 on_hand | 18 |
| TEST-001 reserved | 1 *(pedido aberto `d4c17483…`)* |
| TEST-001 available | 17 |
| Movimentos históricos TEST-001 | 5 |

## 5. Teste `com_estoque`

| Campo | Evidência |
|-------|-----------|
| Pedido | `412a6a2f-df53-435a-9dc4-108b8d0394fc` |
| Snapshot | `com_estoque` |
| Reserva | reserved 1→**2** (+1); movimento `reserve` qty 1 |
| Operação | Em análise → Confirmado → Separação → Pronto → Enviado → **Entregue** |
| Baixa | on_hand 18→**17**; reserved 2→**1**; movimento `out` / `order_shipped` qty 1 |
| Cliente | `/conta/pedidos/412a6a2f…` · timeline até Entregue · Comprar novamente |
| Resultado | **PASS** |

## 6. Teste `estoque_ficticio`

| Campo | Evidência |
|-------|-----------|
| Modo UI | “Estoque fictício” (settings atualizado; UI confirmou) |
| Pedido | `70f1456e-8f1b-4c3d-893f-1402da044305` |
| Snapshot | `estoque_ficticio` |
| Reserva | **NÃO** — reserved permaneceu 1; movimentos do pedido = **0** |
| Operação | Ciclo completo até **Entregue** |
| Baixa | on_hand/reserved **intactos** (17 / 1) após entrega |
| Cliente | Pedido criado e acompanhável |
| Resultado | **PASS** |

## 7. Teste `sem_estoque`

| Campo | Evidência |
|-------|-----------|
| Modo UI | “Sem estoque” |
| Pedido | `01e5ef9a-acdc-4b8c-b0c1-b6eb938baf80` |
| Snapshot | `sem_estoque` |
| Reserva / saldo | **NÃO** alterados — reserved 1; on_hand 17; movimentos = **0** |
| Operação | Ciclo completo até **Entregue** |
| Cliente | Pedido criado |
| Resultado | **PASS** |

## 8. Matriz consolidada

| Checagem | com_estoque | estoque_ficticio | sem_estoque |
|----------|-------------|------------------|-------------|
| Pedido criado | PASS | PASS | PASS |
| Snapshot correto | PASS | PASS | PASS |
| Reserva criada | SIM | NÃO | NÃO |
| `quantity_reserved` alterado | SIM | NÃO | NÃO |
| Movimento `reserve` | SIM | NÃO | NÃO |
| Operação até entregue | PASS | PASS | PASS |
| Fulfillment / baixa física | SIM | NÃO | NÃO |
| `quantity_on_hand` alterado | SIM | NÃO | NÃO |
| `quantity_reserved` reduzido no ship | SIM | NÃO | NÃO |
| Cliente vê timeline | PASS | PASS | PASS |

## 9. Anti-retroatividade

| Campo | Evidência |
|-------|-----------|
| Pedido antigo | `d4c17483-3d17-4fb8-9801-197b9fa26e0a` (em ciclo, snapshot `com_estoque`) |
| Loja alterada para | `estoque_ficticio` **antes** de concluir |
| Snapshot após conclusão | permanece `com_estoque` |
| Fulfill apesar do modo atual fictício | SIM — `out` TEST-001 qty 1 + TEST-002 qty 2 |
| Saldos | TEST-001 17/1→**16/0**; TEST-002 15/2→**13/0** |
| Resultado | **PASS** |

## 10. Bugs encontrados

**P0:** nenhum.

Observações operacionais (não P0):

- Troca de modo via `<select>` React + `window.confirm` falhou na automação (`Falha ao alterar modo`); modos foram aplicados via `store_settings` e **confirmados visualmente** na UI após reload.
- Carrinho autenticado ocasionalmente reidratava qty > 1; corrigido antes do place com qty 1.

## 11. Correções

Nenhuma. Patch P0 não necessário.

## 12. Build pós-teste

Sem alteração de código após o baseline → build pré-E2E permanece válido (PASS). Reteste de build não exigido.

## 13. Restauração

| Campo | Valor |
|-------|--------|
| `get_store_inventory_mode()` | `com_estoque` |
| UI `/admin/estoque` | **Com estoque (real)** |
| Confirmação | PASS |

## 14. Fila de usabilidade

### Necessário (não implementado nesta rodada)

- **N1** — Footer “Entrar” mesmo logado  
- **N2** — Empty state dedicado em `/admin/clientes`  
- **N3** — Troca de modo com confirmação inline (hoje `confirm` nativo; atrito na automação/admin)  
- **N4** — UI cliente para `aguardando_decisao` — **não evidenciado** neste E2E (nenhum pedido foi forçado a esse status)

### Ideal (não implementado)

- **I1** Categorias no header mobile  
- **I2** Remover texto técnico do produto  
- **I3** Privacidade/Termos reais  
- **I4** Suíte Playwright dos fluxos críticos  
- **I5** Polimento visual do admin  

## 15. Limites

- F8.1 fora · F9 fora · redesign fora · P2/P3 fora · **sem push**

## 16. Conclusão

Com evidência browser + banco:

> A F8 Fatia A está operacionalmente fechada: estoque real continua equivalente à F7; `estoque_ficticio` e `sem_estoque` não movimentam estoque físico; pedidos preservam o modo da criação; mudança de configuração da loja não altera retroativamente pedidos existentes.

## 17. Gate

**GATE F8 FATIA A: PASS**
