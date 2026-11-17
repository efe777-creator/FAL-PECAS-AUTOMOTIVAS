# FAL — MVP Completo 4.0

**Versão:** 1.2  
**Data:** 2026-11-16  
**Status:** CANÔNICO  
**PRD:** [FAL_PRD_4.0.md](../entrada/FAL_PRD_4.0.md)  
**Telas/jornadas:** [FAL_MVP_MAPA_TELAS_JORNADAS.md](./FAL_MVP_MAPA_TELAS_JORNADAS.md)  
**Execução (passos):** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) ← **usar este para fazer**  
**Evidência:** [FAL_AUDITORIA_CONSOLIDADA_PRD4.md](./FAL_AUDITORIA_CONSOLIDADA_PRD4.md)  
**Histórico:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md) (supersedido como canônico)

---

## 0. Agora (uma frase)

**Não implementar ecossistema.** P0–G7 **PASS**. Frente aberta: **G8** — N vendas controladas no preview + monitor 48–72h ([VAL](./FAL_MARCHA_G8_VENDA_CONTROLADA_VAL_2026-11-16.md); consolidação §11).

---

## 1. Definição

**MVP = FAL Commerce operacional até G8 + semente FAL Garage.**

**Done (binário):**  
compra real → pagamento aprovado → separação → despacho → entrega → atendimento → margem contabilizada,  
com veículo utilizável no funil quando o cliente tiver carro salvo.

| Isto é MVP | Isto NÃO é MVP |
|------------|----------------|
| G8 com evidência | “Código encerrado” sem smoke |
| Seed Garage (`/conta/veiculos`) | Garage rica / Parceiros / Workshop |
| Ajustar/completar fundações | Rebuild ou microsserviços |
| Pay híbrido operacional | Split oficina |

MVP ≠ “todos os ajustes” ≠ visão 2040 completa.

---

## 2. Capacidades obrigatórias

| # | Capacidade | Inclui | Não inclui |
|---|------------|--------|------------|
| 1 | Atrair / Home | Home coerente, vitrine, CTAs | Club / personalização avançada |
| 2 | Veículo (seed) | Cadastro/seleção, placa/manual/INV, veículo ativo | Histórico TO, despesas, docs |
| 3 | Busca / fitment | Um contrato; texto+veículo coerentes; empty states | Marketplace serviços |
| 4 | Catálogo / preço | Preço único; apps confiáveis; published | Equivalências F12 |
| 5 | Checkout / pay | Pix/cartão reais; sem duplicar | Split; boleto (adiado) |
| 6 | Frete / entrega | Cotação conjunto; etiqueta; rastreio; own quando ok | Instalação em oficina |
| 7 | Pedidos / estoque | Separar→despachar→entregar | OS oficina |
| 8 | Atendimento | Inbox + cancel/confirm + canal humano | WA agentic |
| 9 | Admin | Catálogo, pedidos, estoque, pay, logística, KPIs | Módulos Parceiros/Workshop |
| 10 | Segurança / margem | Políticas, RLS, margem básica | BI avançado |

---

## 3. Premissas travadas

1. Não reconstruir o que está estável — auditar, ajustar, completar.  
2. INV aditivo; PVC é fitment.  
3. Pay híbrido conforme PRD §6.2.  
4. Frete: físico ≠ POL; mock não shippa.  
5. Sem split Parceiros.  
6. Deploy/migrations sensíveis = autorização eFe.  
7. Toda frente MVP tem aceite e gate.

---

## 4. Gates G1–G8 (+ P0)

| Gate | Condição | Evidência mínima | Doc de passos |
|------|----------|------------------|---------------|
| **P0** | Tip = Edges = SQL = front | Smoke **create** Pix/cartão | Consolidação §3 |
| G1 Produto | Catálogo + apps confiáveis | SKUs com apps; indisponível bloqueado | Consolidação §4 |
| G2 Comercial | Preço/estoque/desconto corretos | Mesmo preço card→pedido (5 pontos) | Consolidação §5 |
| G3 Compra | Checkout + pay real | Approve/recusa/pendente; sem duplicar | Consolidação §6 |
| G4 Logística | Entrega executável | Frete cotado+contratado; etiqueta; rastreio | Consolidação §7 |
| G5 Operação | Separar/despachar | Fluxo admin rotina | Consolidação §8 |
| G6 Segurança | Jurídico/técnico | Políticas + permissões + backup | Consolidação §9 |
| G7 Estabilidade | E2E + monitor | 14 cenários + KPIs básicos | Consolidação §10 |
| G8 Produção | Liberação controlada | N vendas reais sem P0 | Consolidação §11 |

**Ordem:** P0 → G1/G2 → G3 → G4 → G5 → G6 → G7 → G8.  
Evoluções futuras **não** bloqueiam G8.

---

## 5. Cenários E2E obrigatórios (antes de G8)

1. Cliente novo compra → pedido ok  
2. Pagamento aprovado → status ok  
3. Pagamento recusado → não aprovar  
4. Pagamento duplicado → sem cobrança/pedido duplicado  
5. Sem estoque → compra bloqueada (modo com_estoque)  
6. Frete indisponível → informado  
7. Frete próprio fora cobertura → opção ocultada  
8. Cancelamento unpaid → tratado  
9. Enviado → rastreio disponível  
10. Problema entrega → registrável  
11. Admin altera preço → valores coerentes  
12. Cliente acessa pedido alheio → negado  
13. Falha integração → erro tratado, dados preservados  
14. Mobile crítico + backup restore  

---

## 6. Fundações do “prédio” (não são Fase 3)

- INV / identidade veicular  
- Contrato único de busca + PVC  
- Domínios: customer, vehicle, product, order, payment, shipment  
- `customer_vehicles` como seed Garage  
- Notificações inbox (mínimo)  

---

## 7. Fora do escopo (explícito)

Garage rica · Parceiros · Workshop · Fornecedores portal · boleto checkout · guest checkout pleno · WA agentic · app nativo · manutenção preditiva · microsserviços · rebuild.

---

## 8. Classificação de MARCHAs

Toda MARCHA deve ser marcada:

| Classe | Significado |
|--------|-------------|
| **MVP-bloqueador** | Impede G8 |
| **Evolução fase N** | Roadmap |
| **Futuro** | Visão |
| **Descartar/adiar** | Sem valor agora |

---

## 9. Relação com o passado

O plano 2026-11-09 e matriz 001–034 permanecem **históricos/evidência**. O canônico de escopo e done é **este documento**.
