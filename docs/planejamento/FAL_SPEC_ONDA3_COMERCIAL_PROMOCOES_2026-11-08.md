# FAL — Especificação Técnica Oficial  
## Onda 3 — Comercial, Promoções e Conversão

> ## SUPERSEDIDA
>
> **Data da supersessão:** 12/11/2026  
> **Motivo:** substituída pela frente comercial paralela **Home da Loja (HOME-01…08)**, com inventário do implantado, auditoria obrigatória antes de implementação, e sequência Frente 1 → Gate pós-F1 → Frente 2 → Frente 3.  
> **Plano mestre vigente:** [FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md](./FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md)  
> **Backlog vigente:** [FAL_HOME_BACKLOG_01_08.md](./FAL_HOME_BACKLOG_01_08.md)  
>
> Este arquivo permanece como **histórico**. Os princípios das seções **2.1 a 2.5** abaixo são preservados como referência comercial; a **execução futura** segue o plano mestre e o backlog HOME.  
> A supersessão **não** apaga o histórico nem invalida decisões comerciais ainda alinhadas ao mestre.

**Projeto:** FAL Peças Automotivas  
**Data:** 08/11/2026 (consolidada no repo 09/11/2026)  
**Status:** **SUPERSEDIDA** (12/11/2026) — não usar como plano de execução  
**Plano canônico vigente:** [FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md](./FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md)  
**Referência MVP histórica:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**AJUSTE núcleo (histórico):** **022** (+ 013, 021, 010, 016, 020) — novos AJUSTEs da frente Home **não** são numerados neste ciclo

---

## 1. Objetivo

Unificar Destaques, Promoções, preços, condições de pagamento, carrinho e checkout em um sistema coerente: ofertas verdadeiras, economia clara, condições reais, sem divergência de preço ou disponibilidade. Admin opera regras sem alterar código.

## 2. Regras de negócio aprovadas

### 2.1 Destaques

- Quantidade máxima **configurável** (remover hard cap fixo, ex. 12).
- Ordenação **híbrida:** (1) curados na ordem manual → (2) completar vagas com elegíveis automáticos → (3) sem duplicar → (4) critérios determinísticos.
- Produtos promocionais podem aparecer em Destaques; promoção **não remove** curadoria.
- **Bug a corrigir:** com curadoria, o serviço hoje retorna só curados e **não completa** vagas.

### 2.2 Promoções

- Promoção = estado comercial do produto via **Lista Promocional** do módulo Preços.
- **Não** criar segundo motor de preços nem cópia de produto.
- Admin: ativar/desativar, buscar nome/SKU/ref, ver preço normal/promo/economia/validade, filtrar ativa/inativa/expirada.
- Reflete em: Home, Destaques, catálogo, busca, PDP, carrinho, checkout.

### 2.3 Identidade visual comercial

Evoluir `ProductCard` (não redesenhar marca): selo promo, preço riscado, preço promo, economia, condições verdadeiras, disponibilidade, hierarquia clara. Mesma informação em PDP, busca, carrinho, checkout.

### 2.4 Pagamentos

**A. Métodos reais:** Pix, crédito, débito se suportado; boleto/wallets só pós-homologação.  
**B. Condições comerciais:** parcelas, mínimo, juros — nunca anunciar o que o checkout não oferece.  
Backend **rejeita** método desativado (esconder na UI não basta).

### 2.5 Carrinho / Checkout

- Unitário, qty, subtotais, economia, descontos, frete, total; cálculo central; preço do servidor prevalece.
- Só métodos disponíveis; recalcular antes do pagamento; pedido pendente até confirmação confiável; webhook idempotente.

## 3. Arquivos (confirmar paths sob `fal-pecas/src/`)

`HomePage.tsx`, `AdminHomeContentPage.tsx`, serviços de produto/preço, `ProductCard.tsx`, `paymentService.ts`, `CheckoutPage.tsx`, `mpCreatePaymentCore`, `paymentDisplayService`, `CartPage`, `cartPricing`.

## 4. Etapas

| Etapa | Pri | MVP? |
|-------|-----|------|
| 0 Auditoria contratos | P0 | Sim (M0) |
| 1 Fonte única preço/promo | P0 | Sim (G2) |
| 2 Destaques configuráveis + híbrido | P1 | Sim se vitrine | 
| 3 Visual cards | P1 | Mínimo MVP / completo Evolução |
| 4 Admin Promoções | P1 | Evolução ou P1 se operação exigir |
| 5 Métodos pagamento reais | P0 | Sim (G3) |
| 6 Carrinho/checkout | P0 | Sim (G3) |
| 7 Homologação | P0 | Sim |
| Wallets/boleto | P2 | Pós-MVP (020) |

## 5. Critérios de aceite

Limite admin; híbrido sem duplicar; promo sem duplicar produto; preço consistente; economia clara; só métodos reais; backend bloqueia desativados; cart=checkout=servidor; sem aprovar sem confirmação; sem regressão.

## 6. Limites

Preservar contratos de preço, MP, frete, pedidos/webhooks, permissões. Homologação controlada ≠ produção plena.
