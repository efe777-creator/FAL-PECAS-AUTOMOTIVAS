# FAL — Planejamento consolidado: Home e experiência de compra

**Data:** 2026-11-09  
**Status:** Planejamento consolidado — **não** autoriza implementação por si só  
**Plano canônico:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**AJUSTE núcleo:** **029** (+ 028, 009, 021, 025, 012, 003, 030, 023, 024, 027)

---

## 1. Objetivo

Home como porta de entrada para: encontrar a peça, comprar com segurança, voltar a comprar. Perfis: visitante, recorrente, quem conhece o veículo, profissional.

**Princípios:** busca fácil; veículo prioritário; sem conta obrigatória para começar; compatibilidade clara; campanhas/destaques administráveis; mobile-first; auditar/reaproveitar (não duplicar).

## 2. Ordem superior travada

1. Campanhas e banners  
2. Busca por placa (ou slot com seletor manual até 028)  
3. Produtos em destaque  

Complementares (validar mobile): categorias → garagem → ofertas/kits → confiança → SEO → rodapé.

### Código atual vs aprovado (`fal-pecas/src/pages/Home/HomePage.tsx`)

| Aprovado | Hoje | Ação |
|----------|------|------|
| Campanhas | `HomeBannerCarousel` 1º | Validar 009 |
| Placa | Ausente; `#veiculo` **depois** dos destaques | 028 + reordenar 029 |
| Destaques | `useFeaturedProducts(12)` | 021/022: limpar hard cap + híbrido |

## 3. Decisões travadas

- Falha na placa → seleção manual imediata ([spec placa](./FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md)).
- Sempre perguntar antes de salvar na garagem.
- Placa ≠ prova de compatibilidade da peça.
- Compra sem cadastro antecipado = **AJUSTE-030**.
- Quantidade de destaques configurável (alinha Comercial).
- Sem segundo gateway neste plano (permanece Mercado Pago).

## 4. Backlog H*/C* → AJUSTE

| ID | Entrega | AJUSTE | MVP |
|----|---------|--------|-----|
| H01 | Reordenar Home | 029 | Sim |
| H02 | Campanhas | 009 | Sim parcial |
| H03–H06 | Placa + confirm + manual + filtros | 028 | PoC / fallback manual |
| H07 | Garagem pergunta | 028 | Sim com 028 |
| H08–H09 | Destaques qtd/ordem | 021+022 | Sim |
| H10 | Categorias | 029/023 | Sim |
| H11 | Infos por categoria | 025 | Mínimo |
| H12 | Ofertas/kits | 022/013 | Ofertas sim; kits pós |
| H13 | Personalização | 029 | Pós-MVP |
| C08–C10 | Guest/progressivo | 030 | Sim |
| C12–C13 | Pagamento/frete | 016/017/014 | Sim |
| C16–C17 | Segurança/jurídico | 027 | Sim |

## 5. MVP-lite Home

Para G1/G2: aplicar ordem Campanhas → **VehicleSelector no slot da placa** → Destaques, sem esperar fornecedor de placa. Evoluir para 028 quando PoC passar.

## 6. Critérios de aceite (amostra)

- Ordem superior respeitada no desktop e mobile.  
- Campanhas vencidas/desativadas não aparecem.  
- Destaques: admin controla quantidade e ordem.  
- Compatibilidade nunca “garantida” sem base técnica.  
- Compra avançável sem cadastro antecipado (030).  
