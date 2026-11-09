# Relatório MARCHA — posição Pacote MVP-1

**Data:** 2026-11-09 · ~13h  
**Auth:** eFe — `MARCHA RELATORIO DOQUE FIZEMOS OQUE FALTA ONDE ESTAMOS`  
**Plano canônico:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Deploy:** alterações de hoje **só no fim do dia**

---

## Veredito em 30s

| Camada | Situação |
|--------|----------|
| Planejamento MVP (M0) | **Fechado** — docs + auditoria + Pacote MVP-1 |
| Código MVP-1 hoje | **ENCERRADO** (8 fatias + hardening 014) |
| Onde estamos | Código do pacote fechado; **produção plena = gates humanos** |
| Próximo | Handoff pronto: [DEPLOY_PREP](./FAL_MARCHA_MVP1_DEPLOY_PREP_HANDOFF_2026-11-09.md) — publicar só com auth eFe |
| Bloqueio real de venda | Gates **humanos**: MP prod, frete/etiqueta, dados (apps/sinônimos/estoque), texto jurídico formal |

**Leitura direta:** o agente avançou o que dependia de código no MVP-1. O que falta para “loja vendendo de verdade” é metade código residual + metade operação (credenciais, homologação, massa de dados).

---

## 1. O que fizemos (hoje / esta sessão)

### Planejamento (antes do código)

- Consolidadas 3 specs oficiais (Comercial, Home, Placa) + Programa Prontidão MVP
- Matriz **001–034** (030 guest; 031–034 lacunas MVP)
- Auditoria M0 Frentes A–H + Pacote MVP-1
- Premissa travada: deploy das mudanças **só no fim do dia**

### Código — Pacote MVP-1 (fatias com VAL)

| Fatia | AJUSTE | Entrega | VAL |
|-------|--------|----------|-----|
| 1 | 029 · 021 · 022-E0/E2 | Home: Campanhas → veículo → Destaques; destaques híbridos + teto admin 24; auditoria contratos preço | [HOME_DESTAQUES](./FAL_MARCHA_MVP1_HOME_DESTAQUES_VAL_2026-11-09.md) |
| 2 | 002 · 003 | Troca veículo in-place nas apps; SearchBar erro + empty-state catálogo | [APPS_BUSCA](./FAL_MARCHA_MVP1_APPS_BUSCA_VAL_2026-11-09.md) |
| 3 | 031 · 015 | Lista separação A4 + romaneio; saldo/estoque no detalhe admin | [ESTOQUE_SEPARACAO](./FAL_MARCHA_MVP1_ESTOQUE_SEPARACAO_VAL_2026-11-09.md) |
| 4 | 016 · 017 | Troca Pix↔cartão cancela pending; Brick parcelas ↔ display; erros Edge PT | [PAGAMENTOS](./FAL_MARCHA_MVP1_PAGAMENTOS_VAL_2026-11-09.md) |
| 5 | 027 · 032 | Banner cookies; `/trocas-devolucoes`; aceite checkout + versão no cadastro; link pós-venda | [LEGAL_ATENDIMENTO](./FAL_MARCHA_MVP1_LEGAL_ATENDIMENTO_VAL_2026-11-09.md) |
| 6 | 030 | CPF opcional no cadastro; CTAs criar conta/entrar no carrinho; copy funil checkout | [GUEST_FRICCAO_030](./FAL_MARCHA_MVP1_GUEST_FRICCAO_030_VAL_2026-11-09.md) |
| 7 | 033 · 034 | Margem no pedido admin + KPIs no dashboard | [MARGEM_DASHBOARD](./FAL_MARCHA_MVP1_MARGEM_DASHBOARD_VAL_2026-11-09.md) |

### Pacote MVP-1 — score de itens

| # | Entrega | Estado |
|---|---------|--------|
| 1 | Auditoria/fonte preço (022-E0) | **Feito** (audit) |
| 2 | Home ordem + slot veículo (029) | **Feito** |
| 3 | Destaques híbridos (021) | **Feito** |
| 4 | Apps + busca (002/003) | **Feito** (código; dados = gate) |
| 5 | Checkout/MP smoke prod (016/017) | **Código melhorado**; smoke prod = **humano** |
| 6 | Frete + etiqueta (014) | **Código OK** (+ hardening); homolog = humano |
| 7 | Estoque/separação (031/015) | **Feito** (UI/print; operação contínua) |
| 8 | Legal + pós-venda (027/032) | **Feito** (mínimo; jurídico formal = humano) |
| 9 | Margem + painel (033/034) | **Feito** (custo atual; sem snapshot) |
| 10 | Guest / fricção (030) | **Feito** (mínimo; guest total adiado) |

---

## 2. O que falta

### Código do Pacote MVP-1

**Encerrado.** Restam só ops/smoke/publish (ver relatório de execução).

### Fora do código agora (gates humanos / dados)

| Gate | O que falta |
|------|-------------|
| G3 Pagamento | Credenciais MP TEST/PROD, webhook, smoke Pix+cartão; redeploy Edge |
| G4 Frete | Homolog Melhor Envio / frete próprio: cotação → etiqueta → rastreio |
| G1 Dados | Qualidade de apps veiculares; sinônimos de busca; estoque em massa |
| G6 Jurídico | Texto completo termos/privacidade/trocas (advogado); WhatsApp oficial + SLA |
| G7 | Suite E2E dos cenários oficiais + baseline 024/034 |
| G8 | Limpeza **001** + liberação controlada primeiras vendas |
| Deploy | Publicar o acumulado de **hoje** só no **fim do dia** |

### Explicitamente adiado (Evolução 1 — pós-G8)

019/020 wallets, 026 frete avançado, 005/008 marketing, 028 placa produção plena, kits, personalização Home profunda.

---

## 3. Onde estamos (mapa)

```
M0 planejamento ████████████ DONE
M1 Home/catálogo ████████████ código OK (dados ainda gate)
M2 pagamento     ████████████ código OK · smoke prod pendente
M3 estoque/frete ████████████ 031/033 OK · 014 homolog humana
M4 legal/monitor ████████████ 027/032/034 OK (mínimo)
M5 liberação     ░░░░░░░░░░░░ deploy · G8 / 001 / primeiras vendas
```

| Gate | Score agora | Comentário |
|------|-------------|------------|
| G1 Produto | Amarelo | Código ok; apps/sinônimos = dados |
| G2 Comercial | Amarelo→Verde código | Home/híbrido/preço auditados; promo plena adiada |
| G3 Compra | Amarelo | Funil + fixes MP; falta prod + 030 |
| G4 Logística | Amarelo/Vermelho | Homolog frete/etiqueta |
| G5 Operação | Amarelo | 031 UI/print entregue; rotina ops |
| G6 Segurança | Amarelo→melhor | Mínimo legal no ar; texto formal humano |
| G7 Estabilidade | Amarelo | Sem E2E oficial + 034 |
| G8 Produção | Vermelho | Só após G1–G7 + 001 |

**Posição resumida:** estamos **no meio do Pacote MVP-1 em código**, com **~7/10 itens do pacote** avançados (5 VAL + audit preço). Ainda **não** estamos em prontidão de produção plena.

---

## 4. Próximos passos sugeridos (ordem)

1. Continuar MARCHA: **030** (fricção guest) **ou** **033/034** (margem/dashboard)
2. Em paralelo (humano): smoke MP + redeploy Edge; checar `VITE_WHATSAPP_PHONE`
3. Fim do dia: **deploy único** do acumulado + redeploy `create-mp-payment`
4. Depois: 014 homolog + E2E → caminho G8

---

## 5. Docs-chave

| Doc | Uso |
|-----|-----|
| [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md) | Plano canônico |
| [FAL_AUDITORIA_PRONTIDAO_MVP_2026-11-09.md](./FAL_AUDITORIA_PRONTIDAO_MVP_2026-11-09.md) | M0 + Pacote MVP-1 |
| [FAL_MARCHA_RELATORIO_STATUS_2026-11-09_MVP.md](./FAL_MARCHA_RELATORIO_STATUS_2026-11-09_MVP.md) | Apontador curto |
| Este arquivo | Relatório de posição sob demanda |

**Assinatura:** Relatório posição MVP-1 · 2026-11-09.
