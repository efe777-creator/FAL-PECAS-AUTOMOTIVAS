# Spec — Jornada Fase B: Expedição

**Data:** 2026-11-13  
**Auth:** eFe — MARCHA após Fase A  
**Depende:** Fase A análise→separação

## Objetivo

Operador vê medidas da cotação, registra divergência de volume, recota internamente (sem mudar frete do cliente), emite etiqueta ME ou registra frete próprio (apps + custo real), despacha e atualiza rastreio para o cliente.

## Escopo

1. Normalizar medidas ME (objeto ou array) no snapshot e seed de packing  
2. Recota etiqueta a partir do packing + serviço contratado; UX “usar packing”  
3. Frete próprio: opções de transporte (Uber/99/…), custo app vs cobrado (G8), link/código rastreio  
4. Pull rastreio ME quando possível; URL clicável no cliente  
5. WhatsApp agendamento: **fora** (próxima onda)

## Aceite

- Admin vê medidas contratadas vs packing (ME e own)  
- Recota interna não altera `orders.shipping_amount`  
- Own: selecionar app, informar custo real, salvar rastreio/link  
- Cliente vê link de rastreio quando houver URL ou código reconhecível  
