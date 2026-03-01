import React, { useMemo, useState, useEffect, useRef } from 'react'
// Only show auctions from these categories (parent or child)
const CATEGORY_TREE = [
  { name: 'Animals & Pet Supplies', children: ['Live Animals', 'Pet Supplies'] },
  { name: 'Apparel & Accessories', children: [ 'Clothing', 'Clothing Accessories', 'Costumes & Accessories', 'Handbag & Wallet Accessories', 'Handbags, Wallets & Cases', 'Jewelry', 'Shoe Accessories', 'Shoes' ] },
  { name: 'Arts & Entertainment', children: ['Event Tickets', 'Hobbies & Creative Arts', 'Party & Celebration'] },
  { name: 'Baby & Toddler', children: [ 'Baby Bathing', 'Baby Gift Sets', 'Baby Health', 'Baby Safety', 'Baby Toys & Activity Equipment', 'Baby Transport', 'Baby Transport Accessories', 'Diapering', 'Nursing & Feeding', 'Potty Training', 'Swaddling & Receiving Blankets' ] },
  { name: 'Business & Industrial', children: [ 'Advertising & Marketing', 'Agriculture', 'Automation Control Components', 'Construction', 'Dentistry', 'Film & Television', 'Finance & Insurance', 'Food Service', 'Forestry & Logging', 'Hairdressing & Cosmetology', 'Heavy Machinery', 'Hotel & Hospitality', 'Industrial Storage', 'Industrial Storage Accessories', 'Janitorial Carts & Caddies', 'Law Enforcement', 'Manufacturing', 'Material Handling', 'Medical', 'Mining & Quarrying', 'Piercing & Tattooing', 'Retail', 'Science & Laboratory', 'Signage', 'Work Safety Protective Gear' ] },
  { name: 'Cameras & Optics', children: ['Camera & Optic Accessories', 'Cameras', 'Optics', 'Photography'] },
  { name: 'Electronics', children: [ 'Arcade Equipment', 'Audio', 'Circuit Boards & Components', 'Communications', 'Components', 'Computers', 'Electronics Accessories', 'GPS Accessories', 'GPS Navigation Systems', 'GPS Tracking Devices', 'Marine Electronics', 'Networking', 'Print, Copy, Scan & Fax', 'Radar Detectors', 'Speed Radars', 'Toll Collection Devices', 'Video', 'Video Game Console Accessories', 'Video Game Consoles' ] },
  { name: 'Food, Beverages & Tobacco', children: ['Beverages', 'Food Items', 'Tobacco Products'] },
  { name: 'Furniture', children: [ 'Baby & Toddler Furniture', 'Beds & Accessories', 'Benches', 'Cabinets & Storage', 'Carts & Islands', 'Chair Accessories', 'Chairs', 'Entertainment Centers & TV Stands', 'Furniture Sets', 'Futon Frames', 'Futon Pads', 'Futons', 'Office Furniture', 'Office Furniture Accessories', 'Ottomans', 'Outdoor Furniture', 'Outdoor Furniture Accessories', 'Room Divider Accessories', 'Room Dividers', 'Shelving', 'Shelving Accessories', 'Sofa Accessories', 'Sofas', 'Table Accessories', 'Tables' ] },
  { name: 'Hardware', children: [ 'Building Consumables', 'Building Materials', 'Fencing & Barriers', 'Fuel', 'Fuel Containers & Tanks', 'Hardware Accessories', 'Hardware Pumps', 'Heating, Ventilation & Air Conditioning', 'Locks & Keys', 'Plumbing', 'Power & Electrical Supplies', 'Small Engines', 'Storage Tanks', 'Tool Accessories', 'Tools' ] },
  { name: 'Health & Beauty', children: ['Health Care', 'Jewelry Cleaning & Care', 'Personal Care'] },
  { name: 'Home & Garden', children: [ 'Bathroom Accessories', 'Business & Home Security', 'Decor', 'Emergency Preparedness', 'Fireplace & Wood Stove Accessories', 'Fireplaces', 'Flood, Fire & Gas Safety', 'Household Appliance Accessories', 'Household Appliances', 'Household Supplies', 'Kitchen & Dining', 'Lawn & Garden', 'Lighting', 'Lighting Accessories', 'Linens & Bedding', 'Parasols & Rain Umbrellas', 'Plants', 'Pool & Spa', 'Smoking Accessories', 'Umbrella Sleeves & Cases', 'Wood Stoves' ] },
  { name: 'Luggage & Bags', children: [ 'Backpacks', 'Briefcases', 'Cosmetic & Toiletry Bags', 'Diaper Bags', 'Dry Boxes', 'Duffel Bags', 'Fanny Packs', 'Garment Bags', 'Luggage Accessories', 'Messenger Bags', 'Shopping Totes', 'Suitcases', 'Train Cases' ] },
  { name: 'Mature', children: ['Erotic', 'Weapons'] },
  { name: 'Media', children: [ 'Books', 'Carpentry & Woodworking Project Plans', 'DVDs & Videos', 'Magazines & Newspapers', 'Music & Sound Recordings', 'Product Manuals', 'Sheet Music' ] },
  { name: 'Office Supplies', children: [ 'Book Accessories', 'Desk Pads & Blotters', 'Filing & Organization', 'General Office Supplies', 'Impulse Sealers', 'Lap Desks', 'Name Plates', 'Office & Chair Mats', 'Office Carts', 'Office Equipment', 'Office Instruments', 'Paper Handling', 'Presentation Supplies', 'Shipping Supplies' ] },
  { name: 'Religious & Ceremonial', children: ['Memorial Ceremony Supplies', 'Religious Items', 'Wedding Ceremony Supplies'] },
  { name: 'Software', children: ['Computer Software', 'Digital Goods & Currency', 'Video Game Software'] },
  { name: 'Sporting Goods', children: ['Athletics', 'Exercise & Fitness', 'Indoor Games', 'Outdoor Recreation'] },
  { name: 'Toys & Games', children: ['Game Timers', 'Games', 'Outdoor Play Equipment', 'Puzzles', 'Toys'] },
  { name: 'Vehicles & Parts', children: ['Vehicle Parts & Accessories', 'Vehicles'] }
]

// Build a Set of all allowed categories (parent and children, lowercased for case-insensitive match)
const ALLOWED_CATEGORIES = new Set([
  ...CATEGORY_TREE.map(c => c.name.toLowerCase()),
  ...CATEGORY_TREE.flatMap(c => c.children.map(child => child.toLowerCase()))
])

// Helper function to check if a category string matches allowed categories
const isCategoryAllowed = (categoryString) => {
  if (!categoryString || typeof categoryString !== 'string') return false

  const lowerCategory = categoryString.toLowerCase()

  // Check if the full string matches any allowed category
  if (ALLOWED_CATEGORIES.has(lowerCategory)) return true

  // Check if it's in "parent: child" format
  const colonIndex = lowerCategory.indexOf(':')
  if (colonIndex > 0) {
    const parent = lowerCategory.substring(0, colonIndex).trim()
    const child = lowerCategory.substring(colonIndex + 1).trim()

    // Check if parent or child is allowed
    if (ALLOWED_CATEGORIES.has(parent) || ALLOWED_CATEGORIES.has(child)) return true
  }

  return false
}
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, MapPin, BarChart3, Database, Zap, Shield, CheckCircle } from 'lucide-react'
import { useAuctions, useAuctionStats } from '../hooks/useAuctions'
import StatsCards from './StatsCards'
import CategoryChart from './CategoryChart'
import HourlyChart from './HourlyChart'
import MapWidget from './MapWidget'
import { extractTopCategory } from '../lib/categoryColors'

const ProductDemo = () => {
  const [coordinates, setCoordinates] = useState({})
  const [selectedBounds, setSelectedBounds] = useState(null)

  const {
    data: auctionsData,
    isLoading: auctionsLoading,
    error: auctionsError
  } = useAuctions()

  const {
    data: statsData,
    isLoading: statsLoading
  } = useAuctionStats()

  const auctions = auctionsData?.data || []

  // Debug: Log all unique categories in the data
  useEffect(() => {
    if (auctions.length > 0) {
      const uniqueCategories = [...new Set(auctions.map(a => a.category).filter(Boolean))]
      console.log('Unique categories in auction data:', uniqueCategories)
      console.log('Total unique categories:', uniqueCategories.length)
    }
  }, [auctions])

  // Function to check if coordinates are within bounds
  const isWithinBounds = (coord, bounds) => {
    if (!coord || !bounds) return false
    const [lat, lng] = coord
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    return lat >= sw.lat && lat <= ne.lat && lng >= sw.lng && lng <= ne.lng
  }


  // Filter auctions to only allowed categories (case-insensitive, skip missing/unknown)
  const categoryFilteredAuctions = useMemo(() => {
    const allowed = auctions.filter(a => {
      if (!a.category || typeof a.category !== 'string') {
        console.log('Skipping auction with invalid category:', a.category)
        return false
      }
      const isAllowed = isCategoryAllowed(a.category)
      if (!isAllowed) {
        console.log('Filtering out category:', a.category)
      }
      return isAllowed
    })
    console.log('Total auctions:', auctions.length, 'Filtered to allowed categories:', allowed.length)
    return allowed
  }, [auctions])

  // Filter auctions based on selected area (and allowed categories)
  const areaFilteredAuctions = useMemo(() => {
    if (!selectedBounds) return categoryFilteredAuctions
    return categoryFilteredAuctions.filter(auction => {
      const coord = coordinates[auction.location]
      return coord && isWithinBounds(coord, selectedBounds)
    })
  }, [categoryFilteredAuctions, coordinates, selectedBounds])

  // Limit total auctions based on area selection
  const limitedAuctions = useMemo(() => {
    const maxTotal = selectedBounds ? 10 : 50
    return areaFilteredAuctions.slice(0, maxTotal)
  }, [areaFilteredAuctions, selectedBounds])

  // For MapWidget: Use limited auctions
  const filteredAuctionsForMap = limitedAuctions

  // For category chart: Use same limited data as map
  const filteredAuctionsForCharts = limitedAuctions

  // For hourly chart: Use all category-filtered auctions (independent of map selection)
  const allAuctionsForHourly = categoryFilteredAuctions

  // Build category stats from the filtered subset
  const filteredCategoryStats = useMemo(() => {
    if (!filteredAuctionsForCharts || filteredAuctionsForCharts.length === 0) return { totalCount: 0, categoryStats: {} }
    const stats = {}
    let total = 0
    for (const a of filteredAuctionsForCharts) {
      const cat = a.category || 'Unknown'
      stats[cat] = (stats[cat] || 0) + 1
      total++
    }
    return { totalCount: total, categoryStats: stats }
  }, [filteredAuctionsForCharts])

  // Build filtered hourly stats from all auctions (independent of map selection)
  const filteredHourlyStats = useMemo(() => {
    if (!allAuctionsForHourly || allAuctionsForHourly.length === 0) {
      return { chartData: [], categories: [], hasHistoricalData: false }
    }

    // Get today's date to filter auctions
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Filter auctions to only today's entries
    const todaysFilteredAuctions = allAuctionsForHourly.filter(auction => {
      if (!auction.inserted_at) return false
      const auctionDate = new Date(auction.inserted_at)
      return auctionDate >= today && auctionDate < tomorrow
    })

    // Group by hour and top-level category
    const hourlyData = {}
    todaysFilteredAuctions.forEach(auction => {
      const date = new Date(auction.inserted_at)
      const hour = date.getHours()
      const topCategory = extractTopCategory(auction.category || 'Unknown')
      if (!hourlyData[hour]) hourlyData[hour] = {}
      hourlyData[hour][topCategory] = (hourlyData[hour][topCategory] || 0) + 1
    })

    // Convert to chart format
    const chartData = []
    for (let hour = 0; hour < 24; hour++) {
      const hourData = { 
        hour: `${hour.toString().padStart(2, '0')}:00`
      }
      if (hourlyData[hour]) {
        Object.assign(hourData, hourlyData[hour])
      }
      chartData.push(hourData)
    }

    // Get unique categories from today's filtered data
    const allCategories = [...new Set(todaysFilteredAuctions.map(a => extractTopCategory(a.category || 'Unknown')))]
    
    // Calculate totals per category and sort by activity
    const categoryTotals = allCategories.map(category => ({
      category,
      total: todaysFilteredAuctions.filter(a => extractTopCategory(a.category || 'Unknown') === category).length
    })).sort((a, b) => b.total - a.total)

    const activeCategories = categoryTotals
      .filter(item => item.total > 0)
      .slice(0, 10)
      .map(item => item.category)

    return {
      chartData,
      categories: activeCategories,
      hasHistoricalData: false // We don't have historical data in this filtered view
    }
  }, [allAuctionsForHourly])

  // Geocoding logic (simplified version from App.jsx)
  const geocodeQueueRef = useRef([])
  const processingRef = useRef(false)
  const cacheRef = useRef({})
  const lastRequestRef = useRef(0)
  const RETRY_DELAY_MS = 5000
  const MIN_INTERVAL_MS = 1100

  // Load cache from localStorage once
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
    try {
      while (geocodeQueueRef.current.length > 0) {
        const loc = geocodeQueueRef.current.shift()
        if (!loc) continue
        try {
          const coord = await geocode(loc)
          if (coord) {
            cacheRef.current[loc] = coord
            setCoordinates(prev => ({ ...prev, [loc]: coord }))
            persistCache()
          }
        } catch (e) {
          if (e.message === 'RATE_LIMIT') {
            geocodeQueueRef.current.unshift(loc)
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
          } else {
            console.warn('Geocode failed for', loc, e.message)
          }
        }
      }
    } finally {
      processingRef.current = false
    }
  }

  // Enqueue missing locations whenever auctions change
  useEffect(() => {
    const unique = [...new Set(auctions.map(a => a.location).filter(Boolean))]
    unique.forEach(enqueueGeocode)
  }, [auctions])

  const features = [
    {
      icon: MapPin,
      title: "Interactive Mapping",
      description: "Visualize auction locations and geographic trends in real-time"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive charts and insights for data-driven decisions"
    },
    {
      icon: Database,
      title: "Real-Time Data",
      description: "Live auction data updates with instant access to market changes"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized performance with sub-second query responses"
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-16 px-6 bg-gradient-to-br from-primary/5 to-secondary/10">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-sm px-3 py-1">
            🚀 Live Product Demo
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Auction Intelligence Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Experience the power of real-time auction data analytics. See live market trends,
            geographic insights, and comprehensive auction intelligence in action.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 py-6">
              Buy Our Services
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Main Demo - Map + Category Chart */}
      <section className="py-12 px-6 bg-secondary/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Interactive Geographic Analytics</h2>
            <p className="text-muted-foreground">Explore auction locations and category distributions</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-2/3 w-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Live Auction Map
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <MapWidget
                    auctions={filteredAuctionsForMap}
                    coordinates={coordinates}
                    onAreaSelect={setSelectedBounds}
                    selectedBounds={selectedBounds}
                    disablePersistence={true}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="lg:w-1/3 w-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Category Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CategoryChart stats={filteredCategoryStats} isLoading={auctionsLoading} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Hourly Analytics */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Time-Based Analytics</h2>
            <p className="text-muted-foreground">Monitor auction activity patterns throughout the day</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Today's Auction Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HourlyChart stats={filteredHourlyStats} isLoading={auctionsLoading} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 px-6 bg-secondary/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Platform Capabilities</h2>
            <p className="text-muted-foreground">Everything you need for auction intelligence</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="text-center transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-6 bg-gradient-to-r from-primary to-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
            <Shield className="h-12 w-12 mx-auto mb-4 text-white" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Access Premium Auction Intelligence?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join leading auction professionals who trust our platform for critical market insights
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                Buy Our Services
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent border-white text-white hover:bg-white hover:text-primary">
                Schedule Demo
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>30-day money-back guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>24/7 support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Enterprise security</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t bg-card">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 Auction Intelligence Platform - Live Product Demonstration</p>
        </div>
      </footer>
    </div>
  )
}

export default ProductDemo