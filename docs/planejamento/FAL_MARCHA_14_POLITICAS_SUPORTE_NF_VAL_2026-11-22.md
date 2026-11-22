# VAL — #14 Políticas · Suporte · NF · Pedidos (2026-11-22)

**Branch:** `dev` · **MAIN/produção:** não  
**Plano:** `termos_detalhados_fal_d0521c02.plan.md`  
**Commits:** `c0e011f` (impl) · `945fad8` (VAL status) · sessão VAL abaixo

---

## Sessão de teste e validação (2026-11-22 ~16:08)

### Evidências automatizadas
| Check | Resultado |
|-------|-----------|
| Vitest (legal + pós-venda + sitemap + timeline) | **23/23 pass** |
| `tsc --noEmit` | **OK** |
| `vite build` | **OK** (~10s; aviso de chunk size pré-existente) |
| SQL `wtbp` | `legal_acceptance` col ✓ · `place_order` com legal ✓ · OFD tabela ✓ · bucket privado ✓ · 3 policies RLS ✓ |

### Browser local (`http://127.0.0.1:5173`)
| Rota | H1 / conteúdo | OK |
|------|---------------|----|
| `/suporte` | Central + 3 H2 + **8 cards** + form (assunto/pedido/mensagem) + CTA WhatsApp + “5 dias úteis” | ✓ |
| `/termos` … `/compatibilidade` (8) | Título + versão + **Voltar à Central** | ✓ |
| `/frete-entrega` | “Melhor Envio” + “não confundir com MEI” | ✓ |
| `/trocas-devolucoes` | Sem lacre absoluto · Problema · garantia distinta | ✓ |
| Footer Institucional | Central + 8 políticas + Preferências cookies | ✓ |

### Checklist §9 do prédão

| Item | Status | Evidência |
|------|--------|-----------|
| 8 políticas completas e acessíveis | **PASS** | Browser 8/8 + `LEGAL_POLICY_CARDS` |
| `/suporte` com 3 seções | **PASS** | H2: Termos e Políticas · Nosso Compromisso · Atendimento |
| Navegação Central/Footer/checkout/conta | **PASS** | Footer + checkout/register 4 links + detalhe pedido |
| Form + WhatsApp via adapter | **PASS** | `activeSupportChannel` / `supportChannel.ts` |
| Melhor Envio (não MEI) | **PASS** | `/frete-entrega` + antiregress ME |
| NF manual + camada evolutiva | **PASS** | `FiscalDocumentService` + admin/cliente + DB |
| Meus Pedidos + Problema + kits s/ auto-aprovação | **PASS** | Label CTA/painel; copy kits; análise operador |
| Aceite 4 docs + versões no pedido | **PASS** | Checkout payload + coluna remota |
| Arrependimento: ambiente + confirmação imediata + sem lacre | **PASS** | Toast desistência; copy lacre; painel no pedido |
| Garantia ≠ 7 dias; tipagem ocorrências | **PASS** | `/garantia` + `postSaleMotives` |
| Cookies: recusa marketing sem bloquear | **PASS** | Banner “Só essenciais” |
| Dec. 7962 ≤5 dias | **PASS** | `/suporte` + `/garantia` + trocas |
| Responsivo; testes; build; sem regressão | **PASS** | Mobile layout no screenshot; testes; build |

**Veredito sessão:** prédão #14 **VALIDADO** na `dev` (código + DB + browser). Sem MAIN.

---

## Diagnóstico (M0)

| Gap | Antes | Depois |
|-----|-------|--------|
| 3 rotas legais rasas | `/termos` `/privacidade` `/trocas-devolucoes` | **8** políticas + `/suporte` |
| Sem Central | — | `/suporte` 3 seções |
| Aceite 3 docs | Checkout/Register | **4** docs |
| `place_order` sem versões | — | `orders.legal_acceptance` |
| Label “Ajuda…” | Conta | **Problema com meu pedido** |
| NF pedido | Ausente | Serviço + UI + bucket |
| Melhor Envio | OK | + página `/frete-entrega` |

## Migrations (`wtbp`)

1. `orders_legal_acceptance` ✓  
2. `order_fiscal_documents` ✓  
3. `harden_sanitize_order_legal_acceptance` ✓  

## Pendências / fora

- CNPJ + advogado/contador (go-live)  
- Emissor NF automático + notify  
- Inventário cookies/tags (#15)  
- Reorder 100% blocos detalhe (urgente no topo mantido)  

## Status

`origin/dev` atualizado · MAIN intocado · #14 fechado para próxima onda (#15) quando autorizada.
