# FAL — Matriz AJUSTE-001 a 034

**Data:** 2026-11-09  
**Fonte:** auditorias readonly + specs 1–3 + Programa Prontidão MVP  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Legenda estado:** I = Implementado (validar) · P = Parcial · N = Não existe / só planejado · D = Dado/ops humana  

| ID | Título | Estado | Gate | Corte | Próximo passo |
|----|--------|--------|------|-------|---------------|
| 001 | Limpeza dados de teste | P | G8 | MVP (M5) | Backup + autorização; nunca no meio de feature |
| 002 | Edição aplicações veiculares | P→melhor | G1 | MVP | Troca veículo in-place + período; form produto com validação anos (09/11) |
| 003 | Busca e filtros catálogo | I/P | G1 | MVP | Empty-state + erro SearchBar (09/11); sinônimos = gate dado |
| 004 | Imagem BRD2404 | N | — | Evolução 1 | Aguardar imagem de referência |
| 005 | Exportação PDF catálogo | N | — | Evolução 1 | Fora do MVP |
| 006 | Meus Pedidos | I | G3 | MVP | Smoke RLS + E2E |
| 007 | Detalhe pedidos | I | G3 | MVP | Confirmar SQL motivo recusa em wtbp se pendente |
| 008 | Curva ABC veículos | N | — | Evolução 1 | Após vendas reais |
| 009 | Carrossel campanhas | I | G2 | MVP | Vigência/preview; conteúdo real |
| 010 | Cards produtos | I/P | G2 | MVP | Base ok; selo/economia via 022 |
| 011 | Imagens favoritos | P | — | Evolução 1 | attachPrimaryProductImages em favoritos |
| 012 | Aba favoritos | I | — | MVP leve | Validar |
| 013 | Revisão comercial destaques/promo | P/D | G2 | MVP | Massa humana + admin promo |
| 014 | Fretes/transportadoras/etiquetas | P | G4 | MVP | Homologar cotação+etiqueta reais |
| 015 | Impressão pedidos | P→melhor | G5 | MVP | Lista separação A4 na fase separação + romaneio lib (09/11) |
| 016 | Auditoria checkout | I/P | G3 | MVP | Troca Pix↔cartão corrigida; Brick alinhado display (09/11) |
| 017 | Ativação operacional | P | G3–G8 | MVP | Código MP ok; cutover credenciais/webhook = gate |
| 018 | Verificação contas | P | G3/G6 | MVP mínimo | Política sem travar compra demais |
| 019 | Login social | N | — | Evolução 1 | Após G8 |
| 020 | Google/Apple Pay | N | — | Evolução 1 | Só se homologado; nunca anunciar antes |
| 021 | Gestão destaques | P→I parcial | G2 | MVP | Híbrido + teto 24 entregues 09/11; setting DB depois |
| 022 | Comercial/promo/conversão | P | G2–G3 | MVP | Spec Comercial; Etapas 0/1/5/6 primeiro |
| 023 | UX/UI geral | P | G7 | MVP crítico mobile | Finos sem redesign total |
| 024 | Performance | P | G7 | MVP baseline | LCP/INP/CLS; otimização profunda depois |
| 025 | Infos por categoria | P | G1 | MVP mínimo | Garantia/cuidados sem inventar prazo |
| 026 | Frete grátis por valor | N | — | Evolução 1 | Após cálculo margem |
| 027 | Segurança/privacidade/LGPD | P | G6 | MVP | Cookies/aceite/versões + jurídico |
| 028 | Busca por placa | N | G1* | MVP-lite / Evo | Spec placa; PoC gratuita; fallback seletor |
| 029 | Reformulação Home | P | G1–G2 | MVP | Ordem Campanhas→veículo→Destaques OK 09/11; placa 028 depois |
| 030 | Cadastro simplificado / sem login obrigatório | P | G3 | MVP | Funil guest→checkout; sem duplicar cliente |
| 031 | Estoque, separação e expedição | P | G5 | **MVP** | Núcleo SQL ok; UI separação+print+saldo (09/11); ops/ME = gate |
| 032 | Atendimento e pós-venda | P/N | G6 | **MVP** | Canal oficial + trocas ligadas ao pedido |
| 033 | Financeiro / margem básica | N | G5 | **MVP** | Margem por pedido (sem ERP) |
| 034 | Indicadores operação | P/N | G7 | **MVP** | Painel status pedidos / rupturas / erros |

\*028 completa não bloqueia G1 se `VehicleSelector` cobrir identificação.

---

## Pacote MVP-1 (bloqueadores sugeridos — validar na auditoria)

Ordem sugerida de ataque após M0:

1. **022** Etapas 0–1 (preço único) + **021** híbrido se necessário  
2. **029** reordenação Home (slot veículo)  
3. **002/003** apps + busca confiáveis (dado + código)  
4. **016/017** pagamento produção  
5. **014** frete contratável  
6. **031 + 015** operação  
7. **027 + 032** legal/atendimento  
8. **033 + 034** margem + painel  
9. **030** fricção checkout  
10. **001** só no G8  

---

## Specs × IDs

| Spec | IDs |
|------|-----|
| Comercial | 022, 021, 010, 013, 016, 020 |
| Home | 029, 009, 021, 025, 012, 003, 030, 023, 024, 027, 028 |
| Placa | 028 (+ garagem via customerVehicleService) |
