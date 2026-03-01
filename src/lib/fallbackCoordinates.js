// Fallback coordinates for common Norwegian cities/places.
// Provides normalized variants (lowercase, collapsed) for robust matching.
const rawFallback = {
  Oslo: [59.9139, 10.7522],
  Bergen: [60.39299, 5.32415],
  Trondheim: [63.43049, 10.39506],
  Stavanger: [58.96998, 5.73311],
  Kristiansand: [58.14671, 7.9956],
  Tromsø: [69.6492, 18.95532],
  Bodø: [67.28036, 14.40491],
  Ålesund: [62.47225, 6.14948],
  Drammen: [59.74389, 10.20449],
  Fredrikstad: [59.2181, 10.9298],
  Sandnes: [58.85244, 5.73521],
  Skien: [59.20962, 9.60897],
  Sarpsborg: [59.28391, 11.10962],
  Haugesund: [59.41378, 5.268],
  Molde: [62.73752, 7.16073],
  Hamar: [60.79453, 11.06785],
  Lillehammer: [61.11527, 10.4663],
  Gjøvik: [60.79574, 10.69155],
  Alta: [69.96887, 23.27165]
}

export const FALLBACK_COORDS = (() => {
  const out = {}
  for (const [name, coord] of Object.entries(rawFallback)) {
    const variants = [
      name,
      name.toLowerCase(),
      name.toLowerCase().replace(/[\s-]+/g, ''),
    ]
    variants.forEach(v => { if (!out[v]) out[v] = coord })
  }
  return out
})()

export function matchFallbackLocation(loc) {
  if (!loc) return null
  const trimmed = loc.trim()
  const tokens = trimmed.split(/[,;/]/).flatMap(t => t.split(/\s+/)).filter(Boolean)
  const candidates = [
    trimmed,
    trimmed.toLowerCase(),
    trimmed.toLowerCase().replace(/[\s-]+/g, ''),
    ...tokens,
    ...tokens.map(t => t.toLowerCase()),
    ...tokens.map(t => t.toLowerCase().replace(/[\s-]+/g, ''))
  ]
  for (const c of candidates) {
    if (FALLBACK_COORDS[c]) return FALLBACK_COORDS[c]
  }
  return null
}
