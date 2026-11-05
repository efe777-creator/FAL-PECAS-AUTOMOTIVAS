# STOP — M10 REGRAS-PEDIDOS-ONDA3 (cartão tokenizado)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA` sequencial pós #68  
**Decisão de marcha:** **ADIAR** até eFe assinar “seguir Onda 3”.

---

## Por quê parar aqui

| Item | Estado |
|------|--------|
| M3–M9 + P2-OWN + P1-LOG-HIST | **FEITO** (main) |
| M10 cartão salvo (MP Customers/Cards) | Exige decisão comercial + escopo segurança |
| Regra canônica | FAL **não** guarda PAN/CVV; só token + bandeira + últimos 4 |

Sem assinatura **seguir**, implementar M10 seria especulação (PCI/token MP).

---

## Quando retomar

eFe responde uma:

1. **SEGUIR M10** — implementar Customers/Cards + UI perfil  
2. **ADIAR** (esta STOP permanece)  
3. **CANCELAR Onda 3** — marcar HOLD no backlog

---

## Próximos candidatos (também com gate humano)

| ID | Gate |
|----|------|
| M11+ Frete C / ME live | Nova assinatura D-FRETE |
| Calibração medidas comerciais | Valores eFe por grupo |
| Auto-refund MP | Troca da política manual M8 |

**Assinatura agente:** STOP M10 adiamento 2026-11-05.
