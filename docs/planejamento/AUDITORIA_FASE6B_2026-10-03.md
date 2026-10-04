# Auditoria Fase 6B — Listas de Preços — 2026-10-03

**STATUS: PLANEJAMENTO CONCLUÍDO — AGUARDANDO APROVAÇÃO PARA IMPLEMENTAÇÃO**

**Etapa:** A (somente documentação; **sem código**)  
**Spec:** [ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md](./ESPECIFICACAO_FASE6B_LISTAS_PRECOS.md)  
**Execução:** [EXECUCAO_FASE6B.md](./EXECUCAO_FASE6B.md)

## Resumo da auditoria técnica (pré-código)

| Item | Resultado |
|------|-----------|
| `products.price` / `promo_price` | Única fonte atual; UI e `place_order` acoplados |
| `place_order` | Recalcula no server com `coalesce(promo, price)` — ponto único para plugar resolve |
| Listas existentes | Nenhuma |
| Import preços | Schema stub `imports`; sem UI; sem lib Excel |
| Risco F6 | Baixo se alteração em `place_order` for só origem do unitário |
| Segurança | Listas `assigned` futuras não podem ser listadas publicamente |

## Gate

- [x] Etapa A entregue (spec + execução + roadmap/docs)  
- [ ] Aprovação humana para Etapa B  
- [ ] Implementação + testes T1–T15  
- [ ] Reabrir este arquivo como **APROVADA** pós-código  

## Mensagem de status

**Fase 6B pronta para implementação. Aguardando aprovação.**
