# VAL — Testes IA Groq + validação busca

**Data:** 2026-11-11  
**Auth:** eFe — `FAÇA TESTES DA IA , VALIDE A BUSCA`  
**Projeto:** wtbp · Edge `interpret-search-nl` · model `openai/gpt-oss-20b`  
**Deploy Netlify:** não (flag `VITE_SEARCH_NL_LLM` no site ainda off)

## Vitest

`src/services/search` → **12/12 PASS**

## IA (Edge Groq) — frases NL

| # | Query | mode | Intent | Resultado |
|---|-------|------|--------|-----------|
| N1 | preciso de um pivo para o palio 2010 | groq | pivo · Fiat Palio 2010 · high | **PASS** |
| N2 | terminal do HB20 2015 1.0 | groq | terminal · Hyundai HB20 2015 1.0 · high | **PASS** |
| N3 | quero oleo para onix 2020 | groq | óleo · Chevrolet Onix 2020 · high | **PASS** |
| N4 | Nakata PVI1032 | groq | codeHint PVI1032 · high | **PASS** |
| N5 | axial de direcao hyundai hb20 | groq | axial… · Hyundai HB20 · high | **PASS** |
| N6 | ponteira HB20 2015 | groq | ponteira · HB20 2015 · high | **PASS** |
| N7 | HB20 One 2015 | groq | version=One · high | **ATENÇÃO** — cadastro só Unique; front com confiança alta no determinístico **não chama** LLM |
| N8 | algo para o gol bolinha | groq | Gol · version Bolinha · **low** | **PASS** (baixa confiança) |

## Busca RPC (intent aplicada → `search_products`)

| # | Params | SKUs | Resultado |
|---|--------|------|-----------|
| S1 | pivo + Fiat Palio 2010 | PVI1032 | **PASS** |
| S2 | terminal + HB20 2015 1.0 | TDI2116, TDI2117 | **PASS** |
| S3 | HB20 2015 | BRD2109, TDI2116, TDI2117 | **PASS** |
| S4 | q=PVI1032 | PVI1032 | **PASS** |
| S5 | axial + HB20 | BRD2109 | **PASS** |
| S6 | ponteira + HB20 2015 | TDI2116, TDI2117 | **PASS** |
| S7 | HB20 2015 version=One | 3 SKUs (RPC não zera) | **OK ops** — clarificação T05 ainda no determinístico |

## Conclusão

- Groq extrai intenção útil em NL real.
- Busca PVC continua correta com os params derivados.
- Site público: IA só após deploy único com `VITE_SEARCH_NL_LLM=1`.

## Assinatura

VAL IA Groq + busca · sem Netlify deploy · 2026-11-11
