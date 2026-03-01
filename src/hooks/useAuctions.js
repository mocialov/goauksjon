import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Read SHOW_HISTORY from env: positive number = limit, -1 = fetch all
const SHOW_HISTORY = parseInt(import.meta.env.VITE_SHOW_HISTORY || '-1', 10)

export const useAuctions = (options = {}) => {
  return useQuery({
    queryKey: ['auctions', options],
    queryFn: async () => {
      const buildBaseQuery = () => {
        let query = supabase
          .from('auctions')
          .select('*')
          .order('inserted_at', { ascending: false })

        // Apply filters if provided
        if (options.category && options.category !== 'all') {
          query = query.eq('category', options.category)
        }

        if (options.seller) {
          query = query.ilike('seller', `%${options.seller}%`)
        }

        if (options.item) {
          query = query.ilike('item', `%${options.item}%`)
        }

        return query
      }

      // Apply pagination if explicitly requested by the caller
      if (options.page && options.pageSize) {
        let query = buildBaseQuery()
        const from = (options.page - 1) * options.pageSize
        const to = from + options.pageSize - 1
        query = query.range(from, to)
        const { data, error, count } = await query
        if (error) throw new Error(error.message)
        return { data, count }
      }

      // When SHOW_HISTORY is -1, fetch ALL rows by paginating through Supabase's
      // 1000-row default limit. Otherwise respect the configured limit.
      if (SHOW_HISTORY === -1) {
        const PAGE_SIZE = 1000
        let allData = []
        let page = 0
        let hasMore = true

        while (hasMore) {
          const from = page * PAGE_SIZE
          const to = from + PAGE_SIZE - 1
          const query = buildBaseQuery().range(from, to)
          const { data, error } = await query
          if (error) throw new Error(error.message)
          allData = allData.concat(data)
          hasMore = data.length === PAGE_SIZE
          page++
        }

        return { data: allData, count: allData.length }
      }

      // Positive SHOW_HISTORY: fetch at most that many recent rows
      const query = buildBaseQuery().limit(SHOW_HISTORY)
      const { data, error, count } = await query
      if (error) throw new Error(error.message)
      return { data, count }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useAuctionStats = () => {
  return useQuery({
    queryKey: ['auction-stats'],
    queryFn: async () => {
      // Get total count
      const { count: totalCount, error: countError } = await supabase
        .from('auctions')
        .select('*', { count: 'exact', head: true })

      if (countError) throw new Error(countError.message)

      // Get categories count
      const { data: categories, error: categoriesError } = await supabase
        .from('auctions')
        .select('category')
        .not('category', 'is', null)

      if (categoriesError) throw new Error(categoriesError.message)

      // Get unique sellers count
      const { data: sellers, error: sellersError } = await supabase
        .from('auctions')
        .select('seller')
        .not('seller', 'is', null)

      if (sellersError) throw new Error(sellersError.message)

      // Process categories
      const categoryStats = categories.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {})

      const uniqueCategories = Object.keys(categoryStats).length
      const uniqueSellers = new Set(sellers.map(s => s.seller)).size

      return {
        totalCount,
        uniqueCategories,
        uniqueSellers,
        categoryStats
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useHourlyStats = () => {
  return useQuery({
    queryKey: ['hourly-stats'],
    queryFn: async () => {
      // Get today's date
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Calculate last month range (yesterday back 30 days)
      const lastMonthStart = new Date(today)
      lastMonthStart.setDate(lastMonthStart.getDate() - 30)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Fetch auctions from today - let's be more permissive for debugging
      const { data: auctions, error } = await supabase
        .from('auctions')
        .select('inserted_at, category')
        .gte('inserted_at', today.toISOString())
        .lt('inserted_at', tomorrow.toISOString())
        .not('category', 'is', null)
        .order('inserted_at', { ascending: true })

      if (error) throw new Error(error.message)

      // Fetch historical auctions from last month (excluding today)
      const { data: historicalAuctions, error: histError } = await supabase
        .from('auctions')
        .select('inserted_at, category')
        .gte('inserted_at', lastMonthStart.toISOString())
        .lt('inserted_at', yesterday.toISOString())
        .not('category', 'is', null)

      if (histError) throw new Error(histError.message)

      // Process today's data: group by hour and category
      const hourlyData = {}

      // Group today's auctions by hour and top-level category
      const { extractTopCategory } = await import('@/lib/categoryColors.js')
      auctions.forEach(auction => {
        const date = new Date(auction.inserted_at)
        const hour = date.getHours()
        const topCategory = extractTopCategory(auction.category)
        if (!hourlyData[hour]) hourlyData[hour] = {}
        hourlyData[hour][topCategory] = (hourlyData[hour][topCategory] || 0) + 1
      })

      // Process historical data: calculate average items per hour
      let totalHistoricalDays = 0
      const dayCounts = {}

      historicalAuctions.forEach(auction => {
        const date = new Date(auction.inserted_at)
        const dayKey = date.toDateString()
        const hour = date.getHours()

        if (!dayCounts[dayKey]) {
          dayCounts[dayKey] = {}
          totalHistoricalDays++
        }

        dayCounts[dayKey][hour] = (dayCounts[dayKey][hour] || 0) + 1
      })

      // Calculate average per hour across all historical days
      const hourlyAverages = {}
      for (let hour = 0; hour < 24; hour++) {
        let totalForHour = 0
        Object.values(dayCounts).forEach(dayData => {
          totalForHour += dayData[hour] || 0
        })
        hourlyAverages[hour] = totalHistoricalDays > 0 ? totalForHour / totalHistoricalDays : 0
      }

      // Convert to array format for charting
      const chartData = []
      for (let hour = 0; hour < 24; hour++) {
        const hourData = { 
          hour: `${hour.toString().padStart(2, '0')}:00`,
          average: Math.round(hourlyAverages[hour] * 10) / 10 // Round to 1 decimal
        }
        if (hourlyData[hour]) {
          Object.assign(hourData, hourlyData[hour])
        }
        chartData.push(hourData)
      }

      // Get all unique categories
  // Derive unique top-level categories represented today
  const allCategories = [...new Set(auctions.map(a => extractTopCategory(a.category)))]

      // Calculate total listings per category today and sort by activity
      const categoryTotals = allCategories.map(category => ({
        category,
        total: auctions.filter(a => extractTopCategory(a.category) === category).length
      })).sort((a, b) => b.total - a.total)

      // Only include categories that have listings today (should be all of them)
      // and optionally limit to top categories to avoid clutter
      const activeCategories = categoryTotals
        .filter(item => item.total > 0)
        .slice(0, 10) // Show top 10 most active categories
        .map(item => item.category)

      return {
        chartData,
        categories: activeCategories,
        hasHistoricalData: totalHistoricalDays > 0
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
