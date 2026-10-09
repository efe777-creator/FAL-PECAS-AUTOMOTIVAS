# Contrato PDP v0.1 — produto público (domínio)

**Data:** 2026-10-09  
**Gate:** IMP-11 M6  
**Status:** **aceito** 2026-10-09 (marcha eFe) — UI domínio implementada; redesign mockup/F11 permanece fora  
**Fontes:** PRD §24, ESPECIFICACAO_FASE3 §10–15/§24, RELATORIO_FASE3, IMP-07, mockup responsável 2026-10-09, diagnóstico visual IMP-11 §18

---

## 1. Escopo

Define o **contrato de domínio e blocos** da página `/produto/:id`.  
Não é wireframe pixel-perfect. Layout visual só após aceite deste v0.1.

---

## 2. Dados obrigatórios (não inventar)

| Bloco | Fonte | Regra |
|-------|--------|--------|
| Identidade | `products` | `name`; `Referência:` = `commercial_ref \|\| sku` (mesmo valor do card D1) |
| Fabricante da peça | `product_brands` | Exibir se cadastrado (`FABRICANTE_LABEL`) |
| Posição / lado | attrs produto | Só se preenchidos |
| Preço | `resolve_product_price` / `displayPrice` | Mesma resolução do catálogo/carrinho (FIND-006) |
| Disponibilidade | `is_available` / `available` | Sem inventar estoque numérico na loja |
| Aplicações | PVC | Lista fiel; empty = `APPS_EMPTY_LABEL`; agrupamento por montadora **opcional** na PDP (card já usa M3) |
| Referências N | `product_references` | Exibir códigos ativos sem inventar |
| Imagens | `product_images` / Storage | Principal se URL; senão placeholder; incompleto sem inventar foto |
| Descrição | `short_description` / `description` | Campos já no schema; **render** só após layout aprovado |

---

## 3. Ações

| Ação | Obrigatório | Nota |
|------|-------------|------|
| Adicionar ao carrinho / qty | Sim (F3 + relatório) | Preço unitário = resolvido no add |
| Favoritar | Mantém comportamento atual | Auth gate |
| WhatsApp | Mantém se já na PDP | Mensagem com referência comercial |
| Voltar / breadcrumb | Opcional UX | Fora do domínio mínimo |

---

## 4. Alinhamento com o card (IMP-11 M1–M5)

| Tema | Card (implementado) | PDP (este contrato) |
|------|---------------------|---------------------|
| Rótulo código | `Referência:` | Mesmo rótulo na próxima marcha de UI |
| Title case | Exibição | Exibição; match key intacta |
| “A partir de” | Só se `listPrice > resolved` | Avaliar na PDP só se houver variação comprovada; senão preço único |
| CTA | Ver produto → PDP | Compra / carrinho na PDP |
| Apps | Grupos por montadora | Dados PVC; UI agrupada **após** aceite layout |

---

## 5. Explicitamente fora deste v0.1

- Redesign F11 / galeria thumbs / accordions do mockup sem aceite  
- Import em massa de apps/imagens (FIND-004)  
- Frete, MP, repair, reabrir IMP-02…10  
- Schema / migrations novas  

---

## 6. Aceite para descongelar código PDP

- [x] eFe aprova este v0.1 (marcha 2026-10-09)  
- [x] Checklist visual mínimo (rótulos + preço + apps + CTA compra) — [VAL PDP](./FAL_IMP_11_PDP_VAL_2026-10-09.md)  
- [x] Regressão FIND-006 / IMP-07 mantida (Vitest labels/groups)  

**Feito:** UI PDP domínio alinhada ao card.  
**Próximo (opcional):** redesign mockup/F11 só com novo aceite; smoke wtbp; MP humano.
