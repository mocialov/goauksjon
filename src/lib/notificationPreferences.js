/**
 * User notification preferences utility for email alerts on new matching auctions
 */

const STORAGE_PREFIX = 'auction-app-'

const KEYS = {
  NOTIFICATION_PREFERENCES: `${STORAGE_PREFIX}notification-preferences`,
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
 * Save notification preferences
 */
export const saveNotificationPreferences = (preferences) => {
  const {
    enabled,
    email,
    selectedCategories,
    selectedSellers,
    mapBounds,
    minPrice,
    maxPrice,
    notificationFrequency, // 'immediate', 'hourly', 'daily'
  } = preferences

  const dataToSave = {
    enabled: !!enabled,
    email: email || '',
    selectedCategories: selectedCategories || [],
    selectedSellers: selectedSellers || [],
    mapBounds: mapBounds ? {
      _southWest: mapBounds._southWest || mapBounds.getSouthWest?.(),
      _northEast: mapBounds._northEast || mapBounds.getNorthEast?.()
    } : null,
    minPrice: minPrice || null,
    maxPrice: maxPrice || null,
    notificationFrequency: notificationFrequency || 'immediate',
    lastUpdated: new Date().toISOString()
  }

  console.log('📧 Saving notification preferences:', dataToSave)
  setStorageItem(KEYS.NOTIFICATION_PREFERENCES, dataToSave)
  
  return dataToSave
}

/**
 * Load notification preferences
 */
export const loadNotificationPreferences = () => {
  const data = getStorageItem(KEYS.NOTIFICATION_PREFERENCES)
  console.log('📧 Loading notification preferences raw data:', data)
  
  if (!data) {
    console.log('📧 No notification preferences found')
    return {
      enabled: false,
      email: '',
      selectedCategories: [],
      selectedSellers: [],
      mapBounds: null,
      minPrice: null,
      maxPrice: null,
      notificationFrequency: 'immediate',
    }
  }

  return {
    enabled: data.enabled || false,
    email: data.email || '',
    selectedCategories: data.selectedCategories || [],
    selectedSellers: data.selectedSellers || [],
    mapBounds: data.mapBounds || null,
    minPrice: data.minPrice || null,
    maxPrice: data.maxPrice || null,
    notificationFrequency: data.notificationFrequency || 'immediate',
    lastUpdated: data.lastUpdated
  }
}

/**
 * Clear notification preferences
 */
export const clearNotificationPreferences = () => {
  try {
    localStorage.removeItem(KEYS.NOTIFICATION_PREFERENCES)
    console.log('📧 Cleared notification preferences')
  } catch (error) {
    console.warn('Failed to clear notification preferences:', error)
  }
}

/**
 * Sync preferences to Supabase database
 * This allows the backend to check preferences when new auctions arrive
 */
export const syncPreferencesToDatabase = async (supabase, preferences) => {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        email: preferences.email,
        enabled: preferences.enabled,
        preferences: {
          selectedCategories: preferences.selectedCategories,
          selectedSellers: preferences.selectedSellers,
          mapBounds: preferences.mapBounds,
          minPrice: preferences.minPrice,
          maxPrice: preferences.maxPrice,
          notificationFrequency: preferences.notificationFrequency,
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })

    if (error) {
      // If table doesn't exist, just warn but don't fail
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('⚠️ Database table not set up yet. Preferences saved locally only.')
        console.warn('Run the SQL migrations to enable email notifications.')
        return { success: true, data: null, warning: 'Database not configured. Preferences saved locally.' }
      }
      throw error
    }
    
    console.log('✅ Synced preferences to database:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Failed to sync preferences to database:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Remove preferences from database
 */
export const removePreferencesFromDatabase = async (supabase, email) => {
  try {
    const { error } = await supabase
      .from('user_notification_preferences')
      .delete()
      .eq('email', email)

    if (error) {
      // If table doesn't exist, just warn but don't fail
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('⚠️ Database table not set up yet. Preferences cleared locally only.')
        return { success: true, warning: 'Database not configured' }
      }
      throw error
    }
    
    console.log('✅ Removed preferences from database')
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to remove preferences from database:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}
