# Auditoria Fase 5 — 2026-10-03

**STATUS: APROVADA**

**Escopo:** experiência do cliente autenticado (perfil, endereços, veículos, favoritos, pedidos consulta).  
**Sem checkout / pagamento / frete.**

## Segurança

| Item | Resultado |
|------|-----------|
| Trigger `profiles_protect_role` | OK — role não muda sem staff |
| RLS addresses / vehicles / favorites / orders | Já existia; mantida |
| `/conta/*` ProtectedRoute + `from` | OK |
| Staff vê Painel Admin; cliente não | OK (F4B + AccountLayout) |
| Sem service_role no browser | OK |

## CA (resumo)

| Bloco | Resultado |
|-------|-----------|
| CA-01…07 auth/perfil | OK |
| CA-08 role protegida | OK (trigger) |
| CA-09…14 endereços | OK |
| CA-15…19 veículos salvos | OK (`version_id`) |
| CA-20…23 favoritos | OK |
| CA-24…25 pedidos consulta | OK (empty se sem dados) |
| CA-26…29 acesso/RLS | OK |
| CA-30…33 F4/catálogo | Intactos |
| CA-34…36 build/mobile | Build OK; layout responsivo |

## Dependência Fase 6

Criação de pedidos, pagamento e frete permanecem na Fase 6.

## Pendências

1. Login por username (backend seguro) — futuro  
2. ViaCEP — futuro  
3. Favoritos locais para visitante — fora do escopo  
