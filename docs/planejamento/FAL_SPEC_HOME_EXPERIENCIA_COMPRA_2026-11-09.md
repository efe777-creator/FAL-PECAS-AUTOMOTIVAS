# FAL — Planejamento consolidado: Home e experiência de compra

**Data:** 2026-11-09 · **Atualizado:** 2026-11-10 (auditoria × código + Onda 1)  
**Status:** Onda 0 congelada; Onda 1 em implementação no código — **não** autoriza Ondas 2–4 nem cutover MP/frete por si só  
**Plano canônico:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**AJUSTE núcleo:** **029** (+ 028, 009, 021, 025, 012, 003, 030, 023, 024, 027)  
**Ops placa:** [FAL_MARCHA_HOME_OPS_PLACA_HANDOFF_2026-11-10.md](./FAL_MARCHA_HOME_OPS_PLACA_HANDOFF_2026-11-10.md)  
**Pacotes 2–4:** [FAL_MARCHA_HOME_ONDAS_2_4_PACOTES_2026-11-10.md](./FAL_MARCHA_HOME_ONDAS_2_4_PACOTES_2026-11-10.md)

---

## 1. Objetivo

Home como porta de entrada para: encontrar a peça, comprar com segurança, voltar a comprar. Perfis: visitante, recorrente, quem conhece o veículo, profissional.

**Princípios:** busca fácil; veículo prioritário; sem conta obrigatória para começar; compatibilidade clara; campanhas/destaques administráveis; mobile-first; auditar/reaproveitar (não duplicar).

---

## 2. Ordem da Home (travada)

### Superior (imutável)

1. Campanhas e banners (`HomeBannerCarousel`)
2. Entrada unificada (`HomeQuickEntry` / `#veiculo`) — título + `VehiclePlateSearch` + atalhos (Buscar peça / Ver categorias / Meus veículos)
3. Vitrine (`#home-vitrine`) — Destaques por padrão; **Ver categorias** nos 3 botões da entrada troca o painel (sem abas). **Meus veículos** só no botão da entrada.

### Complementar (aprovada na auditoria 2026-11-10)

4. Ofertas (automáticas; kits = Onda 3)  
5. Benefícios / confiança (bloco curto + links legais)  
6. SEO técnico (JSON-LD / meta; conteúdo longo = P2)  
7. Rodapé (`Footer` no `MainLayout`)

**Removido da Home como rail fixo:** “Suspensão e direção” hardcoded — categorias cobrem a navegação.

### Código × aprovado (`fal-pecas/src/pages/Home/HomePage.tsx`)

| Bloco | Status |
|-------|--------|
| Campanhas 1º | **C** |
| Entrada unificada título + placa | **C** (placa + atalhos simétricos no `#veiculo`) |
| Placa antes dos destaques | **C** (repo); produção = ops Edge/SQL |
| Destaques híbridos | **C** / **M** (qtd via `store_home_settings`) |
| Categorias após destaques | **C** (Onda 1) |
| Garagem na Home | **C** (Onda 1 — bloco leve) |
| Ofertas após categorias | **C** (Onda 1) |
| Confiança | **C** (Onda 1) |
| Rail Suspensão/direção | **Removido** (Onda 1) |

---

## 3. Decisões travadas

- Falha na placa → seleção manual imediata ([spec placa](./FAL_SPEC_BUSCA_POR_PLACA_2026-11-09.md)).
- Sempre perguntar antes de salvar na garagem (também após seleção manual no fluxo da placa).
- Placa ≠ prova de compatibilidade da peça.
- Compra sem cadastro antecipado total = **AJUSTE-030** evolução (hoje: login no `/checkout`).
- Quantidade de destaques configurável no admin (`featured_display_limit`).
- Sem segundo gateway neste plano (permanece Mercado Pago).
- Campanhas fora da vigência ou inativas não aparecem na loja.

---

## 4. Matriz H* — status × código (2026-11-10)

Legenda: **C** concluído · **M** melhorar · **P** parcial · **N** novo · **H** gate humano/ops

| ID | Entrega | Status | Evidência / gap |
|----|---------|--------|-----------------|
| H01 | Reorganizar ordem superior | **C** | Campanhas → placa → destaques |
| H02 | Campanhas / banners | **M→C** Onda 1 | Vigência `starts_at`/`ends_at`, imagem mobile; admin `/admin/home` |
| H03–H06 | Placa + confirm + manual + filtros | **P** + **H** | Código Evo1; falta SQL/Edge/secrets/smoke |
| H07 | Salvar na garagem (pergunta) | **P→M** Onda 1 | Também após manual; `isPrimary` no save |
| H08–H09 | Destaques qtd/ordem/visibilidade | **P→C** Onda 1 | Setting DB + admin |
| H10 | Atalhos categorias | **M** | Grid real; posição Onda 1; visual contínuo |
| H11 | Infos/garantia por categoria | **P**/N | Onda 2 (025) |
| H12 | Ofertas / kits | **P** | Ofertas sim; kits Onda 3 |
| H13 | Personalização por perfil | **N** | Onda 3 |
| H14 | Conteúdo técnico / SEO | **P** | JSON-LD ok; guias Onda 4 |
| H15 | Indicadores conversão | **N**/H | Onda 4 |

### Complementares C01–C20 (resumo)

| Cluster | Status | Onda |
|---------|--------|------|
| C01–C03 Busca/catálogo | **M** | 2 |
| C04–C05 PDP + garantia categoria | **M**/P | 2 |
| C06 Garagem multi + sync | **P** | 1 parcial / 3 guest local |
| C07 Carrinho | **M** | 2 |
| C08–C10 Guest / progressivo | **P** | 2 (sem guest total) |
| C11 Auth Google / OTP | **N** | 3+ |
| C12–C13 Pagamento / frete | **P** + **H** | 4 / G3–G4 |
| C14–C17 Ops / jurídico | **P**/H | 4 |
| C18–C19 Mobile / perf | **M** | 1+4 |
| C20 Indicadores | **N** | 4 |

**Não confundir:** plano mestre código encerrado ≠ produção plena. Programa = MVP prontidão (G1–G8) + placa Evo1.

---

## 5. Backlog H*/C* → AJUSTE

| ID | Entrega | AJUSTE | MVP |
|----|---------|--------|-----|
| H01 | Reordenar Home | 029 | Sim |
| H02 | Campanhas | 009 | Sim |
| H03–H06 | Placa + confirm + manual + filtros | 028 | PoC + ops |
| H07 | Garagem pergunta | 028 | Sim |
| H08–H09 | Destaques qtd/ordem | 021+022 | Sim |
| H10 | Categorias | 029/023 | Sim |
| H11 | Infos por categoria | 025 | Mínimo Onda 2 |
| H12 | Ofertas/kits | 022/013 | Ofertas sim; kits pós |
| H13 | Personalização | 029 | Pós-MVP |
| C08–C10 | Guest/progressivo | 030 | Parcial |
| C12–C13 | Pagamento/frete | 016/017/014 | Código + gates H |
| C16–C17 | Segurança/jurídico | 027 | Gates H |

---

## 6. Ondas de execução

| Onda | Escopo | Autorização |
|------|--------|-------------|
| 0 | Auditoria + este spec | Feito |
| 1 | Home polish + gaps placa/garagem leves | Código nesta marcha |
| Ops placa | SQL `cached_plates`, Edge, secrets, smoke VAL | Handoff humano |
| 2 | Catálogo, PDP, 025, carrinho | Pacote documentado |
| 3 | Garagem guest, kits, personalização | Pacote documentado |
| 4 | MP/frete prod, SEO, indicadores | Pacote + G3–G8 |

---

## 7. Critérios de aceite (núcleo)

- Ordem superior Campanhas → Placa → Destaques em desktop e mobile.  
- Campanha inativa ou fora da vigência não aparece.  
- Placa válida → confirmação → filtros no catálogo; falha → manual imediato.  
- Destaques: admin controla produtos, ordem, quantidade e visibilidade.  
- Compatibilidade nunca “garantida” só por placa.  
- Checkout guest total permanece **evolução** (hoje: login no `/checkout`).  
