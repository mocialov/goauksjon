import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getCategoryColor } from '@/lib/categoryColors'

// Using shared deterministic color mapping instead of local palette.

const HourlyChart = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!stats?.chartData || stats.chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Hourly Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>No hourly data available for today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { chartData } = stats
  // Collect categories from all rows (exclude hour & average)
  const collected = new Set()
  chartData.forEach(row => {
    Object.keys(row).forEach(k => {
      if (k !== 'hour' && k !== 'average') collected.add(k)
    })
  })
  let categories = Array.from(collected).sort()
  // If stats.categories provided and non-empty, use intersection to respect original ordering preference
  if (Array.isArray(stats.categories) && stats.categories.length > 0) {
    const providedSet = new Set(stats.categories)
    const intersection = stats.categories.filter(c => collected.has(c))
    if (intersection.length > 0) categories = intersection
  }
  // Filter out categories that have all zero values across chartData
  categories = categories.filter(cat => chartData.some(row => (row[cat] || 0) > 0))

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{`Time: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Hourly Listings by Category (vs 30-Day Average)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="hour"
              className="fill-muted-foreground"
              fontSize={12}
            />
            <YAxis className="fill-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {categories.map((category) => (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                stroke={getCategoryColor(category)}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
            {stats.hasHistoricalData && (
              <Line
                type="monotone"
                dataKey="average"
                stroke="#666666"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={false}
                name="30-Day Average"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default HourlyChart