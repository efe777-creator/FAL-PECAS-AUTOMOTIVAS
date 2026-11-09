# FAL — Auditoria de Prontidão MVP (M0)

**Data:** 2026-11-09  
**Tipo:** Auditoria de planejamento + evidência de código (readonly)  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Matriz:** [FAL_MATRIZ_AJUSTES_001_034_2026-11-09.md](./FAL_MATRIZ_AJUSTES_001_034_2026-11-09.md)  
**Status:** M0 CONSOLIDADA — Pacote MVP-1 proposto (aguarda aprovação eFe para código)

---

## 1. Método

Cruzamento de: (a) tip `main` / código `fal-pecas/`, (b) relatório final plano mestre 09/11, (c) specs Comercial + Home + Placa, (d) frentes A–H do Programa MVP.

**Não executado nesta auditoria:** cutover, migrations em wtbp, compras reais, limpeza 001.

---

## 2. Frentes A–H — diagnóstico

### A — Produto e catálogo | Parcial — bloqueia G1 se apps/dados fracos

| Item | Achado |
|------|--------|
| Cadastro produtos | Base admin existe |
| Apps veiculares (002) | CRUD anos; troca de versão = excluir+recriar |
| Busca (003) | RPC/search implementados; sinônimos = dado/flag |
| Placa (028) | **Não existe** UI/Edge; fallback = `VehicleSelector` |
| Infos categoria (025) | Medidas/logística; copy garantia comercial incompleta |
| Estoque UI | Validar bloqueio de compra sem saldo (liga 031) |
| Risco | Cliente compra peça incompatível se apps sujas |

**Bloqueadores G1:** qualidade das aplicações no banco; regra clara de indisponível; slot veículo na Home.

### B — Experiência comercial | Parcial — G2

| Item | Achado |
|------|--------|
| Home (029) | Ordem atual: banners → quick → **destaques** → veículo → ofertas → categorias (**≠** aprovado) |
| Campanhas (009) | Carousel + admin existem |
| Destaques (021) | Admin ok; **hard cap 12**; sem completar vagas |
| Promo (022) | Lista promocional / ofertas na Home; unificação preço/UI incompleta |
| Favoritos | Rota ok; imagens parciais |
| 005/026 | Fora do MVP |

**Bloqueadores G2:** preço único card→pedido; híbrido destaques se vitrine curta; reordenar Home.

### C — Compra e pagamento | Parcial — G3 crítico

| Item | Achado |
|------|--------|
| Checkout (016) | Funil auth/CPF no código |
| Pedidos (006/007) | Conta + detalhe implementados |
| 030 guest | Fricção ↓ (CPF opcional no cadastro + CTAs carrinho); checkout ainda exige login (`ProtectedRoute`) — guest total = evolução |
| 019/020 | Não existem — pós-MVP |
| MP produção | Gate operacional (não só tela) |

**Bloqueadores G3:** credenciais/webhooks produção; smoke aprovado/recusado/duplicado; fechar gaps 030 se fricção alta.

### D — Estoque / separação / expedição | Lacuna — G5

| Item | Achado |
|------|--------|
| 031 | Escopo **novo** formalizado; precisa auditar reserva/baixa já existentes no domínio de pedidos |
| 015 | Romaneio/ME no admin; lista separação completa incompleta |
| Risco | Vender sem estoque; pedido pago sem fluxo claro de separação |

**Bloqueadores G5:** mapa do fluxo estoque atual + gaps 031; impressão separação; status expedição.

### E — Frete | Parcial — G4

| Item | Achado |
|------|--------|
| 014 | Hubs frete próprio/ME no código; cutover/tarifas/etiqueta M7 = ops |
| 026 | Não existe — pós-MVP |

**Bloqueadores G4:** cotação contratável de ponta a ponta; etiqueta; rastreio.

### F — Administração | Parcial — G5/G7

Painéis de produtos, preços, pedidos, home, logística existem. **033** margem estimada no detalhe do pedido + **034** KPIs no dashboard entregues (MVP). Snapshot de custo e BI = evolução.

### G — Segurança / jurídico | Parcial — G6

| Item | Achado |
|------|--------|
| 027 | Rotas + banner cookies + versão no signUp/checkout (texto jurídico formal = gate humano) |
| 032 | `/trocas-devolucoes` + Footer + link no pedido; WhatsApp contextual; ticket formal = evolução |

### H — Desempenho | Parcial — G7

Lazy routes e alguns batch de imagem. Sem baseline CWV formal. 024 = baseline no MVP, não otimização infinita.

---

## 3. Gates — score preliminar

| Gate | Score | Nota |
|------|-------|------|
| G1 Produto | Amarelo | Código de catálogo ok; dados/apps e ordem Home pendentes |
| G2 Comercial | Amarelo | Preço/híbrido/promo unificados pendentes |
| G3 Compra | Amarelo | Funil existe; produção MP + 030 + E2E pendentes |
| G4 Logística | Amarelo/Vermelho | Depende homologação real frete/etiqueta |
| G5 Operação | Vermelho | **031** é o maior gap de prontidão |
| G6 Segurança | Amarelo | 027/032 incompletos |
| G7 Estabilidade | Amarelo | Sem suite E2E MVP + 034 |
| G8 Produção | Vermelho | Só após G1–G7 + 001 |

---

## 4. Pacote MVP-1 (proposto para aprovação)

Escopo **somente bloqueadores**; sem Evolução 1.

| # | Entrega | AJUSTE | Gate |
|---|---------|--------|------|
| 1 | Auditoria contratos preço + fonte única | 022-E0/E1 | G2 |
| 2 | Reordenar Home + slot veículo | 029 | G1–G2 |
| 3 | Hard cap/híbrido destaques | 021+022-E2 | G2 |
| 4 | Apps editáveis + smoke busca | 002, 003 | G1 |
| 5 | Checkout/MP produção smoke | 016, 017 | G3 |
| 6 | Frete contratável + etiqueta | 014 | G4 |
| 7 | Estoque/separação/impressão | **031**, 015 | G5 |
| 8 | Legal mínimo + canal pós-venda | 027, **032** | G6 |
| 9 | Margem pedido + painel status | **033**, **034** | G5–G7 |
| 10 | Reduzir fricção cadastro/checkout | 030 | G3 |

**Fora do Pacote MVP-1:** 004, 005, 008, 019, 020, 026, 028 produção plena, kits, 001 (vai no M5).

---

## 5. Decisão MVP-lite placa

G1 **não** espera fornecedor pago. Home: Campanhas → `VehicleSelector` → Destaques. PoC 028 (fonte gratuita) em paralelo; promoção a produção só após VAL da [spec placa](./FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md).

---

## 6. Próximo passo

1. eFe aprova Pacote MVP-1 (este doc §4).  
2. Abrir MARCHA de implementação **item a item** do pacote, com VAL.  
3. Deploy de mudanças do dia só no **fim do dia**.  

**Assinatura:** Auditoria Prontidão MVP M0 · 2026-11-09.
