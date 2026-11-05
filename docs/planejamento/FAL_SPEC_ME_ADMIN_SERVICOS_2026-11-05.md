# Spec — Admin Melhor Envio: catálogo, nomes, logos, seleção loja

**Data:** 2026-11-05  
**Status:** APROVADO (eFe · MARCHA)  
**Política:** D-FRETE B · D12  
**IDs plano:** ME-C4 · ME-C5 · P-ME-3

## Decisões

| Tema | Decisão |
|------|---------|
| Escopo UI | Pacote C: allowlist + nomes + status na tela Melhor Envio |
| Default seed | PAC / SEDEX / Jadlog Package **ligados**; demais do catálogo **desligados** |
| Catálogo | Comuns no seed + botão **Atualizar** (cotações + sync ME) |
| Cliente | Só serviços `enabled`; ordem **preço ↑** |
| Identidade | Logo + nome fantasia da transportadora (`company` ME) |
| Nome no site | Opcional (`display_name`); senão company + serviço ME |
| Persistência | Tabela `me_shipping_services` (não JSON blob) |
| Filtro | Server-side em `quote-shipping` |

## Fora de escopo

- Configurações gerais de envio (hub stub separado)
- Opt-in Netlify default ME (ME-C9)
- Purchase/etiqueta (Expedição)
- Frete próprio (tela própria)

## Aceite

- [ ] `/admin/logistica/melhor-envio` lista opções com logo/empresa/serviço
- [ ] Admin liga/desliga e salva `display_name`
- [ ] Atualizar importa serviços novos (desligados)
- [ ] PDP/carrinho só opções enabled; labels/logos corretos; preço ↑
- [ ] Status: origem, provider, token present (sem secret)
