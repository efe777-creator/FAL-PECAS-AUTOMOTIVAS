# Diagnóstico — loja “não carrega” / login falha

**Data:** 2026-10-30  
**Modo:** somente diagnóstico (sem troca de runtime)  
**Sintoma:** Netlify abre shell UI, seções ficam em **Carregando…**, login não autentica.

---

## Veredicto

| Camada | Estado | Evidência |
|--------|--------|-----------|
| Front Netlify | **OK** | `https://fal-pecas-automotivas.netlify.app/` renderiza home/login |
| Runtime canônico `wtbpwuiayednvlhvuhbh` | **DOWN / DNS NXDOMAIN** | `Resolve-DnsName` → nome não existe; `auth/v1/health` → falha de resolução |
| Chamadas no browser | **FAIL** | `/auth/v1/token` → `status=0` / size 0 (rede) |
| Projeto HF `owllmfcpbodqmoerdfxx` | ACTIVE (outro banco) | MCP lista só este; **não** é o canônico da loja |

**Causa raiz:** a loja aponta para Supabase **`wtbp…`**, que **não resolve mais na internet**. Não é bug de React/login isolado — o backend sumiu (projeto pausado longo / deletado / org inacessível).

---

## O que NÃO fazer

- Apontar Netlify / `.env` para `owllm…` (HF) — [adendo runtime](./FAL_IMP_01_ADDENDUM_RUNTIME_CANONICO_2026-10-08.md) proíbe HF como verdade comercial.
- Inventar novo project-ref sem decisão eFe + restore/migração.

---

## Ações humanas (ordem)

1. No dashboard Supabase (conta/org **efe777** / dono do `wtbp`):  
   - projeto ainda existe?  
   - **Paused** → **Restore**  
   - **Deleted** → ver se há backup / time travel / recriar + restore dump  
2. Confirmar DNS: `wtbpwuiayednvlhvuhbh.supabase.co` volta a resolver.  
3. Smoke: home deixa de ficar em “Carregando…” + login OK.  
4. Só então retomar smoke MP / MARCHA comercial.

---

## STOP

Smoke MP e MARCHA de pagamento **bloqueados** até `wtbp` voltar. Front Netlify íntegro; gap é **infra Supabase runtime**.
