import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Bell, Mail, MapPin, Filter, Save, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { 
  loadNotificationPreferences, 
  saveNotificationPreferences,
  syncPreferencesToDatabase,
  removePreferencesFromDatabase,
  clearNotificationPreferences 
} from '@/lib/notificationPreferences'
import { supabase } from '@/lib/supabase'
import { getAllCategories, mapSellerToCategory } from '@/lib/filters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

const SELLER_CATEGORIES = [
  'Sold by Company',
  'Individual Seller',
  'Auksjonen.no',
  'Konkursbo',
  'Other/Unknown Seller'
]

export default function NotificationSettings({ currentMapBounds, currentFilters }) {
  const [preferences, setPreferences] = useState(loadNotificationPreferences())
  const [saveStatus, setSaveStatus] = useState(null) // 'success', 'error', 'warning', null
  const [statusMessage, setStatusMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [emailError, setEmailError] = useState('')

  const allCategories = useMemo(() => getAllCategories(), [])

  useEffect(() => {
    // Load preferences on mount
    const loaded = loadNotificationPreferences()
    setPreferences(loaded)
  }, [])

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailChange = (e) => {
    const email = e.target.value
    setPreferences(prev => ({ ...prev, email }))
    
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError('')
    }
  }

  const handleToggleEnabled = (enabled) => {
    setPreferences(prev => ({ ...prev, enabled }))
  }

  const handleCategoryToggle = (category) => {
    setPreferences(prev => {
      const categories = prev.selectedCategories || []
      const newCategories = categories.includes(category)
        ? categories.filter(c => c !== category)
        : [...categories, category]
      return { ...prev, selectedCategories: newCategories }
    })
  }

  const handleSellerToggle = (seller) => {
    setPreferences(prev => {
      const sellers = prev.selectedSellers || []
      const newSellers = sellers.includes(seller)
        ? sellers.filter(s => s !== seller)
        : [...sellers, seller]
      return { ...prev, selectedSellers: newSellers }
    })
  }

  const handleSelectAllCategories = () => {
    setPreferences(prev => ({
      ...prev,
      selectedCategories: allCategories
    }))
  }

  const handleClearAllCategories = () => {
    setPreferences(prev => ({
      ...prev,
      selectedCategories: []
    }))
  }

  const handleSelectAllSellers = () => {
    setPreferences(prev => ({
      ...prev,
      selectedSellers: SELLER_CATEGORIES
    }))
  }

  const handleClearAllSellers = () => {
    setPreferences(prev => ({
      ...prev,
      selectedSellers: []
    }))
  }

  const handleUseCurrentMapBounds = () => {
    if (currentMapBounds) {
      setPreferences(prev => ({ ...prev, mapBounds: currentMapBounds }))
      setSaveStatus('info')
      setTimeout(() => setSaveStatus(null), 2000)
    }
  }

  const handleClearMapBounds = () => {
    setPreferences(prev => ({ ...prev, mapBounds: null }))
  }

  const handleUseCurrentFilters = () => {
    if (currentFilters) {
      setPreferences(prev => ({
        ...prev,
        selectedCategories: currentFilters.selectedCategories || [],
        selectedSellers: currentFilters.selectedSellers || [],
      }))
      setSaveStatus('info')
      setTimeout(() => setSaveStatus(null), 2000)
    }
  }

  const handleSave = async () => {
    if (!preferences.email || !validateEmail(preferences.email)) {
      setEmailError('Valid email is required')
      return
    }

    setIsSaving(true)
    setSaveStatus(null)
    setStatusMessage('')

    try {
      // Save to localStorage (always works)
      const saved = saveNotificationPreferences(preferences)
      
      // Try to sync to database (may fail if not set up)
      const result = await syncPreferencesToDatabase(supabase, saved)
      
      if (result.success) {
        if (result.warning) {
          // Saved locally but database not configured
          setSaveStatus('warning')
          setStatusMessage(result.warning + ' Email notifications will not work until you run the database migrations.')
        } else {
          // Saved both locally and to database
          setSaveStatus('success')
          setStatusMessage('Notification preferences saved successfully!')
        }
        setTimeout(() => {
          setSaveStatus(null)
          setStatusMessage('')
        }, 5000)
      } else {
        // Database save failed
        setSaveStatus('warning')
        setStatusMessage(`Saved locally only. Database error: ${result.error}. Email notifications require database setup.`)
        setTimeout(() => {
          setSaveStatus(null)
          setStatusMessage('')
        }, 7000)
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      setSaveStatus('error')
      setStatusMessage('Failed to save preferences. Please try again.')
      setTimeout(() => {
        setSaveStatus(null)
        setStatusMessage('')
      }, 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all notification preferences?')) {
      return
    }

    setIsSaving(true)
    
    try {
      // Clear from localStorage
      clearNotificationPreferences()
      
      // Remove from database if email exists
      if (preferences.email) {
        await removePreferencesFromDatabase(supabase, preferences.email)
      }
      
      // Reset state
      const emptyPrefs = loadNotificationPreferences()
      setPreferences(emptyPrefs)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error('Failed to clear preferences:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Settings</CardTitle>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={handleToggleEnabled}
          />
        </div>
        <CardDescription>
          Get email notifications when new auctions match your criteria
        </CardDescription>
        {preferences.enabled && (
          <Alert className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Note:</strong> For automatic notifications, ensure the database trigger is set up. 
              See <code className="text-xs bg-muted px-1 py-0.5 rounded">QUICK_FIX.md</code> for setup instructions.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Email Configuration */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={preferences.email}
            onChange={handleEmailChange}
            disabled={!preferences.enabled}
            className={emailError ? 'border-red-500' : ''}
          />
          {emailError && (
            <p className="text-sm text-red-500">{emailError}</p>
          )}
        </div>

        <Separator />

        {/* Notification Frequency */}
        <div className="space-y-2">
          <Label htmlFor="frequency">Notification Frequency</Label>
          <Select
            value={preferences.notificationFrequency}
            onValueChange={(value) => setPreferences(prev => ({ ...prev, notificationFrequency: value }))}
            disabled={!preferences.enabled}
          >
            <SelectTrigger id="frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate (as they arrive)</SelectItem>
              <SelectItem value="hourly">Hourly digest</SelectItem>
              <SelectItem value="daily">Daily digest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Category Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Categories ({preferences.selectedCategories?.length || 0} selected)
            </Label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllCategories}
                disabled={!preferences.enabled}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllCategories}
                disabled={!preferences.enabled}
              >
                Clear
              </Button>
              {currentFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentFilters}
                  disabled={!preferences.enabled}
                >
                  Use Current
                </Button>
              )}
            </div>
          </div>
          
          <ScrollArea className="h-48 border rounded-md p-3">
            <div className="space-y-2">
              {allCategories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${category}`}
                    checked={preferences.selectedCategories?.includes(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                    disabled={!preferences.enabled}
                  />
                  <label
                    htmlFor={`cat-${category}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {category}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        {/* Seller Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Sellers ({preferences.selectedSellers?.length || 0} selected)
            </Label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllSellers}
                disabled={!preferences.enabled}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllSellers}
                disabled={!preferences.enabled}
              >
                Clear
              </Button>
            </div>
          </div>
          
          <div className="space-y-2 border rounded-md p-3">
            {SELLER_CATEGORIES.map((seller) => (
              <div key={seller} className="flex items-center space-x-2">
                <Checkbox
                  id={`seller-${seller}`}
                  checked={preferences.selectedSellers?.includes(seller)}
                  onCheckedChange={() => handleSellerToggle(seller)}
                  disabled={!preferences.enabled}
                />
                <label
                  htmlFor={`seller-${seller}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {seller}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Map Bounds */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Geographic Area
            </Label>
            <div className="flex gap-2">
              {currentMapBounds && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentMapBounds}
                  disabled={!preferences.enabled}
                >
                  Use Current Selection
                </Button>
              )}
              {preferences.mapBounds && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearMapBounds}
                  disabled={!preferences.enabled}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          {preferences.mapBounds ? (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                Geographic filter is active. Notifications will only be sent for auctions within the selected map area.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                No geographic filter set. Notifications will include auctions from all locations.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Price Range */}
        <div className="space-y-3">
          <Label>Price Range (optional)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="minPrice" className="text-xs text-muted-foreground">
                Minimum Price
              </Label>
              <Input
                id="minPrice"
                type="number"
                placeholder="0"
                value={preferences.minPrice || ''}
                onChange={(e) => setPreferences(prev => ({ ...prev, minPrice: e.target.value ? parseFloat(e.target.value) : null }))}
                disabled={!preferences.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPrice" className="text-xs text-muted-foreground">
                Maximum Price
              </Label>
              <Input
                id="maxPrice"
                type="number"
                placeholder="No limit"
                value={preferences.maxPrice || ''}
                onChange={(e) => setPreferences(prev => ({ ...prev, maxPrice: e.target.value ? parseFloat(e.target.value) : null }))}
                disabled={!preferences.enabled}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Status Messages */}
        {saveStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {statusMessage || 'Notification preferences saved successfully!'}
            </AlertDescription>
          </Alert>
        )}

        {saveStatus === 'warning' && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {statusMessage || 'Preferences saved locally. Database configuration needed for email notifications.'}
            </AlertDescription>
          </Alert>
        )}

        {saveStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {statusMessage || 'Failed to save preferences. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {saveStatus === 'info' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Applied current filters/selection. Don't forget to save!
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={!preferences.enabled || isSaving || !!emailError}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
          <Button
            onClick={handleClearAll}
            variant="destructive"
            disabled={isSaving}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>

        {preferences.lastUpdated && (
          <p className="text-xs text-muted-foreground text-center">
            Last updated: {new Date(preferences.lastUpdated).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
