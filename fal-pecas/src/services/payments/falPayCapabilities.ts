/** Cartão via Asaas (invoiceUrl / página segura — sem PAN na FAL). */
export const ASAAS_CARD_CHECKOUT_READY = true

/**
 * Crédito embutido no checkout (API Asaas com cartão).
 * Débito continua só via invoiceUrl — doc Asaas não permite débito via API.
 */
export const ASAAS_EMBEDDED_CREDIT_READY = true