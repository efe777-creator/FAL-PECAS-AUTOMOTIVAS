# FAL — PLANO 2B · Immersive Garage — Experiência visual do veículo

**Status:** **Camada 1 (E0–E4) na `dev`** — fundação de configuração visual + viewer **procedural**. **Não** é produto 3D realista (Camada 2 / GLB). Fase A = consolidação. Fase B = 3D real. Fase C = AR (bloqueada).  
**Data:** 2026-11-18  
**Branch de trabalho:** `dev`  
**Branch de produção:** `main` (não usar para desenvolvimento)  
**Natureza:** documento canônico + evolução de status (histórico Etapa 0 preservado)

**Pré-requisito obrigatório:** [PLANO 2A — Vehicle Identity](./FAL_PLANO2A_VEHICLE_IDENTITY_2026.md) (**APROVADO eFe · IMPLEMENTADO E1–E5 · §24**) · [VAL-plano2a](../../fal-pecas/docs/VAL-plano2a-vehicle-identity.md)  
**Contratos herdados:** PLANO 2A §19 (chave = `vehicle_identities.id`)  
**Direção:** [FAL_GARAGE_VISAO_FUNCIONAL.md](../futuro/FAL_GARAGE_VISAO_FUNCIONAL.md)  
**VAL 2B:** [VAL-plano2b-immersive-garage.md](../../fal-pecas/docs/VAL-plano2b-immersive-garage.md) (PASS só com evidências executadas)

---

## 1. Objetivo e fora de escopo

### 1.1 Objetivo

Complementar a identidade permanente do veículo (2A) com uma **camada visual** (configuração de aparência, preview de peças, eventual 3D/immersive) **sem** criar segundo cadastro de veículo e **sem** misturar fato técnico com cosmético.

### 1.2 Fora de escopo do PLANO 2B (Etapa 0 — histórico)

- Reabrir decisões D1–D11 / A1–A3 do 2A  
- Mutar histórico AUTHORIZED, ownership, G7 ou commerce por “salvar pintura”  
- ERP de oficinas / marketplace profissional  
- Deploy produção / `main`  
- Afirmar instalação real só porque o visual mostra peça montada  

### 1.3 Princípio central

| Camada | Dono | Exemplos |
|--------|------|----------|
| **Fato / técnico (2A)** | Events, evidence, commerce FAL, ownership | Compra, instalação declarada, km, NF |
| **Visual (2B)** | Config de aparência ligada à identity + owner | Cor demonstrativa no viewer, roda em preview, layout 3D |

**Visual ≠ fato.** Instalação 2A validada *pode* refletir no modelo (opt-in); o inverso **nunca** cria evento 2A sozinho.

Pintura simulada ≠ cor oficial cadastrada · peça exibida ≠ comprada · comprada ≠ instalada · modelo 3D ≠ compatibilidade mecânica · asset IA ≠ aparência exata da versão.

---

## 2. Contratos de integração (canônicos — herdados do 2A §19)

| Caso | 2A | 2B |
|------|----|----|
| Pintura no visualizador | Sem evento automático | Salva config visual (preferência do owner) |
| Compra rodas FAL | Evento compra + snapshot G6 | Preview visual opcional (read-only) |
| Instalação | Evento 2A validado | Pode refletir “instalado” no modelo (opt-in) |
| Transferência | Governa privacidade | Configs **privadas** não seguem automaticamente |
| Chave | `vehicle_identities.id` | FK única; **sem** segundo cadastro |

Sem segunda infraestrutura de identidade. Sem clonar `customer_vehicles` como source of truth visual.

### 2.1 Duas camadas de produto (obrigatório distinguir)

| Camada | Nome | Conteúdo | Estado |
|--------|------|----------|--------|
| **1** | Visual Configuration | Persistência de aparência, preview G7, sync opt-in, viewer procedural + fallback 2D | E0–E4 na `dev` (fundação) |
| **2** | 3D Asset Visualization | Biblioteca GLB/glTF, texturas, compatibilidade, licenças, ADM, veículo realista | **Não implementada** — Fase B |

**Proibido** apresentar o viewer procedural (E3) como visualizador 3D realista do veículo FAL.

### 2.2 Limitações do viewer procedural atual (E3)

- Geometria **procedural** (Three.js), **sem** GLB/glTF.  
- Sem carroceria/texturas/variantes de geração-facelift reais.  
- Serve como progressive enhancement e contrato de adapter futuro.  
- Fallback SVG/2D obrigatório quando WebGL indisponível ou preferência `2d`.  
- Lazy-load: páginas sem módulo visual não devem carregar Three no caminho crítico.

### 2.3 Identidade permanente vs preferência do proprietário

| Informação | Natureza |
|------------|----------|
| Modelo 3D compatível (Fase B) | Associação canônica do veículo |
| Aparência de fábrica (Fase B) | Referência |
| Cor/rodas demonstrativas | Preferência do **proprietário** (`owner_customer_id`) |
| Câmera/ângulo | Preferência de visualização |
| Personalização futura | Particular ou compartilhada conforme autorização |

A identity acompanha o veículo. A config `private_owner` pertence a quem a criou — **não** é automaticamente a preferência do novo dono após transferência.

### 2.4 Preview ≠ instalação (E2)

Três estados distintos:

1. Peça no catálogo / compatível (não é fato de posse).  
2. Peça adquirida / associada (G7 `bought` / `associated`).  
3. Peça instalada com registro elegível (G7 `installed_declared` e/ou `vehicle_events.instalacao`).

Compra **não** vira instalação. Preview **não** afirma instalação física sem sync opt-in + fato elegível.

### 2.5 Motor de visualização alvo (contrato; GLB = Fase B)

**FAL Vehicle Visualization Engine** — interface única; UI (Garagem / ADM) não escolhe tecnologia.

| Adapter | Papel | Quando |
|---------|-------|--------|
| Procedural Viewer | Simplificado atual (E3) | Sem asset GLB aprovado / device limitado |
| GLB Viewer | Modelos realistas | Fase B + asset disponível |
| 2D Fallback | SVG / imagem | Sem WebGL / pref / falha |
| Future XR Adapter | Imersão | Fase C + gate |

Na Fase A: **não** substituir o procedural; apenas documentar o contrato.

---

## 3. Modelo de dados

### 3.1 `vehicle_visual_configs` (**Implementado · E1 · Camada 1**)

Migration: `fal-pecas/supabase/migrations/20261118230000_plano2b_e1_vehicle_visual_configs.sql`  
(ordem após `…220000` plano2a E5 — conferida na sequência local.)

- `vehicle_identity_id` (FK)  
- `owner_customer_id` / `ownership_period_id`  
- `payload` jsonb (E1: `bodyColorHex`, `accentHex`, `wheelStyle`, `finish`, `label`, `notes`)  
- `visibility` (`private_owner` \| `period` \| `shared` \| `public_vehicle`) — UI atual grava `private_owner`  
- RPC `upsert_vehicle_visual_config` — **não** toca `vehicle_events` / G7  
- Unique `(vehicle_identity_id, owner_customer_id)`

**Etapa 0 (histórico):** esta tabela estava **proposta / não implementar na Etapa 0**. Foi entregue na Etapa 1 via MARCHA.

### 3.2 `vehicle_visual_presets` / assets (**Proposto · Fase B · Camada 2**)

Catálogo de meshes/texturas/GLB versionados; **não** misturar com `vehicle_evidence`.

### 3.3 Ligação commerce (**Implementado · E2**)

Preview lê G7 / product id / imagens — **não** inventa `bought`.

### 3.4 Segurança e transferência de propriedade (Camada 1)

| Regra | Detalhe |
|-------|---------|
| Identity | Permanece com o veículo |
| Config `private_owner` | Não herda para o novo proprietário |
| Novo owner | Começa com defaults visuais (ou cria a própria config) |
| Share 2A | Não concede editor visual |
| Compartilhar ≠ transferir ≠ publicar | Autorizações distintas |
| Promoção de prefs privadas | **Fora da Fase A** (sem checkbox no wizard) |

RLS: SELECT/INSERT/UPDATE isolados por `owner_customer_id` (e staff). Transfer RPC 2A **não** reatribui `vehicle_visual_configs`.

### 3.5 Compatibilidade e procedência de modelos (**Contrato futuro · Fase B**)

Além de marca/modelo/ano: geração, carroceria, facelift, config externa, variantes/mercado.  
Estados de associação: `pendente` \| `aprovada` \| `rejeitada` \| `revogada` (desativar sem apagar histórico).

Cada ativo: fonte (adquirido / IA / próprio), fornecedor, licença, uso comercial, redistribuição, datas, versão, aprovador. **IA ≠ livre comercial automático.**

Segurança de arquivo (quando houver upload): tamanho, MIME/extensão, estrutura, limites de polígonos/texturas, storage privado de originais, distribuição só de aprovados.

### 3.6 Performance e acessibilidade

Indicadores a medir (baseline antes de metas numéricas):

| Indicador | Verificar |
|-----------|-----------|
| Bundle inicial | Three não no caminho crítico de páginas sem 3D |
| Carregamento | Tempo até primeira visualização útil |
| FPS | Fluidez na rotação |
| Memória | Mobile |
| Texturas | Tamanho/resolução (Fase B) |
| WebGL | Fallback 2D |
| Rede | Conexão lenta |
| Recuperação | Falha de load / perda de contexto WebGL |

Acessibilidade: imagem/SVG alternativa, controles rotulados, teclado quando aplicável, `prefers-reduced-motion`, mensagens claras, **zero** dependência de 3D para operações FAL.

Observabilidade (Fase B+): modelo, resultado load, erros, tempo, fallback, categoria device, versão asset — sem PII desnecessária.

---

## 4. Experiência (Camada 1 atual)

1. Entrada: `/conta/veiculos/:membershipId?modulo=visual`.  
2. Viewer: 2D SVG e/ou 3D procedural (pref `auto` \| `2d` \| `3d`).  
3. Toggle opt-in: refletir instalações 2A no modelo (E4).  
4. Preview de peças FAL (E2) — cards read-only.  
5. Tokens: design system FAL da loja — **não** copiar Painel ADM.  
6. Deep-link Immersive dedicado / GLB realista: **Fase B+**.

---

## 5. Segurança e privacidade (resumo)

- Config `private_owner` **não** migra na transferência (sem promoção automática; sem checkbox nesta fase).  
- Share 2A **não** concede editor visual.  
- URLs de assets 3D: bucket privado + signed URL — **quando** existir Camada 2.  
- Auditar SELECT (não só UPDATE): novo owner não deve ler prefs privadas do anterior.

---

## 6. Roadmap

### 6.1 Histórico de etapas (Camada 1 · entregue na `dev`)

| Etapa | Escopo | Status |
|-------|--------|--------|
| **0** | Documento + aprovação eFe | Feito |
| **1** | Config visual 2D + persistência | Feito (`287fdaf`) |
| **2** | Preview peça FAL read-only | Feito (`00b27d6`) |
| **3** | Viewer 3D **procedural** + fallback 2D | Feito (`76c24bb`) — **≠ realismo GLB** |
| **4** | Sync opcional instalado 2A → modelo | Feito (`1ac7eab`) |

### 6.2 Fases de produto (canônicas pós revisão eFe)

| Fase | Nome | Conteúdo | Auth |
|------|------|----------|------|
| **A** | Consolidação | Auditoria E1–E4, VAL, privacidade, testes, sync docs; **sem** GLB/AR | Em curso na `dev` |
| **B** | Evolução 3D real | Biblioteca GLB, viewer realista, compatibilidade, licenças, ADM, performance, a11y, observabilidade | Nova autorização |
| **C** | Imersão | AR/WebXR | MARCHA + gate explícito |

AR **não** antecede Camada 2. GLB **não** entra na Fase A.

---

## 7. Critérios de aceite por etapa / checklist

### 7.1 Checklist Camada 1

- [x] eFe aprova via MARCHA (E1–E4)  
- [x] Contratos §2 (sem segundo identity)  
- [x] E1 config 2D + persistência  
- [x] E2 preview G7 read-only  
- [x] E3 procedural + WebGL detect + fallback 2D (com limitação §2.2)  
- [x] E4 sync opt-in sem write-back  
- [x] Branch `dev` apenas  
- [x] Fase A consolidação **código/contrato** (doc + A1 + privacidade + Vitest 37 PASS)  
- [ ] Fase A smoke manual operador (antes de qualquer auth `main`)  
- [ ] Fase B (GLB) — nova auth  
- [ ] Fase C (AR) — MARCHA + gate  
- [ ] Deploy `main`  

### 7.2 Aceite E1–E4 (resumo)

| Etapa | Aceite |
|-------|--------|
| E1 | Salvar/reload config; não cria evento 2A; isolada por owner |
| E2 | Preview read-only; compra ≠ instalação; UI não afirma instalação física só pelo card |
| E3 | Lazy Three; sem WebGL → 2D; não declara realismo GLB |
| E4 | Sync OFF sem marcadores; ON só fatos elegíveis; idempotente; sem write-back |

---

## 8. VAL e evidências de homologação

Arquivo: `fal-pecas/docs/VAL-plano2b-immersive-garage.md`.

- Matriz E1–E4 + privacidade + regressão 2A.  
- **PASS só após execução** com evidências.  
- Não marcar consolidação completa sem A1–A5.

### 8.1 Confirmação técnica Camada 1 (estado código)

| Item | Valor |
|------|--------|
| Documento | este arquivo |
| Branch | `dev` |
| Tip (revalidar A1) | `1ac7eab` |
| E1 Migration | `20261118230000_plano2b_e1_vehicle_visual_configs.sql` |
| E2 | `vehicleVisualPartPreview.ts` |
| E3 | `VehicleViewer3D.tsx` procedural · `canUseWebGL` · prefs |
| E4 | `visualInstallSync.ts` · opt-in |
| UI | `?modulo=visual` |
| Camada 2 / GLB | **Não** |
| AR | **Não** |

---

## 9. Limites de escopo e proibições (Fase A)

**Não fazer na Fase A:**

- Substituir viewer procedural / introduzir GLB / biblioteca / geração IA  
- AR / WebXR / componentes interativos imersivos  
- Sync automática (write-back) ou ligar opt-in por default sem decisão  
- Alterar regras de negócio do 2A  
- Migrar/promover configs `private_owner` (sem checkbox)  
- Merge `main` / deploy / migrations novas sem necessidade demonstrada + auth  

**Sempre proibido (qualquer fase):** gravar fato 2A a partir do viewer; confundir Camada 1 com produto 3D realista.
