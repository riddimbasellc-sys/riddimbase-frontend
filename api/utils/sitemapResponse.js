export function createServerResponse(res, xml) {
  // Vercel Node / Express-style response
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/xml')
    res.statusCode = 200
    res.end(xml)
    return
  }

  // Edge / fallback: return plain string
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
  })
}

