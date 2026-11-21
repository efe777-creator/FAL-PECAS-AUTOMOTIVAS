/** Adapter WhatsApp OTP: mock | zapi */

export interface WhatsAppOtpProvider {
  sendText(phoneE164: string, message: string): Promise<void>
}

export function createWhatsAppOtpProvider(): WhatsAppOtpProvider {
  const mode = (Deno.env.get('WHATSAPP_OTP_PROVIDER') ?? 'mock').toLowerCase().trim()
  if (mode === 'zapi') {
    return createZapiProvider()
  }
  return createMockProvider()
}

function createMockProvider(): WhatsAppOtpProvider {
  return {
    async sendText(phoneE164, message) {
      // Não logar plaintext do código — smoke usa debugCode na resposta HTTP.
      console.log(`[whatsapp-otp:mock] to=${phoneE164} chars=${message.length}`)
    },
  }
}

function createZapiProvider(): WhatsAppOtpProvider {
  const instance = (Deno.env.get('ZAPI_INSTANCE_ID') ?? '').trim()
  const token = (Deno.env.get('ZAPI_TOKEN') ?? '').trim()
  const clientToken = (Deno.env.get('ZAPI_CLIENT_TOKEN') ?? '').trim()

  if (!instance || !token) {
    throw new Error('Z-API incompleto: ZAPI_INSTANCE_ID + ZAPI_TOKEN')
  }

  return {
    async sendText(phoneE164, message) {
      const url = `https://api.z-api.io/instances/${instance}/token/${token}/send-text`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (clientToken) headers['Client-Token'] = clientToken

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: phoneE164,
          message,
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('[whatsapp-otp:zapi]', res.status, body.slice(0, 200))
        throw new Error('Falha ao enviar WhatsApp')
      }
    },
  }
}
