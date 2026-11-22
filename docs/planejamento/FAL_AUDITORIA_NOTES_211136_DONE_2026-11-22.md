# Auditoria — Notes_211136 · itens DONE

**Data:** 2026-11-22 · **Branch:** `dev` · **Sem MAIN**  
**Decisão eFe:** #14 reaberto como **PENDING** (análise minuciosa de políticas). Fatia técnica `f712ac7` permanece no código.

## Quadro geral

| # | Status Notes | Veredito técnico | Resumo |
|---|--------------|------------------|--------|
| 1 | DONE | parcial | Galeria kit OK (admin sync + merge PDP); kits antigos podem precisar re-salvar BOM |
| 2 | DONE | sólido | Garagem/jornada já cobertas; residual ops G7 smoke |
| 3 | DONE | sólido | Cache frete/CEP/PVC; 1ª cotação ainda rede |
| 4 | DONE | sólido | Ativos/Inativos + arquivar some da lista |
| 5+11 | DONE | sólido | Favoritos com hidratação + RPC; fallback se RPC ausente |
| 6 | DONE | parcial | Assert/band/LLM merge OK; falta VAL placa real + flags FIPE/motor ops |
| 7 | DONE | sólido | Card mobile enxuto |
| 8 | DONE | sólido | Header mobile = logo + busca + ☰ |
| 9 | DONE | parcial | Rotas + “ver no catálogo” com veículo; smoke E2E amplo fora |
| 10 | DONE | parcial | Fatia coerência (Minha Garagem / peça / busca); marketing amplo fora |
| 12 | DONE | sólido | Destaques sem backfill indevido quando há curadoria |
| 13 | DONE | parcial | Promoções + gate itens/kits; heurística se gate vazio; título lista Home fora |
| 14 | **PENDING** | fatia técnica só | Reaberto — rigor jurídico/operacional pendente |
| 15 | PENDING | — | Ads / Merchant |
| 16 | PENDING | — | Portal B2B |
| 17 | PENDING | — | Funil WhatsApp |
| 18 | DONE | parcial | Destino campanha filtrado OK; widget `campaign` / `new_arrivals` ainda **planned** |

## Residuais que não reabrem Notes (exceto #14)

- **Widgets Home:** `campaign` e `new_arrivals` = planned (loader stub).
- **#6 ops:** VAL ApiPlacas real; secrets FIPE/motor só quando eFe ligar.
- **#9/#10:** smoke manual amplo e copy marketing = backlog, não bug de fechamento.
- **Trilha paralela:** Guias Adaptive / mestre híbrido — fora da fila Notes 15–17.

## #14 — o que a fatia técnica já cobre vs o que falta no rigor

**Já no código (`f712ac7`):** bullets devolução completos no pós-venda; Register = checkout (termos+privacidade+trocas); privacidade aponta `/conta`; rodapé reabre cookies.

**Para fechar o Notes (análise minuciosa):**

1. Revisar textos legais (termos, privacidade, trocas) com critério jurídico/operacional da loja.
2. Garantia: página ou bloco dedicado vs só bullets CDC.
3. Aceite com versão (`place_order` / registro) auditável.
4. Exclusão/correção de conta: fluxo real em Minha Conta (hoje link + canais).
5. Cookies × Ads: scripts marketing só com consent (#15 acoplado).
6. VAL ponta a ponta (checkout, cadastro, pós-venda, rodapé).

## Próximos sensatos

1. **#14** — plano de rigor + VAL (antes de escala Ads).
2. **#15** Ads/Merchant — após política de cookies/consent clara.
3. **#17** Funil WhatsApp — valor comercial, menor que B2B.
4. **#16** Portal B2B — maior superfície; por último nesta fila.

## Referências

- REF canônico: [FAL_ANALISE_ERROS_NOTES_211136_REF_2026-11-21.md](./FAL_ANALISE_ERROS_NOTES_211136_REF_2026-11-21.md)
- VAL #14 (fatia técnica, Notes reaberto): [FAL_MARCHA_NOTES_14_LGPD_VAL_2026-11-22.md](./FAL_MARCHA_NOTES_14_LGPD_VAL_2026-11-22.md)
