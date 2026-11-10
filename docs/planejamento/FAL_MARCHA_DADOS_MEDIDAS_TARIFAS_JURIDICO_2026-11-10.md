# MARCHA — Dados (apps/medidas/tarifas) + jurídico formal

**Data:** 2026-11-10  
**Auth:** eFe — `MARCHA`  
**Loja eFe:** https://fal-pecas-automotivas-efe.netlify.app

---

## 1. Mapa de dados operacionais

| Domínio | Onde vive | Estado 2026-11-10 | Ação restante |
|---------|-----------|-------------------|---------------|
| **Medidas de produto** | `products.weight_kg`, `height_cm`, `width_cm`, `length_cm` (+ `*_origin`) | **100/100** com as 4 medidas | Manter no cadastro/import; auditoria periódica em novos SKUs |
| **Caixas / packing** | `shipping_box_templates` | **3** caixas | Conferir nomes/tara vs operação física |
| **Origem frete** | `store_shipping_origin` | **1** ativa (Guarulhos `07124543`) | Trocar `document` placeholder por **CNPJ real válido** (ME cart) |
| **Tarifas frete próprio** | `own_vehicle_tariffs` + `store_own_delivery_settings` | **2** tarifas | Completar faixas CEP/km se O1-D for uso real |
| **Serviços ME** | `me_shipping_services` | habilitados (PAC/SEDEX/.Package) | Homologar IDs vs conta ME live |
| **Aplicações veículo** | PVC + V3 year-range (código deployado) | Em produção eFe | Import master veículo sob demanda |

### Apps (cadastro)

- Admin Produtos / Applications / Vehicles / Home content / Own delivery / Melhor Envio — UI já no eFe.  
- Smoke admin API: `is_staff` + `admin_order_status_counts` **PASS** (staff `teste@gmail.com`).  
- UI `/admin/pedidos`: login manual (Supabase Site URL ainda `localhost:3000` — ajustar Redirect URLs para eFe).

---

## 2. Jurídico

| Página | Rota | Versão UI | Estado |
|--------|------|-----------|--------|
| Termos de uso | `/termos` | `2026-11-09` | **No ar** — texto operacional resumido |
| Privacidade | `/privacidade` | `2026-11-09` | **No ar** — resumido LGPD operacional |
| Trocas e devoluções | `/trocas-devolucoes` | `2026-11-09` | **No ar** — CDC/arrependimento + WhatsApp |

**Gate formal (G6):** revisão/assinatura de advogado e substituição do copy resumido por texto jurídico completo (razão social, foro, base legal LGPD, encargos, etc.).  
Código já avisa: *“Documento resumido operacional — versão jurídica completa pode ser publicada pela loja”*.

### Checklist advogado (humano)

1. Razão social / CNPJ / endereço fiscal no rodapé e termos.  
2. Política de privacidade completa (bases legais, retenção, encarregado).  
3. Trocas alinhadas a CDC + política comercial FAL.  
4. Atualizar `LEGAL_VERSIONS` + publish Netlify após aprovação.

---

## 3. STOP / próximo

| Item | Estado |
|------|--------|
| Mapa dados medidas/tarifas/origem | **FEITO** |
| Jurídico páginas públicas resumidas | **FEITO** (live eFe) |
| CNPJ origem ME real | **PENDENTE ops** |
| Redirect URLs Supabase → eFe | **PENDENTE ops** |
| Texto jurídico formal advogado | **GATE G6** |

**Assinatura:** MARCHA dados+jurídico mapa 2026-11-10 · G6 humano.
