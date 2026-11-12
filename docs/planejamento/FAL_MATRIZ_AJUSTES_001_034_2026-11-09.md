# FAL — Matriz AJUSTE-001 a 035

**Data:** 2026-11-09 · **reconciliada 2026-11-10** (`main` `6dcd06a` / eFe `6af3728aa529d6e05f777cab`) · **035 acrescentado 2026-11-12**  
**Fonte:** auditorias + specs 1–3 + VALs 09–10/11 + [reconciliação](./FAL_AUDITORIA_RECONCILIACAO_PLANO_MVP_2026-11-10.md)  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Checkout (2026-11-12):** [plano](./FAL_PLANO_AJUSTE_035_CHECKOUT.md) · [cruzamento](./FAL_AUDITORIA_AJUSTE_035_CHECKOUT_CRUZAMENTO_2026-11-12.md) — evolução jornada/pagamento; **não** altera 034  
**Central de Pedidos (2026-11-11):** [plano 4 frentes](./FAL_PLANO_CENTRAL_PEDIDOS_4_FRENTES_2026-11-11.md) · [matriz auditoria](./FAL_AUDITORIA_CENTRAL_PEDIDOS_MATRIZ_2026-11-11.md) · [mapa jornada](./FAL_MAPA_JORNADA_CENTRAL_PEDIDOS_2026-11-11.md) — não cria fila paralela; absorve validação/correção de 006/007/014/015/016/017/031  
**Legenda estado:** I = Implementado (validar ops) · P = Parcial · N = Não existe / só planejado · D = Dado/ops humana  

| ID | Título | Estado | Gate | Corte | Próximo passo / evidência |
|----|--------|--------|------|-------|---------------------------|
| 001 | Limpeza dados de teste | P/D | G8 | MVP (M5) | Backup + auth; só após G7 |
| 002 | Edição aplicações veiculares | **I/P** | G1 | MVP | Código OK (troca in-place + V3 anos + PVC wildcard #252); massa apps = D |
| 003 | Busca e filtros catálogo | **I/P** | G1 | MVP | Empty/erro + smoke PVC filtros PASS; sinônimos = D |
| 004 | Imagem BRD2404 | N | — | Evolução 1 | Fora |
| 005 | Exportação PDF catálogo | N | — | Evolução 1 | Fora |
| 006 | Meus Pedidos | I | G3 | MVP | Smoke RLS + E2E humano · ver Central [CP-CLI-100](./FAL_AUDITORIA_CENTRAL_PEDIDOS_MATRIZ_2026-11-11.md) |
| 007 | Detalhe pedidos | I | G3 | MVP | Idem · Central [CP-CLI-103](./FAL_AUDITORIA_CENTRAL_PEDIDOS_MATRIZ_2026-11-11.md) |
| 008 | Curva ABC veículos | N | — | Evolução 1 | Fora |
| 009 | Carrossel campanhas | **I** | G2 | MVP | Vigência/mobile Onda1; conteúdo real = D |
| 010 | Cards produtos | I/P | G2 | MVP | Base ok; selo/economia via 022 fino |
| 011 | Imagens favoritos | P | — | Evolução 1 | Fora do cutover |
| 012 | Aba favoritos | I | — | MVP leve | OK |
| 013 | Revisão comercial destaques/promo | P/D | G2 | MVP | Admin ok; massa humana |
| 014 | Fretes/transportadoras/etiquetas | **I/P** | G4 | MVP | Cotação guest + prepare ME PASS; **purchase** = GATE; + retirada PDP #250 · Central [CP-ME-*](./FAL_AUDITORIA_CENTRAL_PEDIDOS_MATRIZ_2026-11-11.md) |
| 015 | Impressão pedidos | **I** | G5 | MVP | Separação A4 VAL MVP-1 · Central [CP-PRT-*](./FAL_AUDITORIA_CENTRAL_PEDIDOS_MATRIZ_2026-11-11.md) |
| 016 | Auditoria checkout | **I/P** | G3 | MVP | Pix prod R$1 PASS + sync Edge · [VAL CP-PAY 11/11](./FAL_MARCHA_CP_PAY_PIX_PROD_SMOKE_VAL_2026-11-11.md) · webhook prod ainda D |
| 017 | Ativação operacional | P | G3–G8 | MVP | Código/espelho eFe OK; webhook approve prod = D · sync-mp-payment mitiga · Central Fase 4 |
| 018 | Verificação contas | P | G3/G6 | MVP mínimo | Política leve |
| 019 | Login social | N | — | Evolução 1 | Fora |
| 020 | Google/Apple Pay | N | — | Evolução 1 | Fora |
| 021 | Gestão destaques | **I** | G2 | MVP | Híbrido + teto + `featured_display_limit` |
| 022 | Comercial/promo/conversão | P | G2–G3 | MVP | E0/E1 preço OK; promo plena adiada (ok) |
| 023 | UX/UI geral | **I/P** | G7 | MVP | Mobile UX #253 (Meus carros + cards admin); CWV = ops |
| 024 | Performance | P | G7 | MVP baseline | Code-split OK; medir CrUX/PageSpeed |
| 025 | Infos por categoria | P | G1 | MVP mínimo | Garantia/cuidados; Onda 2 Home = fora |
| 026 | Frete grátis por valor | N | — | Evolução 1 | Fora |
| 027 | Segurança/privacidade/LGPD | **I/P** | G6 | MVP | Cookies + páginas live; **advogado** = GATE |
| 028 | Busca por placa | **I/P** | G1* | MVP-lite **superado** | Evo1 + **apiplacas live** INT8C36 PASS; saldo/contrato = Evo comercial |
| 029 | Reformulação Home | **I** | G1–G2 | MVP | Onda 1 ship #250; Ondas 2–4 = fora |
| 030 | Cadastro simplificado / sem login obrigatório | **I/P** | G3 | MVP | Fricção ↓ VAL; guest 100% = Evolução |
| 031 | Estoque, separação e expedição | **I/P** | G5 | **MVP** | UI+SQL OK; rotina/ME purchase = D · Central [CP-SEP-* / CP-STK-* / CP-CEN-040](./FAL_AUDITORIA_CENTRAL_PEDIDOS_MATRIZ_2026-11-11.md) |
| 032 | Atendimento e pós-venda | **I/P** | G6 | **MVP** | `/trocas-devolucoes` + WhatsApp; ticket formal = Evo |
| 033 | Financeiro / margem básica | **I** | G5 | **MVP** | Margem pedido VAL 09/11 (matriz antiga N estava errada) |
| 034 | Indicadores operação | **I** | G7 | **MVP** | KPIs dashboard VAL 09/11 |
| 035 | Checkout — jornada, pagamento e recuperação | **I/P** | G3 | **MVP** | [cruzamento](./FAL_AUDITORIA_AJUSTE_035_CHECKOUT_CRUZAMENTO_2026-11-12.md) · CP-PAY-021 config+probe PASS · [probe VAL](./FAL_MARCHA_AJUSTE_035_CHECKOUT_WEBHOOK_EDGE_PROBE_VAL_2026-11-12.md) · delivery Pix opcional |

\*028 completa comercial não bloqueia G1; fallback seletor + placa live já cobrem identificação.

---

## Pacote MVP-1 — status pós-reconciliação

| # | AJUSTE | Código | Ops restante |
|---|--------|--------|--------------|
| 1 | 022-E0/E1 | **DONE** | — |
| 2 | 029 | **DONE** | — |
| 3 | 021 | **DONE** | Conteúdo destaques = D |
| 4 | 002/003 | **DONE** | Massa apps/sinônimos = D |
| 5 | 016/017 | **DONE** código | Approve/webhook/cartão/fernando |
| 6 | 014 | **DONE** + prepare PASS | Purchase etiqueta |
| 7 | 031/015 | **DONE** | Smoke UI staff |
| 8 | 027/032 | **DONE** mínimo | Advogado |
| 9 | 033/034 | **DONE** | Custos cadastrados |
| 10 | 030 | **DONE** mínimo | Guest total = fora |
| — | **001** | Pendente M5 | G8 |

---

## Feito fora / além do Pacote MVP-1 (não é dívida do plano)

| Entrega | PR / VAL | Relação |
|---------|----------|---------|
| Home Onda 1 + placa Evo1 + V3 + frete retirada | #250 | 029/028/002/014 |
| ME docs CPF + prepare etiqueta | #251 | 014 |
| PVC blank engine/versão wildcard | #252 | 002/003 |
| Mobile UX Meus carros + admin cards | #253 | 023 |
| apiplacas adapter live | VAL 10/11 | 028 Evo (à frente) |
| Gestão pagamentos PG05–11 | `07dbb76` | Plano Pagamentos (paralelo) |

---

## Specs × IDs

| Spec | IDs |
|------|-----|
| Comercial | 022, 021, 010, 013, 016, 020 |
| Home | 029, 009, 021, 025, 012, 003, 030, 023, 024, 027, 028 |
| Placa | 028 (+ garagem via customerVehicleService) |

**Assinatura:** Matriz 001–034 reconciliada · 2026-11-10 · **035 acrescentado 2026-11-12** (checkout; 034 preservado).
