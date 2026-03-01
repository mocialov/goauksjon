/**
 * User preferences utility for persisting UI state across sessions
 */

const STORAGE_PREFIX = 'auction-app-'

const KEYS = {
  FILTERS: `${STORAGE_PREFIX}filters`,
  PAGINATION: `${STORAGE_PREFIX}pagination`,
  MAP_SELECTION: `${STORAGE_PREFIX}map-selection`,
  UI_STATE: `${STORAGE_PREFIX}ui-state`,
}

/**
 * Safely get item from localStorage with error handling
 */
const getStorageItem = (key) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.warn(`Failed to parse localStorage item for key "${key}":`, error)
    return null
  }
}

/**
 * Safely set item in localStorage with error handling
 */
const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Failed to save to localStorage for key "${key}":`, error)
  }
}

/**
 * Save filter preferences
 */
export const saveFilterPreferences = (preferences) => {
  const {
    selectedCategories,
    selectedSellers,
    dateRange,
    expandedParents
  } = preferences

  const dataToSave = {
    selectedCategories,
    selectedSellers,
    dateRange: dateRange ? {
      from: dateRange.from?.toISOString(),
      to: dateRange.to?.toISOString()
    } : null,
    expandedParents: Array.from(expandedParents || [])
  }

  console.log('💾 Saving filter preferences:', dataToSave)
  setStorageItem(KEYS.FILTERS, dataToSave)
}

/**
 * Load filter preferences
 */
export const loadFilterPreferences = () => {
  const data = getStorageItem(KEYS.FILTERS)
  console.log('📂 Loading filter preferences raw data:', data)
  
  if (!data) {
    console.log('📂 No filter preferences found')
    return null
  }

  const loaded = {
    selectedCategories: data.selectedCategories || [],
    selectedSellers: data.selectedSellers || [],
    dateRange: data.dateRange ? {
      from: data.dateRange.from ? new Date(data.dateRange.from) : null,
      to: data.dateRange.to ? new Date(data.dateRange.to) : null
    } : null,
    expandedParents: new Set(data.expandedParents || [])
  }

  console.log('📂 Loaded filter preferences:', loaded)
  return loaded
}

/**
 * Save pagination preferences
 */
export const savePaginationPreferences = (preferences) => {
  const { pageSize } = preferences
  setStorageItem(KEYS.PAGINATION, { pageSize })
}

/**
 * Load pagination preferences
 */
export const loadPaginationPreferences = () => {
  const data = getStorageItem(KEYS.PAGINATION)
  return data ? { pageSize: data.pageSize || 10 } : { pageSize: 10 }
}

/**
 * Save map selection preferences
 */
export const saveMapSelection = (bounds) => {
  if (bounds) {
    // Handle both Leaflet LatLngBounds objects and plain objects
    const southWest = bounds.getSouthWest ? bounds.getSouthWest() : bounds._southWest
    const northEast = bounds.getNorthEast ? bounds.getNorthEast() : bounds._northEast
    
    setStorageItem(KEYS.MAP_SELECTION, {
      _southWest: { lat: southWest.lat, lng: southWest.lng },
      _northEast: { lat: northEast.lat, lng: northEast.lng }
    })
  } else {
    localStorage.removeItem(KEYS.MAP_SELECTION)
  }
}

/**
 * Load map selection preferences
 */
export const loadMapSelection = () => {
  const data = getStorageItem(KEYS.MAP_SELECTION)
  if (!data) return null

  // Reconstruct the bounds object in the format expected by Leaflet
  return {
    _southWest: data._southWest,
    _northEast: data._northEast
  }
}

/**
 * Save UI state preferences (like filter panel visibility)
 */
export const saveUIState = (preferences) => {
  const { showFilters } = preferences
  setStorageItem(KEYS.UI_STATE, { showFilters })
}

/**
 * Load UI state preferences
 */
export const loadUIState = () => {
  const data = getStorageItem(KEYS.UI_STATE)
  return data ? { showFilters: data.showFilters || false } : { showFilters: false }
}

/**
 * Clear all user preferences
 */
export const clearAllPreferences = () => {
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
}