// Legacy quote (kept for backward compatibility)
export function quoteBeatPurchase(beat, license) {
  return computeBeatQuote({ beat, license })
}

// New quote function with currency & coupon support
// options: { beat, license, currency='USD', coupon } -> returns { base, multiplier, subtotal, discountRate, discountAmount, total, currency }
export function computeBeatQuote({ beat, license, currency = 'USD', coupon }) {
  if (!beat) return null
  const tierPrices = beat.licensePrices || beat.license_prices || null
  const baseUSD = tierPrices && tierPrices[license] ? Number(tierPrices[license]) : Number(beat.price || 0)
  // No extra multiplier: each tier should use its own exact price
  const m = 1
  const subtotalUSD = baseUSD
  // Coupon discount map (rate of subtotal)
  const couponMap = { SAVE10: 0.10, SAVE20: 0.20, EXCLUSIVE50: 0.50 }
  const discountRate = coupon && couponMap[coupon.toUpperCase()] ? couponMap[coupon.toUpperCase()] : 0
  const discountAmountUSD = subtotalUSD * discountRate
  const totalUSD = subtotalUSD - discountAmountUSD
  // Simple static FX rates relative to USD (for demo purposes only)
  const rates = { USD: 1, EUR: 0.93, GBP: 0.79, CAD: 1.37, JMD: 157, TTD: 6.78 }
  const r = rates[currency] || 1
  const fx = (v) => v * r
  const serviceFeeRate = 0.12
  const serviceFeeUSD = totalUSD * serviceFeeRate
  const grandUSD = totalUSD + serviceFeeUSD
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

// Aggregate cart quote with bulk discount logic
// items: [{ beat, license }]; options { currency='USD', coupon }
// Bulk rule v1: If >=2 Basic license items -> cheapest Basic item (after license multiplier, before coupon) becomes free.
export function computeCartQuote({ items = [], currency = 'USD', coupon }) {
  const valid = items.filter(it => it.beat && it.license)
  const rates = { USD: 1, EUR: 0.93, GBP: 0.79, CAD: 1.37, JMD: 157, TTD: 6.78 }
  const r = rates[currency] || 1
  const couponMap = { SAVE10: 0.10, SAVE20: 0.20, EXCLUSIVE50: 0.50 }
  const discountRate = coupon && couponMap[coupon.toUpperCase()] ? couponMap[coupon.toUpperCase()] : 0

  // Per-item calculations (in USD first)
  const perItem = valid.map(it => {
    const tierPrices = it.beat.licensePrices || it.beat.license_prices || null
    const baseUSD = tierPrices && tierPrices[it.license] ? Number(tierPrices[it.license]) : Number(it.beat.price || 0)
    const itemSubtotalUSD = baseUSD
    return { ...it, multiplier: 1, subtotalUSD: itemSubtotalUSD }
  })

  // Bulk discount (USD)
  const basicItems = perItem.filter(p => p && p.license === 'Basic')
  let bulkDiscountUSD = 0
  if (basicItems.length >= 2) {
    bulkDiscountUSD = Math.min(...basicItems.map(b => b.subtotalUSD))
  }

  const subtotalUSD = perItem.reduce((sum, p) => sum + p.subtotalUSD, 0)
  const afterBulkUSD = subtotalUSD - bulkDiscountUSD
  const couponDiscountUSD = afterBulkUSD * discountRate
  const totalUSD = afterBulkUSD - couponDiscountUSD
  const serviceFeeRate = 0.12
  const serviceFeeUSD = totalUSD * serviceFeeRate
  const grandUSD = totalUSD + serviceFeeUSD

  // FX conversion helper
  const fx = v => v * r

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
    counts: { total: perItem.length, basic: basicItems.length },
    subtotalUSD,
    subtotal: fx(subtotalUSD),
    bulkDiscountUSD,
    bulkDiscount: fx(bulkDiscountUSD),
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
