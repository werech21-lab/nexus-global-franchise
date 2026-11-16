// Server only: imported by route handlers. Never import from client components.
import { createHmac, timingSafeEqual } from 'node:crypto'

const API = 'https://api.lemonsqueezy.com/v1'

/** Tag put in checkout custom data so webhooks from other products in the same store are ignored. */
export const COMMISSION_SOURCE = 'nexus-global-franchise'

export type LemonConfig = {
  apiKey: string
  storeId: string
  variantId: string
}

export function lemonConfig(): LemonConfig | null {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  const storeId = process.env.LEMONSQUEEZY_STORE_ID
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID
  if (!apiKey || !storeId || !variantId) return null
  return { apiKey, storeId, variantId }
}

async function lemonFetch(config: LemonConfig, path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${config.apiKey}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null
  return { ok: response.ok, status: response.status, json }
}

let storeCurrencyCache: { value: string; at: number } | null = null

/** The store's currency (Lemon Squeezy charges in this currency). */
export async function getStoreCurrency(config: LemonConfig): Promise<string | null> {
  if (storeCurrencyCache && Date.now() - storeCurrencyCache.at < 60 * 60 * 1000) {
    return storeCurrencyCache.value
  }
  const result = await lemonFetch(config, `/stores/${encodeURIComponent(config.storeId)}`)
  const data = result.json?.data as { attributes?: { currency?: string } } | undefined
  const currency = data?.attributes?.currency?.toUpperCase()
  if (!result.ok || !currency) return null
  storeCurrencyCache = { value: currency, at: Date.now() }
  return currency
}

/**
 * Explicit conversion rates set by the site owner, e.g.
 * COMMISSION_FX_RATES="KWD:3.25,SAR:0.2667" meaning 1 KWD = 3.25 store-currency units.
 * No rate is ever guessed: without an entry, a different currency is refused.
 */
export function configuredRate(fromCurrency: string): number | null {
  const raw = process.env.COMMISSION_FX_RATES ?? ''
  for (const part of raw.split(',')) {
    const [code, value] = part.split(':').map(item => item.trim())
    if (code?.toUpperCase() === fromCurrency.toUpperCase()) {
      const rate = Number(value)
      if (Number.isFinite(rate) && rate > 0) return rate
    }
  }
  return null
}

export type ChargeAmount = {
  cents: number
  currency: string
  rate: number | null
}

/** Converts the commission into store-currency cents, or null when not allowed. */
export function chargeAmount(
  amount: number,
  dealCurrency: string,
  storeCurrency: string
): ChargeAmount | null {
  const from = dealCurrency.toUpperCase()
  const to = storeCurrency.toUpperCase()
  if (from === to) {
    return { cents: Math.round(amount * 100), currency: to, rate: null }
  }
  const rate = configuredRate(from)
  if (!rate) return null
  return { cents: Math.round(amount * rate * 100), currency: to, rate }
}

export async function createCommissionCheckout(
  config: LemonConfig,
  input: {
    paymentId: string
    dealId: string
    cents: number
    email?: string | null
    redirectUrl: string
    description: string
  }
): Promise<{ id: string; url: string } | null> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        custom_price: input.cents,
        product_options: {
          name: 'Nexus deal commission',
          description: input.description,
          redirect_url: input.redirectUrl,
          enabled_variants: [Number(config.variantId)],
        },
        checkout_options: { embed: false },
        checkout_data: {
          ...(input.email ? { email: input.email } : {}),
          custom: {
            commission_payment_id: input.paymentId,
            deal_id: input.dealId,
            source: COMMISSION_SOURCE,
          },
        },
        expires_at: expiresAt,
      },
      relationships: {
        store: { data: { type: 'stores', id: String(config.storeId) } },
        variant: { data: { type: 'variants', id: String(config.variantId) } },
      },
    },
  }

  const result = await lemonFetch(config, '/checkouts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = result.json?.data as { id?: string; attributes?: { url?: string } } | undefined
  if (!result.ok || !data?.id || !data.attributes?.url) {
    console.error('Lemon Squeezy checkout failed', result.status)
    return null
  }
  return { id: data.id, url: data.attributes.url }
}

/** Verifies the X-Signature header (HMAC-SHA256 hex of the raw body). */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature.trim(), 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}
