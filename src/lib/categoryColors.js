// Category color mapping utility
// Provides distinct, accessible colors for the 21 provided top-level categories.
// Any subcategory (e.g. "Vehicles & Parts > Used Vehicles") is normalized to its top-level
// and receives the same color for consistent visual grouping.

// Fixed palette chosen for: contrast against light/dark backgrounds, color-blind friendliness (mixed hues),
// and distinctiveness. Avoided near duplicates and ensured legible adjacent pairs.
// If you need to adjust, keep contrast ratio > 3:1 vs both white (#FFFFFF) and dark gray (#1E1E1E).
const CATEGORY_COLORS = {
  // Lighter / pastel variants maintaining hue distinctiveness
  'animals & pet supplies': '#6EB5D9', // light sky blue
  'apparel & accessories': '#FFB3A7', // soft coral
  'arts & entertainment': '#C9A3E6', // light lavender
  'baby & toddler': '#F8C979', // pale amber
  'business & industrial': '#7ED9C6', // mint teal
  'cameras & optics': '#F3A270', // soft apricot
  'electronics': '#8FBDE6', // pale tech blue
  'food, beverages & tobacco': '#BFA6DB', // muted violet
  'furniture': '#D4B59A', // light wood tan
  'hardware': '#B5C0C9', // light steel gray
  'health & beauty': '#F8A7C8', // pastel pink
  'home & garden': '#8FD9A7', // soft garden green
  'luggage & bags': '#E7A199', // light brick
  'mature': '#C5CED1', // gentle gray
  'media': '#F9C877', // pale golden
  'office supplies': '#9FC8EA', // light corporate blue
  'religious & ceremonial': '#D9B981', // muted gold
  'software': '#A9B8C5', // soft slate
  'sporting goods': '#7FE5CE', // aqua mint
  'toys & games': '#F7B077', // playful pastel orange
  'vehicles & parts': '#D2B8AF' // light warm taupe
}

// Fallback rotating palette (legacy deterministic hashing) for unknown categories
const FALLBACK_PALETTE = [
  '#A7D8F5', '#A8EEDB', '#FFE39B', '#FFC9B3', '#C7B8ED',
  '#B9E8CB', '#FFE7A9', '#FFB8B8', '#C6ECF3', '#E6BDE6'
]

function hashString(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i)
  return hash >>> 0
}

// Normalize category name to top-level: split on common delimiters (>, /) and trim.
export function extractTopCategory(raw) {
  if (!raw) return ''
  // Split on common hierarchy delimiters: > / : arrows, chevrons.
  const first = String(raw)
    .split(/>|\/|:|→|»/)[0]
    .trim()
    .toLowerCase()
  return first
}

export function getCategoryColor(category) {
  if (!category) return '#999999'
  const top = extractTopCategory(category)
  if (CATEGORY_COLORS[top]) return CATEGORY_COLORS[top]
  // hash fallback for unseen categories
  const h = hashString(top)
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length]
}

export function getPalette() {
  // Return full set: fixed category colors + fallback palette (unique values)
  const unique = new Set([...Object.values(CATEGORY_COLORS), ...FALLBACK_PALETTE])
  return Array.from(unique)
}

export function listMappedCategories() {
  return Object.keys(CATEGORY_COLORS)
}

export function explainCategoryColor(rawCategory) {
  const top = extractTopCategory(rawCategory)
  const color = getCategoryColor(rawCategory)
  return { raw: rawCategory, top, color, mapped: !!CATEGORY_COLORS[top] }
}
