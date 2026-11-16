# G8.2 — Plano de rollback / manutenção (MVP)

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Pré-condição:** G1–G7 PASS  

---

## Gatilhos para acionar

- Cobrança duplicada / approve mentiroso  
- Frete/etiqueta cobrando cliente a mais sem controle  
- Indisponibilidade Edges pay/quote > 15 min  
- Incidente segurança / vazamento  

## Ações (ordem)

1. **Pay off (rápido):** Netlify/site — mensagem manutenção no hero **ou** Feature: desligar métodos no `store_payment_display` / `payment_routing_config.asaas_enabled=false` (mantém loja browse).  
2. **Checkout hard stop:** redirect `/checkout` → página “loja em manutenção” (deploy draft/preview ok; `--prod` quando créditos).  
3. **Edges:** não redeployar pay enquanto incidente aberto; preferir flag DB a hot-patch.  
4. **Comunicação:** WhatsApp rodapé (`VITE_WHATSAPP_PHONE`) + e-mail se configurado.  
5. **Dados:** sem limpeza 001; backup/PITR Supabase antes de qualquer delete.  

## Retorno

1. Smoke create Pix ≤201 + cotação CEP 01310-100  
2. 1 pedido unpaid cancelável  
3. eFe declara retomada  

## Fora deste plano

Parceiros · WA agentic · boleto · force-push · migrate destrutiva.
