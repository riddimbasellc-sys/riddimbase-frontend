// Legacy quote (kept for backward compatibility)
export function quoteBeatPurchase(beat, license) {
  return computeBeatQuote({ beat, license })
}

function resolveLicensePrice(tierPrices, license, fallback) {
  if (!tierPrices) return fallback
  const key = license
  const lower = license.toLowerCase()
  const candidates = [
    tierPrices[key],
    tierPrices[lower],
  ]
  for (const v of candidates) {
    if (v !== undefined && v !== null) return Number(v)
  }
  return fallback
}

// New quote function with currency & coupon support
// options: { beat, license, currency='USD', coupon } -> returns { base, multiplier, subtotal, discountRate, discountAmount, total, currency }
export function computeBeatQuote({ beat, license, currency = 'USD', coupon }) {
  if (!beat) return null
  const tierPrices = beat.licensePrices || beat.license_prices || null
  const fallbackPrice = Number(beat.price || 0)
  const baseUSD = resolveLicensePrice(tierPrices, license, fallbackPrice)
  // No extra multiplier: each tier should use its own exact price
  const m = 1
  const subtotalUSD = baseUSD
  // Coupon discount map (rate of subtotal)
  const couponMap = { SAVE10: 0.10, SAVE20: 0.20, EXCLUSIVE50: 0.50 }
  const discountRate = coupon && couponMap[coupon.toUpperCase()] ? couponMap[coupon.toUpperCase()] : 0
  const discountAmountUSD = subtotalUSD * discountRate
  const totalUSD = subtotalUSD - discountAmountUSD
  // We treat all amounts as already expressed in the selected currency.
  // PayPal handles any real FX conversion at checkout.
  const fx = (v) => v
  const serviceFeeRate = 0
  const serviceFeeUSD = 0
  const grandUSD = totalUSD
  return {
    base: baseUSD,
    multiplier: m,
    subtotal: fx(subtotalUSD),
    discountRate,
    discountAmount: fx(discountAmountUSD),
    serviceFeeRate,
    serviceFee: fx(serviceFeeUSD),
    total: fx(grandUSD),
    currency
  }
}

// Aggregate cart quote (no bulk discount).
// items: [{ beat, license }]; options { currency='USD', coupon }
export function computeCartQuote({ items = [], currency = 'USD', coupon }) {
  const valid = items.filter(it => it.beat && it.license)
  const couponMap = { SAVE10: 0.10, SAVE20: 0.20, EXCLUSIVE50: 0.50 }
  const discountRate = coupon && couponMap[coupon.toUpperCase()] ? couponMap[coupon.toUpperCase()] : 0

  // Per-item calculations (in USD first)
  const perItem = valid.map(it => {
    const tierPrices = it.beat.licensePrices || it.beat.license_prices || null
    const fallbackPrice = Number(it.beat.price || 0)
    const baseUSD = resolveLicensePrice(tierPrices, it.license, fallbackPrice)
    const itemSubtotalUSD = baseUSD
    return { ...it, multiplier: 1, subtotalUSD: itemSubtotalUSD }
  })

  const subtotalUSD = perItem.reduce((sum, p) => sum + p.subtotalUSD, 0)
  const couponDiscountUSD = subtotalUSD * discountRate
  const totalUSD = subtotalUSD - couponDiscountUSD
  const serviceFeeRate = 0
  const serviceFeeUSD = 0
  const grandUSD = totalUSD

  // No FX conversion: values are already in the display currency.
  const fx = v => v

  return {
    currency,
    items: perItem.map(p => ({
      beatId: p.beat.id,
      title: p.beat.title,
      license: p.license,
      multiplier: p.multiplier,
      subtotalUSD: p.subtotalUSD,
      subtotal: fx(p.subtotalUSD)
    })),
    counts: { total: perItem.length },
    subtotalUSD,
    subtotal: fx(subtotalUSD),
    couponDiscountUSD,
    couponDiscount: fx(couponDiscountUSD),
    discountRate,
    afterDiscountUSD: totalUSD,
    afterDiscount: fx(totalUSD),
    serviceFeeRate,
    serviceFeeUSD,
    serviceFee: fx(serviceFeeUSD),
    grandUSD,
    grand: fx(grandUSD)
  }
}

export async function processPayment({ amount, currency }) {
  await new Promise(r => setTimeout(r, 600))
  return { success: true, id: 'pay_' + Date.now(), amount, currency }
}

export async function generateLicense({
  beatTitle,
  license,
  buyerEmail,
  amount,
  buyerName,
  producerName,
  orderId,
}) {
  try {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
    const res = await fetch(`${base}/api/generate-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        beatTitle,
        license,
        buyerEmail,
        amount,
        buyerName,
        producerName,
        orderId,
      })
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.warn('[paymentsService] generateLicense failed', e.message)
    return null
  }
}
