# FAL — Análise de erros · Notes_211136 (referência)

**Data:** 2026-11-21  
**Branch:** `dev`  
**Fonte:** `attachments/.../Notes_211136.pdf` (6 páginas, extração texto)  
**Método:** um item por marcha — diagnosticar → validar estado → ajustar → testar → marcar status → só então o próximo.

## Status

| # | Item | Status |
|---|------|--------|
| 1 | Kits: fotos individuais dos itens ao cadastrar, refletir na PDP do kit (além da principal) | **DONE** |
| 2 | Polimento e funções da garagem | PENDING |
| 3 | Carregamentos/hierarquias mais rápidos (frete PDP/garagem lento) | PENDING |
| 4 | Arquivar/inativar: sumir da lista; filtro ativos/inativos (2 checkboxes) | PENDING |
| 5 | Ajustar e melhorar favoritos | PENDING |
| 6 | Placa consultada errada — assertividade do lookup | PENDING |
| 7 | Cards poluídos / grandes no mobile | PENDING |
| 8 | Header mobile muito cheio | PENDING |
| 9 | Auditoria jornada real: caminhos errados, PDP relacionados, “ver no catálogo” filtrar certo | PENDING |
| 10 | Textos/instruções do site — copy e coerência | PENDING |
| 11 | Corrigir tela de favoritos | PENDING |
| 12 | Seção destaques: configs não respeitadas | PENDING |
| 13 | Ofertas/promoções: nome, itens + kits, textos e CTAs | PENDING |
| 14 | LGPD, segurança, políticas garantia/devolução | PENDING |
| 15 | Meta Ads / Google Ads / Merchant (loja Google) | PENDING |
| 16 | Portal B2B | PENDING |
| 17 | Funil WhatsApp e sistema | PENDING |
| 18 | Home/campanhas: linkar produtos, categorias, grupos, veículos → página filtrada | PENDING |

## Texto extraído (PDF)

### #1 Kits / fotos
Ajustar tela dos kits. Na tela do kit já devem mostrar as fotos individuais de cada item quando selecionado ao cadastrar e isso reflete na tela do produto (kit) tendo mais fotos além da principal que colocarmos caso ponha.

### #2 Garagem
Vamos garantir o polimento e funções da garagem.

### #3 Performance
Verificar carregamentos/hierarquias; deixar mais rápidos e fluidos — lento ao consultar frete na tela do produto ou na garagem.

### #4 Ativos/inativos
Ao arquivar/inativar um produto ele deve sumir da lista; opção de seleção ativos e inativos (duas caixinhas).

### #5–#6 Favoritos + placa
Melhorar favoritos. Placa saiu errada — validar assertividade (primeiro erro observado; regra base ok).

### #7–#8 Cards + header mobile
Cards poluídos e grandes no mobile. Header mobile muito cheio.

### #9–#10 Auditoria + copy
Usar o site de verdade: caminhos errados/incompletos; PDP itens relacionados; “ver no catálogo” filtrar corretamente. Analisar textos/instruções.

### #11 Favoritos (tela)
Ajustar e corrigir tela de favoritos.

### #12–#13 Destaques + ofertas
Configurações da seção de destaque não refletidas. Melhorar ofertas/promoções (nome, itens promocionais + kits, textos/CTAs).

### #14–#18 Estratégia
LGPD/normas/políticas; Meta/Google Ads/Merchant; portal B2B; funil WhatsApp; home/campanhas com deep-link de seleção.

## Log de marchas

### #1 · 2026-11-21 — DONE

**Diagnóstico:** Admin já mostrava thumbs na busca e na BOM. Sync antigo só copiava a 1ª foto se o kit estivesse vazio. PDP do kit usava só `images` do kit; composição sem foto.

**Ajuste:**
- `adminEnsureKitImageFromComponents` → sincroniza **todas** as capas dos componentes na galeria do kit (sem duplicar `storage_path`).
- PDP: `mergeKitGalleryWithComponentImages` + thumbs em `PdpKitCompositionBlock`.
- Composição loja carrega `imageUrl` por item.

**Testes:** `tsc` PASS · `kitGalleryMerge.test` + `productImages.test` PASS (8).

**Próximo:** #2 Polimento e funções da garagem.
