# Auditoria geral — PRD 3.0 × situação real (estoque + operação comercial)

**Data:** 2026-10-04  
**Método:** inspeção de código + SQL/MCP (`wtbpwuiayednvlhvuhbh`) + smoke browser (`localhost:5173`)  
**Branch:** `plan`  
**Commits locais (sem push):** `85c786f` (F8 Fatia A + UX) · `6554ae4` (P0 modo + spec comercial)  
**Fontes oficiais:** [FAL_PRD_3.0.md](../entrada/FAL_PRD_3.0.md) · [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md) · [ESPECIFICACAO_FASE8_BACKOFFICE.md](./ESPECIFICACAO_FASE8_BACKOFFICE.md) · [ESPECIFICACAO_ESTOQUE_OPERACAO_COMERCIAL.md](./ESPECIFICACAO_ESTOQUE_OPERACAO_COMERCIAL.md) · [AUDITORIA_E2E_ESTOQUE_3_MODOS_2026-10-04.md](./AUDITORIA_E2E_ESTOQUE_3_MODOS_2026-10-04.md)

---

## 1. Veredito executivo

| Dimensão | Situação |
|----------|----------|
| **Roadmap técnico F1→F8 Fatia A** | **Fechado** com evidência (E2E 3 modos + P0 troca de modo) |
| **MVP PRD §15–17** | **Parcial** — falta sobretudo **importação de catálogo (RF12 / F8.1)** e decisões de produção (F9–F10) |
| **Operação comercial inicial (`sem_estoque`)** | **Infra OK**; **catálogo comercial real ainda insuficiente** (só 2 SKUs publicados de teste) |
| **Pronto para venda pública real?** | **Não** — pagamento/frete mock, catálogo seed, segurança grants `anon`, sem UAT produção |

**Frase-síntese:** o motor de loja + pedidos + estoque por modos está operacionalmente validado; o que falta para o PRD/MVP é carga comercial (produtos/import), integrações reais e endurecimento de qualidade/produção — não reabrir F7/F8 Fatia A.

---

## 2. Ambiente auditado agora

| Item | Evidência |
|------|-----------|
| Branch / tree | `plan` · working tree limpa · ahead of `origin/plan` by **2** |
| Modo loja (DB) | `sem_estoque` (`get_store_inventory_mode` + `store_settings`) |
| UI `/admin/estoque` | Label **Sem estoque**; saldo **—**; sem botão de ajuste; select + confirm inline |
| Smoke P0 desta sessão | `sem_estoque` → `estoque_ficticio` (OK, msg sucesso + colunas Qtd) → `sem_estoque` (restaurado) |
| Produtos | 34 total · **2 published** (TEST-001/002, ambos `is_incomplete=true`) · 32 archived |
| Pedidos | 6 (5 entregue, 1 cancelado) · snapshots: 4 `com_estoque`, 1 `estoque_ficticio`, 1 `sem_estoque` |
| TEST-001 | on_hand **16** · reserved **0** |
| Clientes UI | Fernando Felicio listado |
| Build último conhecido | PASS (`npm run build` no commit P0) |
| Push | **NÃO EXECUTADO** |

---

## 3. Mapa de fases (roadmap) × status

| Fase | Nome | Status oficial | Evidência desta auditoria |
|------|------|----------------|---------------------------|
| 1 | Fundação visual | Concluída (~90%) | App Vite/React navegável |
| 2 | Dados / RLS | Concluída | Schema Supabase + services |
| 3 | Catálogo comercial | Concluída | Admin catálogo; dados ainda seed/teste |
| 4 / 4B | Busca + admin polish | Concluída | Busca RPC + painel |
| 5 | Conta cliente | Concluída | Perfil/endereços/favoritos/pedidos |
| 6–6D | E-commerce + ciclo (docs) | Concluída | Checkout auth; frete mock; pagamento simulado |
| 7–7F | Operação pedido + estoque RPC | **Encerrada** | Ciclo Em análise→Entregue + reserve/fulfill |
| **8 Fatia A** | Estoque UI + modos + clientes + relatórios | **Implementada + E2E PASS + P0 fix** | Confirmado browser+SQL |
| **8.1** | Import catálogo | **Pendente** | Tabelas `imports`/`import_items` existem; UI/catálogo completo **não** |
| **9** | Integrações + qualidade | **Pendente** | Gateway/frete reais; testes; observabilidade |
| **10** | Go-live | **Pendente** | Produção controlada |

> Nota: o PRD §16 antigo (8 fases) foi **substituído** pelo roadmap 1–10. Avaliar MVP pelo roadmap + §15/17, não pelo §16 literal.

---

## 4. Comparativo PRD — requisitos funcionais (§5)

| RF | Requisito PRD | Situação | Nota |
|----|---------------|----------|------|
| 1 | Busca nome/SKU/código/marca/categoria | **OK** | F4 |
| 2–3 | Busca por veículo (filtros isolados/combinados) | **OK** | F4 |
| 4 | Compatibilidade estruturada no produto | **OK** | Modelo F2/F3 |
| 5 | Carrinho add/remove/qty | **OK** | F6 (reidratação qty ocasional — atrito P2) |
| 6 | Conta cadastro/login/recuperação | **OK** | F5 |
| 7 | Múltiplos endereços | **OK** | F5/F6C |
| 8 | Checkout ID→doc→endereço→entrega→pagamento | **OK (teste)** | Pagamento **simulado**; frete **mock** |
| 9 | Histórico de status do pedido | **OK** | Timeline F7 (+ labels operacionais) |
| 10 | Estoque saldo + movimentações | **OK condicional** | Real em `com_estoque`; N/A em `sem_estoque` (decisão comercial) |
| 11 | Admin cadastra/altera produtos | **OK** | F3 |
| 12 | Import Excel/CSV validação/preview/upsert SKU | **FALTA (MVP)** | = **F8.1**; import de **preços** já existe (6B) |
| 13 | Identifica produtos incompletos | **OK** | `is_incomplete` + filtro admin |
| 14 | Favoritos | **OK** | F5 |
| 15 | API para app futuro | **Parcial** | Supabase/RPC hoje; não Nest/OpenAPI do PRD §10 |

---

## 5. Comparativo PRD — regras de negócio (§6) e aceite MVP (§17)

| Item | Situação |
|------|----------|
| SKU único | OK |
| Produto sem imagem sinalizado | OK (`is_incomplete`; TEST-* marcados) |
| Alterações de estoque geram movimentos | OK via `adjust_inventory` / reserve / fulfill |
| Preço do item preservado no pedido | OK (snapshots F6) |
| WhatsApp não é fluxo principal | OK |
| Indisponibilidade com fluxo próprio | OK (F7B ressalva / `aguardando_*`) |
| Validações críticas no backend | OK (RPCs); stack diverge do Nest do PRD |
| **Aceite MVP — busca/veículo/carrinho/conta/checkout teste** | **PASS** (ambiente teste) |
| **Aceite MVP — admin produto/estoque** | **PASS** (com modos) |
| **Aceite MVP — importação valida/erros/não duplica** | **FAIL / pendente F8.1** |
| **Aceite MVP — mobile + desktop fluxos principais** | **PASS com ressalvas UX** (N1–N2, I1…) |
| Gateway / frete / storage / produção (§18) | **Abertos** → F9/F10 |

---

## 6. Estoque e modos — matriz de conformidade (F8 + spec comercial)

| Regra | Esperado | Evidência | Resultado |
|-------|----------|-----------|-----------|
| 3 modos configuráveis | `com_estoque` \| `estoque_ficticio` \| `sem_estoque` | UI select + DB enum | **PASS** |
| Snapshot no pedido | `inventory_mode_at_order` | Pedidos 412a… / 70f1… / 01e5… | **PASS** |
| Anti-retroatividade | Mudança de loja não altera pedido antigo | E2E Bloco F + smoke P0 | **PASS** |
| `com_estoque` ≈ F7 | reserve → fulfill/baixa | E2E §5 | **PASS** |
| Fictício / sem: sem reserve/baixa | 0 movimentos do pedido | E2E §6–7 | **PASS** |
| Troca de modo no browser | Confirm inline; erro real; reload UI | P0 `6554ae4` + reteste hoje | **PASS** |
| `sem_estoque` UI sem “0” enganoso | Saldo `—` | Browser CDP hoje | **PASS** |
| Ajuste só em `com_estoque` via RPC | Sem UPDATE direto inventory | UI oculta ajuste; RPC `adjust_inventory` | **PASS** |
| `sync_product_availability` só em `com_estoque` | Não zera `is_available` nos outros modos | Migration F8 | **PASS** |
| Loja operação inicial | `sem_estoque` | DB + UI restaurados nesta sessão | **PASS** |
| Balanço / import estoque | Só arquitetura | Spec comercial §9–10 | **N/A (não implementar)** |

### Smoke desta sessão (P0)

1. UI em Sem estoque · saldo `—` · sem ajuste  
2. Select → painel “Alterar modo para Estoque fictício?” · select permanece no modo persistido  
3. Confirmar → modo fictício · colunas Qtd/Reservado/Disponível · msg sucesso  
4. Voltar Sem estoque · msg “vendas usam disponibilidade comercial” · DB `sem_estoque`  

---

## 7. O que já temos (inventário consolidado)

### Loja / cliente
- Home, catálogo, busca, veículo, produto, carrinho  
- Conta (perfil, endereços, veículos, favoritos, pedidos + timeline)  
- Checkout autenticado ponta a ponta (frete mock + pagamento simulado)

### Operação
- Ciclo F7 completo (confirmação → separação → expedição → entrega)  
- Reserva/baixa/release em `com_estoque`  
- Indisponibilidade por item sem cancel automático  
- Admin pedidos com labels/chips

### Back office F8 Fatia A
- `/admin/estoque` com modos + movimentos + ajuste RPC  
- `/admin/clientes` consulta  
- `/admin/relatorios` mínimos  
- Catálogo admin (F3): produtos, categorias, marcas, veículos, fabricantes, fornecedores, listas de preço (+ import preços 6B)

### Documentação
- Specs/auditorias F2–F8, E2E 3 modos, UX, spec operação comercial  
- Entrada: PRD, DATABASE, API, UX, IMPORT (ainda “não implementado” para catálogo)

---

## 8. O que falta (priorizado)

### Bloqueadores de MVP PRD
1. **F8.1 — Importação de catálogo** (RF12 + aceite §17) — upload→validação→preview→upsert SKU→relatório  
2. **Catálogo comercial real** — hoje só TEST-001/002 published; 32 archived; ambos incompletos (sem imagem)  
3. **Disciplina `is_available`** — checklist “pode vender?” da spec comercial (processo + dados; não só código)

### Necessário para operação real (pós-MVP técnico)
4. **F9** — gateway pagamento real + frete/transportadora reais (substituir mocks)  
5. **F9** — suíte testes (unit/integration/E2E Playwright), a11y, performance, monitoramento  
6. **F10** — domínio, SSL, backups, UAT produção, pedidos reais iniciais  
7. **Higiene segurança grants** — várias RPCs `SECURITY DEFINER` ainda `EXECUTE` para `anon` (linter Supabase); funções checam auth/role, mas revoke `anon` é higiene F9  

### Arquitetura futura (não bloquear venda inicial em `sem_estoque`)
8. Balanço físico (contagem → `adjust_inventory`)  
9. Importação de **estoque** (≠ F8.1 catálogo)  
10. Contagem inicial → ativar `com_estoque`  
11. WMS / multi-depósito / lote / barcode / NF / compras — fora de escopo

### Usabilidade registrada (não P0 de regra)
- **N1** Footer “Entrar” logado  
- **N2** Empty state `/admin/clientes`  
- **N3** ~~Confirm inline modo~~ → **FEITO no P0**  
- **I1–I5** categorias mobile, textos, legal, Playwright, polish admin  

### Divergência de stack (aceita)
PRD §10 previa Next/Nest/Prisma; execução oficial é **Vite + React + Supabase**. Não tratar como gap de produto; documentado em alinhamento F1.

---

## 9. Critérios de saída F8 Fatia A (checklist revalidado)

| Critério (spec F8 §8) | Status |
|-----------------------|--------|
| Modo loja 3 estados | **OK** |
| Snapshot + anti-retro | **OK** (E2E) |
| Sem reserve/baixa em fictício/sem | **OK** (E2E) |
| UI estoque saldos/histórico/ajuste RPC | **OK** |
| UI clientes | **OK** (smoke hoje) |
| UI relatórios | **OK** (rota + auditoria F8) |
| Matriz permissões backend | **OK** (helpers F8; atendimento sem extras) |
| Placeholders removidos | **OK** |
| Sem import catálogo nesta fatia | **OK** (correto fora → F8.1) |

**Gate F8 Fatia A:** permanece **PASS**.

---

## 10. Riscos / achados desta auditoria

| Severidade | Achado | Impacto |
|------------|--------|---------|
| **Alto (MVP)** | Sem import catálogo | Não escala cadastro; critério PRD falha |
| **Alto (negócio)** | Catálogo só 2 SKUs teste / incompletos | Não há operação comercial real mesmo em `sem_estoque` |
| **Médio (sec)** | `EXECUTE` de RPCs sensíveis para `anon` | Chamada pública possível; funções rejeitam sem auth/role, mas superfície ampla |
| **Baixo (ops)** | Roadmap §status ainda diz “8–10 Pendentes” de forma genérica | Docs de status parcialmente defasados vs F8 concluída |
| **Baixo (UX)** | N1/N2/I* abertos | Atrito, não bloqueia regra de estoque |

---

## 11. Recomendação de próxima frente (uma por vez)

Ordem sugerida alinhada à spec comercial + PRD:

1. **Decisão humana:** push dos 2 commits locais (`85c786f`, `6554ae4`) — ou não  
2. **Operação comercial de dados:** curar produtos publicados + `is_available` (sem feature nova)  
3. **F8.1** import catálogo (fecha RF12/MVP)  
4. Só depois: Balanço / import estoque / `com_estoque` físico  
5. F9 integrações + higiene grants + testes  

**Não fazer agora:** reabrir F7/F8 Fatia A · redesign · WMS · push sem autorização.

---

## 12. Conclusão

Com evidência de código, banco e browser:

> A FAL 3.0 está **tecnicamente no gate pós-F8 Fatia A**, com modos de estoque corretos, anti-retroatividade validada e loja em **`sem_estoque`** para início comercial.  
> Frente ao **PRD/MVP**, o gap material é **importação de catálogo + catálogo comercial real + integrações de produção**.  
> Estoque físico completo (balanço/import/contagem) é **evolução planejada**, não pré-requisito da venda inicial.

---

## 13. Anexos — referências rápidas

- E2E 3 modos: [AUDITORIA_E2E_ESTOQUE_3_MODOS_2026-10-04.md](./AUDITORIA_E2E_ESTOQUE_3_MODOS_2026-10-04.md)  
- Spec comercial: [ESPECIFICACAO_ESTOQUE_OPERACAO_COMERCIAL.md](./ESPECIFICACAO_ESTOQUE_OPERACAO_COMERCIAL.md)  
- Spec F8: [ESPECIFICACAO_FASE8_BACKOFFICE.md](./ESPECIFICACAO_FASE8_BACKOFFICE.md)  
- UX: [AUDITORIA_UX_CLIENTE_OPERADOR_2026-10-04.md](./AUDITORIA_UX_CLIENTE_OPERADOR_2026-10-04.md)  
- Migrations modo: `20261004170000_fase8_inventory_modes.sql`, `20261004180000_*`, `20261004180100_*`  
