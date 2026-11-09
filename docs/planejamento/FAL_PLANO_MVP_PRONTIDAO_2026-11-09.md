# FAL — Plano canônico: Prontidão MVP + ajustes 001–034

**Data:** 2026-11-09  
**Status:** PLANEJAMENTO CONSOLIDADO (MARCHA docs) — sem autorização automática de código  
**Auth:** eFe — MARCHA executar e concluir planejamento  
**Substitui como fila de evolução:** gates soltos do relatório mestre 2026-11-09 (absorvidos em G1–G8 / AJUSTE)  
**Plano mestre código anterior:** [FAL_PLANO_MESTRE_SITE_2026-11-05.md](./FAL_PLANO_MESTRE_SITE_2026-11-05.md) (código MARCHA encerrado; este doc governa o caminho até venda real)

---

## 0. Veredito em 30s

| Camada | Situação |
|--------|----------|
| Código MARCHA plano mestre | Encerrado tip `main` #247 |
| Specs oficiais 1–3 | Consolidadas e linkadas neste programa |
| Lista de ajustes | **001–034** (030 = compra simplificada; 031–034 = lacunas MVP) |
| Meta agora | **MVP operacional**, não “fechar todos os ajustes” |
| Deploy mudanças de hoje | Somente **fim do dia**, com autorização |

**MVP concluído somente quando:** compra real → pagamento → separação → despacho → entrega → atendimento → margem contabilizada.

---

## 1. Documentos oficiais deste programa

| Doc | Papel |
|-----|--------|
| **Este arquivo** | Plano canônico MVP + gates G1–G8 + roadmap M0–M5 |
| [FAL_MATRIZ_AJUSTES_001_034_2026-11-09.md](./FAL_MATRIZ_AJUSTES_001_034_2026-11-09.md) | Matriz ID × estado × gate × MVP/Evolução |
| [FAL_SPEC_ONDA3_COMERCIAL_PROMOCOES_2026-11-08.md](./FAL_SPEC_ONDA3_COMERCIAL_PROMOCOES_2026-11-08.md) | Spec Comercial (AJUSTE-022+) |
| [FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md](./FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md) | Spec Home (AJUSTE-029+) |
| [FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md](./FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md) | Spec Placa (AJUSTE-028) |
| [FAL_MARCHA_MVP_PLANEJAMENTO_VAL_2026-11-09.md](./FAL_MARCHA_MVP_PLANEJAMENTO_VAL_2026-11-09.md) | VAL desta MARCHA de planejamento |
| [FAL_AUDITORIA_PRONTIDAO_MVP_2026-11-09.md](./FAL_AUDITORIA_PRONTIDAO_MVP_2026-11-09.md) | Auditoria M0 Frentes A–H + Pacote MVP-1 |

Apontador curto: [FAL_PLANO_30_AJUSTES_IMPLANTACAO_2026-11-09.md](./FAL_PLANO_30_AJUSTES_IMPLANTACAO_2026-11-09.md).

---

## 2. Premissas travadas

1. **MVP ≠ todos os ajustes implementados.**
2. Não reconstruir o que já está estável — auditar, validar, corrigir bloqueadores.
3. Gates MARCHA antigos entram em G1–G8 / AJUSTE se ainda necessários.
4. Deploy de alterações feitas **hoje** só no **fim do dia**.
5. AJUSTE-001 (limpeza) só após G7, com backup + autorização, antes do G8.
6. Specs = planejamento consolidado; código só com **Pacote MVP** aprovado.
7. Ciclo obrigatório: Auditar → Planejar → Implementar → Testar → Validar → Concluir.

### Numeração oficial (não colidir)

| ID | Nome |
|----|------|
| **030** | Cadastro simplificado e compra sem login *(mantido)* |
| **031** | Gestão operacional de estoque, separação e expedição *(novo MVP)* |
| **032** | Atendimento e pós-venda *(novo MVP)* |
| **033** | Gestão financeira e rentabilidade básica *(novo MVP)* |
| **034** | Monitoramento e indicadores da operação *(novo MVP)* |

---

## 3. Definição de MVP (10 capacidades)

1. Atrair clientes  
2. Identificar o veículo  
3. Encontrar peças compatíveis  
4. Vender com preço correto  
5. Receber pagamentos reais  
6. Entregar corretamente  
7. Administrar pedidos e estoque  
8. Atender e resolver problemas  
9. Proteger dados e operação  
10. Gerar margem sustentável  

**Riscos a eliminar:** peça errada; pagar sem processar; vender sem estoque; frete errado; sem rastreio; vender no prejuízo; falha de segurança; pós-venda sem canal.

---

## 4. Frentes A–H

| Frente | Foco | AJUSTE principais | MVP |
|--------|------|-------------------|-----|
| A Produto/catálogo | Apps, busca, estoque | 002, 003, 025, 028*, 004 | Sim (*placa: PoC ou seletor manual*) |
| B Comercial | Home, promo, preço único | 029, 009, 021, 022; adiar 005/026 | Preço consistente obrigatório |
| C Compra/pagamento | Checkout Pix/cartão | 016, 017, 030, 006, 007; adiar 019/020 | Sim |
| D Estoque/expedição | Lacuna crítica | **031**, 015, 014 | Sim |
| E Frete | Cotação contratável | 014; 026 depois | Sim |
| F Admin | Pedidos, preços, permissões | Validar existente + **034** | Sim |
| G Segurança/jurídico | Políticas, RLS, backup | **027**, **032** | Sim |
| H Estabilidade | CWV, erros, regressão | 024 mínimo + **034** | Sim |

---

## 5. Gates G1–G8

| Gate | Condição | Evidência mínima |
|------|----------|------------------|
| G1 Produto | Catálogo + apps confiáveis | SKUs com apps; indisponível bloqueado |
| G2 Comercial | Preço/estoque/desconto corretos | Mesmo preço card→PDP→cart→checkout→pedido |
| G3 Compra | Checkout + pagamento real | Pix/cartão aprovado/recusado/pendente; sem duplicar |
| G4 Logística | Entrega executável | Frete cotado+contratado; etiqueta; rastreio |
| G5 Operação | Separar/despachar | 031+015 |
| G6 Segurança | Jurídico/técnico | 027 + permissões + backup |
| G7 Estabilidade | E2E + monitor | Cenários oficiais + 034 básico |
| G8 Produção | Liberação controlada | 001 OK; primeiras vendas acompanhadas |

Evoluções futuras **não** bloqueiam G8.

---

## 6. Corte MVP vs Evolução

### MVP (agora)

- 002, 003, 006, 007, 014, 015, 016, 017  
- 022 (etapas preço/pagamento/checkout)  
- 027, 029 (ordem Home), 030  
- **031, 032, 033, 034**  
- 028 PoC ou fallback `VehicleSelector` no slot da placa  
- 009 / 021 mínimo para vitrine utilizável  

### Evolução 1 (pós-G8)

019, 020, 026, 005, 008, 004 fino, 028 produção plena, kits, personalização Home, marketing automation.

### Evolução 2

IA/demanda, CRM, fidelidade, integrações extras.

---

## 7. Roadmap M0–M5

| Marco | Conteúdo | Gates |
|-------|----------|-------|
| **M0** | Docs + Auditoria Prontidão A–H + Pacote MVP-1 | — |
| **M1** | Catálogo, apps, preço único, Home ordem | G1–G2 |
| **M2** | Checkout, Pix/cartão prod, pedidos, 030 | G3 |
| **M3** | Frete/etiqueta + **031** + 015 + margem **033** | G4–G5 |
| **M4** | 027 + **032** + **034** + 024 baseline | G6–G7 |
| **M5** | 001 + liberação controlada | G8 |

---

## 8. Specs oficiais (mapeamento)

| Spec | Arquivo | AJUSTE núcleo |
|------|---------|---------------|
| 1/3 Comercial | `FAL_SPEC_ONDA3_COMERCIAL_PROMOCOES_2026-11-08.md` | 022 (+021, 010, 016, 020) |
| 2/3 Home | `FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md` | 029 (+028, 009, 025, 030…) |
| 3/3 Placa | `FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md` | 028 |

**Nomenclatura:** “Onda 3 Comercial” da spec ≠ “Onda 3 Home” MARCHA. No roadmap MVP, Comercial entra em M1/M2 (preço) e evolução visual pós-preço; Home ordem em M1; Placa em M1 PoC / Evolução 1 plena.

---

## 9. Cenários E2E obrigatórios (antes de G8)

1. Cliente novo compra → pedido ok  
2. Pagamento aprovado → status ok  
3. Pagamento recusado → não aprovar  
4. Pagamento duplicado → sem cobrança/pedido duplicado  
5. Sem estoque → compra bloqueada  
6. Frete indisponível → informado  
7. Frete próprio fora cobertura → opção ocultada  
8. Cancelamento → estoque e pagamento tratados  
9. Enviado → rastreio disponível  
10. Devolução → processo registrável  
11. Admin altera preço → valores coerentes  
12. Cliente acessa pedido alheio → negado (RLS)  
13. Falha de integração → erro tratado, dados preservados  
14. Mobile + backup restore  

---

## 10. Status padronizado por ajuste

Não auditado → Auditado → Planejamento consolidado → Aprovado → Em implementação → Em testes → Aguardando validação humana → Concluído | Bloqueado.

---

## 11. Regras de proteção

1. Não recriar feature estável.  
2. Sem migration destrutiva sem mapa de FKs.  
3. Sem delete em produção sem backup + OK eFe.  
4. UI não quebra pagamento/frete/pedido/estoque.  
5. Homologação ≠ tela ok.  
6. Publish de hoje só fim do dia.  
7. Doc atualizada a cada gate.  
8. Smoke de regressão nos módulos tocados.  

---

## 12. Próximos marcos de execução

1. **Concluído nesta MARCHA:** docs canônicos no repo.  
2. **Seguinte:** [FAL_AUDITORIA_PRONTIDAO_MVP_2026-11-09.md](./FAL_AUDITORIA_PRONTIDAO_MVP_2026-11-09.md) + Pacote MVP-1.  
3. **Depois:** implementação só dos bloqueadores do Pacote MVP-1, gate a gate.  

**Assinatura:** Plano canônico MVP FAL · 2026-11-09 · tip referência main #247.
