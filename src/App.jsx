import React, { useMemo, useState, useEffect, useRef, startTransition, useCallback } from 'react'
import { getAllCategories, mapSellerToCategory } from '@/lib/filters'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, BarChart3, Table, AlertCircle, Home, ShoppingCart } from 'lucide-react'
import { useAuctions, useAuctionStats, useHourlyStats } from './hooks/useAuctions'
import AuctionTable from './components/AuctionTable'
import CategoryChart from './components/CategoryChart'
import HourlyChart from './components/HourlyChart'
import MapWidget from './components/MapWidget'
import ProductDemo from './components/ProductDemo'
import NotificationSettings from './components/NotificationSettings'
import { loadMapSelection, saveMapSelection } from './lib/userPreferences'
import './App.css'
import { matchFallbackLocation } from '@/lib/fallbackCoordinates'

// --- Dashboard Page ---
function DashboardPage() {
  const [activeTab, setActiveTab] = useState('table')
  // Lift table filter criteria into parent to derive a stable filtered base for map & charts.
  // We still let the table own its UI state; it reports changes via onFilterStateChange.
  const [parentSelectedCategories, setParentSelectedCategories] = useState(null)
  const [parentSelectedSellers, setParentSelectedSellers] = useState(null)
  const [parentDateRange, setParentDateRange] = useState(null)
  const [parentGlobalFilter, setParentGlobalFilter] = useState('')
  // Current paginated (visible) rows from AuctionTable
  const [visibleTableRows, setVisibleTableRows] = useState([])
  const [coordinates, setCoordinates] = useState({})
  const [selectedBounds, setSelectedBounds] = useState(null)
  const [resetPageSignal, setResetPageSignal] = useState(0)
  const [currentPageSize, setCurrentPageSize] = useState(10)
  const prevSelectedBoundsRef = useRef(null)

  const {
    data: auctionsData,
    isLoading: auctionsLoading,
    error: auctionsError,
    refetch: refetchAuctions
  } = useAuctions()

  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useAuctionStats()

  const {
    data: hourlyData,
    isLoading: hourlyLoading,
    error: hourlyError,
    refetch: refetchHourly
  } = useHourlyStats()

  const auctions = auctionsData?.data || []
  const hasError = auctionsError || statsError || hourlyError

  // Load persisted selection once on mount
  useEffect(() => {
    const savedBounds = loadMapSelection()
    if (savedBounds) {
      try {
        setSelectedBounds(savedBounds)
      } catch (error) {
        console.warn('Failed to restore saved map selection:', error)
      }
    }
  }, [])

  // Persist selection whenever it changes (lifted from MapWidget)
  useEffect(() => {
    // serialize or clear
    try {
      saveMapSelection(selectedBounds || null)
    } catch (e) {
      console.warn('Failed to persist map selection:', e)
    }
  }, [selectedBounds])

  const isWithinBounds = (coord, bounds) => {
    if (!coord || !bounds) return false
    const [lat, lng] = coord
    
    // Handle both Leaflet LatLngBounds objects and plain objects
    const sw = bounds.getSouthWest ? bounds.getSouthWest() : bounds._southWest
    const ne = bounds.getNorthEast ? bounds.getNorthEast() : bounds._northEast
    
    return lat >= sw.lat && lat <= ne.lat && lng >= sw.lng && lng <= ne.lng
  }

  // Coordinate normalization (mirrors MapWidget logic) to ensure filtering uses same resolution rules.
  const resolveCoordinate = useCallback((loc) => {
    if (!loc) return null
    // Direct & normalized lookups
    if (coordinates[loc]) return coordinates[loc]
    const trimmed = loc.trim()
    if (coordinates[trimmed]) return coordinates[trimmed]
    const lower = trimmed.toLowerCase()
    if (coordinates[lower]) return coordinates[lower]
    const collapsed = lower.replace(/[\s-]+/g,'')
    if (coordinates[collapsed]) return coordinates[collapsed]
    // Fallback city matching
    const fallback = matchFallbackLocation(trimmed)
    if (fallback) {
      return fallback
    }
    return null
  }, [coordinates])

  // --- Parent-level filtering logic (decoupled from table internal filtering) ---
  // Use shared utilities; we rely on full category list to detect "all selected" state correctly.
  const fullCategoryList = useMemo(() => getAllCategories(), [])

  const filteredAuctionsBase = useMemo(() => {
    // If we don't yet have filter criteria from table, fall back to raw auctions.
    if (!parentSelectedCategories && !parentSelectedSellers && !parentDateRange && !parentGlobalFilter) {
      return auctions
    }
    return auctions.filter(a => {
      // Category filter
      if (parentSelectedCategories && parentSelectedCategories.length > 0) {
        // Determine if user selected ALL categories (skip category filtering in that case)
        const allSelected = fullCategoryList.length > 0 && fullCategoryList.every(c => parentSelectedCategories.includes(c))
        if (!allSelected) {
          const catVal = a.category
          if (catVal && catVal.includes(':')) {
            const [parentPart, childPart] = catVal.split(':').map(s => s.trim())
            if (!(parentSelectedCategories.includes(parentPart) && parentSelectedCategories.includes(childPart))) return false
          } else if (!parentSelectedCategories.includes(catVal)) {
            return false
          }
        }
      }
      // Seller filter
      if (parentSelectedSellers && parentSelectedSellers.length > 0) {
        const allSellerSelected = parentSelectedSellers.length > 3 && parentSelectedSellers.every(s => ['Sold by Company','Individual Seller','Auksjonen.no','Konkursbo','Other/Unknown Seller'].includes(s))
        if (!allSellerSelected) {
          const sellerCategory = mapSellerToCategory(a.seller)
          if (!parentSelectedSellers.includes(sellerCategory)) return false
        }
      }
      // Date range filter
      if (parentDateRange && (parentDateRange.from || parentDateRange.to) && a.inserted_at) {
        const d = new Date(a.inserted_at)
        if (parentDateRange.from && !parentDateRange.to && d < parentDateRange.from) return false
        if (!parentDateRange.from && parentDateRange.to && d > parentDateRange.to) return false
        if (parentDateRange.from && parentDateRange.to && (d < parentDateRange.from || d > parentDateRange.to)) return false
      }
      // Global filter (simple substring across key fields)
      if (parentGlobalFilter && parentGlobalFilter.trim() !== '') {
        const q = parentGlobalFilter.toLowerCase()
        const hay = [a.item, a.category, a.seller, a.location].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [auctions, parentSelectedCategories, parentSelectedSellers, parentDateRange, parentGlobalFilter, fullCategoryList])

  // Apply map area selection on top of parent-level filtered base
  const areaFilteredAuctions = useMemo(() => {
    const base = filteredAuctionsBase
    if (!selectedBounds) return base
    return base.filter(auction => {
      const coord = resolveCoordinate(auction.location)
      return coord && isWithinBounds(coord, selectedBounds)
    })
  }, [filteredAuctionsBase, coordinates, selectedBounds, resolveCoordinate])

  // First-page slice respecting current pageSize (used when no area selection)
  const firstPageSlice = useMemo(() => {
    return areaFilteredAuctions.slice(0, currentPageSize || 10)
  }, [areaFilteredAuctions, currentPageSize])

  // Map rules:
  // 1. If a selection rectangle exists -> show ALL auctions inside selection (with table filters applied)
  // 2. If no selection -> show ONLY visible table rows (respecting pagination)
  const filteredAuctionsForMap = selectedBounds ? areaFilteredAuctions : visibleTableRows

  // Charts still use ALL filtered auctions (not limited to page)
  const filteredAuctionsForCharts = areaFilteredAuctions

  // --- Geocoding (rate-limited + cache) ---
  const geocodeQueueRef = useRef([])
  const processingRef = useRef(false)
  const cacheRef = useRef({})
  const lastRequestRef = useRef(0)
  const RETRY_DELAY_MS = 5000
  const MIN_INTERVAL_MS = 1100
  const BATCH_SIZE = 10 // Reduce render churn by batching coordinate updates

  useEffect(() => {
    try {
      const saved = localStorage.getItem('geoCacheV1')
      if (saved) {
        cacheRef.current = JSON.parse(saved)
        setCoordinates(prev => ({ ...cacheRef.current, ...prev }))
      }
    } catch (_) {}
  }, [])

  const persistCache = () => {
    try {
      localStorage.setItem('geoCacheV1', JSON.stringify(cacheRef.current))
    } catch (_) {}
  }

  const enqueueGeocode = (location) => {
    if (!location) return
    if (cacheRef.current[location] || coordinates[location]) return
    if (/unknown/i.test(location)) return
    if (geocodeQueueRef.current.includes(location)) return
    geocodeQueueRef.current.push(location)
    processQueue()
  }

  const geocode = async (location) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location + ', Norway')}&limit=1`
    const now = Date.now()
    const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestRef.current))
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    lastRequestRef.current = Date.now()
    const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (resp.status === 429) throw new Error('RATE_LIMIT')
    if (!resp.ok) throw new Error('HTTP_' + resp.status)
    const data = await resp.json()
    if (data.length === 0) return null
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  }

  const processQueue = async () => {
    if (processingRef.current) return
    processingRef.current = true
    const batchUpdates = {}
    console.time('[Geocode] queue processing')
    try {
      while (geocodeQueueRef.current.length > 0) {
        const loc = geocodeQueueRef.current.shift()
        if (!loc) continue
        try {
          const coord = await geocode(loc)
          if (coord) {
            cacheRef.current[loc] = coord
            batchUpdates[loc] = coord
          }
        } catch (e) {
          if (e.message === 'RATE_LIMIT') {
            // Put location back and back off
            geocodeQueueRef.current.unshift(loc)
            // Flush any accumulated results before sleeping
            if (Object.keys(batchUpdates).length) {
              const updatesCopy = { ...batchUpdates }
              for (const k in batchUpdates) delete batchUpdates[k]
              startTransition(() => {
                setCoordinates(prev => ({ ...prev, ...updatesCopy }))
              })
              persistCache()
            }
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
          } else {
            console.warn('Geocode failed for', loc, e.message)
          }
        }

        // Commit batch periodically
        if (Object.keys(batchUpdates).length >= BATCH_SIZE) {
          const updatesCopy = { ...batchUpdates }
          for (const k in batchUpdates) delete batchUpdates[k]
          startTransition(() => {
            setCoordinates(prev => ({ ...prev, ...updatesCopy }))
          })
          persistCache()
          // Yield to main thread to keep UI responsive
          await new Promise(r => setTimeout(r, 0))
        }
      }
      // Flush remainder
      if (Object.keys(batchUpdates).length) {
        const updatesCopy = { ...batchUpdates }
        for (const k in batchUpdates) delete batchUpdates[k]
        startTransition(() => {
          setCoordinates(prev => ({ ...prev, ...updatesCopy }))
        })
        persistCache()
      }
    } finally {
      console.timeEnd('[Geocode] queue processing')
      processingRef.current = false
    }
  }

  useEffect(() => {
    const unique = [...new Set(auctions.map(a => a.location).filter(Boolean))]
    unique.forEach(enqueueGeocode)
  }, [auctions])

  // When selection is cleared (transition from non-null to null), reset table to first page via signal.
  useEffect(() => {
    if (prevSelectedBoundsRef.current && !selectedBounds) {
      // When map selection clears, reset pagination to first page.
      setResetPageSignal(Date.now())
    }
    prevSelectedBoundsRef.current = selectedBounds
  }, [selectedBounds])

  // Receive filter state updates from AuctionTable UI.
  const handleFilterStateChange = useCallback((state) => {
    if (!state) return
    if (state.selectedCategories) setParentSelectedCategories(state.selectedCategories)
    if (state.selectedSellers) setParentSelectedSellers(state.selectedSellers)
    if (state.dateRange !== undefined) setParentDateRange(state.dateRange)
    if (state.globalFilter !== undefined) setParentGlobalFilter(state.globalFilter)
  }, [])

  const handleRefresh = () => {
    refetchAuctions()
    refetchStats()
    refetchHourly()
  }

  const filteredCategoryStats = useMemo(() => {
    if (!filteredAuctionsForMap || filteredAuctionsForMap.length === 0) return { totalCount: 0, categoryStats: {} }
    const stats = {}
    let total = 0
    for (const a of filteredAuctionsForMap) {
      const cat = a.category || 'Unknown'
      stats[cat] = (stats[cat] || 0) + 1
      total++
    }
    return { totalCount: total, categoryStats: stats }
  }, [filteredAuctionsForMap])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 md:py-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">GoAuksjon</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1 hidden sm:block">
                Monitor and analyze auction data in real-time
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {hasError && (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  <span className="hidden sm:inline">Connection </span>Error
                </Badge>
              )}
              <Button 
                onClick={handleRefresh}
                disabled={auctionsLoading || statsLoading || hourlyLoading}
                variant="outline"
                size="sm"
                className="h-9 px-2 sm:px-3"
              >
                <RefreshCw className={`h-4 w-4 ${(auctionsLoading || statsLoading || hourlyLoading) ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 py-3 sm:px-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-6">
          {import.meta.env.VITE_DEBUG === '1' && (
            <TabsList>
              <TabsTrigger value="table">Dashboard</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="table" className="space-y-3 sm:space-y-6">
            <HourlyChart stats={hourlyData} isLoading={hourlyLoading} />
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-6">
              <div className="lg:w-2/3 w-full">
                <MapWidget 
                  auctions={filteredAuctionsForMap} 
                  coordinates={coordinates}
                  onAreaSelect={setSelectedBounds}
                  selectedBounds={selectedBounds}
                />
              </div>
              <div className="lg:w-1/3 w-full">
                <CategoryChart stats={filteredCategoryStats} isLoading={auctionsLoading} />
              </div>
            </div>
            <Card>
              <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
                <CardTitle className="flex items-center justify-between gap-2 text-base sm:text-lg">
                  <span className="truncate">All Auction Data</span>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {statsData?.totalCount || auctions.length} items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {hasError ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Unable to load auction data</p>
                      <Button 
                        onClick={handleRefresh} 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : (
                  <AuctionTable 
                    data={areaFilteredAuctions} 
                    totalCount={statsData?.totalCount}
                    isLoading={auctionsLoading}
                    onPageSizeChange={setCurrentPageSize}
                    resetPageSignal={resetPageSignal}
                    onFilterStateChange={handleFilterStateChange}
                    onVisibleRowsChange={setVisibleTableRows}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {import.meta.env.VITE_DEBUG === '1' && (
            <TabsContent value="notifications" className="space-y-6">
              <NotificationSettings 
                currentMapBounds={selectedBounds}
                currentFilters={{
                  selectedCategories: parentSelectedCategories,
                  selectedSellers: parentSelectedSellers,
                }}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-6 sm:mt-12 safe-bottom">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs sm:text-sm text-muted-foreground">
            <p>GoAuksjon — Real-time auction monitoring</p>
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// --- App with Routing ---
function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/product-demo" element={<ProductDemoPage />} />
      </Routes>
    </Router>
  )
}

// --- Product Demo Page ---
function ProductDemoPage() {
  // Optionally add a header/footer for consistency
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Product Demo</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">Explore the product demo features</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-2 py-3 sm:px-4 sm:py-6">
        <ProductDemo />
      </main>
      <footer className="border-t bg-card mt-6 sm:mt-12 safe-bottom">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs sm:text-sm text-muted-foreground">
            <p>GoAuksjon — Real-time auction monitoring</p>
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
