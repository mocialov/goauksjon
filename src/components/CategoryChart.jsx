import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { getCategoryColor } from '@/lib/categoryColors'

// Legacy palette removed; now using shared getCategoryColor for consistency.

const CategoryChart = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="rounded-md">
        <div className="h-5 w-40 bg-muted animate-pulse rounded mb-4" />
        <div className="h-80 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!stats?.categoryStats) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No category data available
      </div>
    )
  }

  const chartData = Object.entries(stats.categoryStats)
    .map(([category, count]) => ({
      category: category, // use full name (no truncation)
      fullCategory: category,
      count
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)

  // Map height is roughly 48rem; with barSize 24 and gap ~10%, approximate visible bars count
  const MAX_VISIBLE = 25 // approximate number of bars (24px each + gaps) to fit within 48rem without scroll
  const coloredAll = chartData.map(item => ({
    ...item,
    color: getCategoryColor(item.fullCategory)
  }))
  const coloredData = coloredAll.slice(0, MAX_VISIBLE)
  const hiddenCount = coloredAll.length - coloredData.length
  const maxCount = coloredData.length ? Math.max(...coloredData.map(d => d.count)) : 0

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.fullCategory}</p>
          <p className="text-sm text-muted-foreground">
            Count: <span className="font-medium text-foreground">{data.count}</span>
          </p>
        </div>
      )
    }
    return null
  }

  // Horizontal bar chart only; no pie tooltip needed now.

  return (
    <div className="rounded-md">
      <div className="flex justify-center">
          {/* Fixed height aligned with map (48rem). No scrolling; cap categories. */}
          <ResponsiveContainer width="100%" height={Math.max(320, Math.min(768, coloredData.length * 30))}>
            <BarChart
            data={coloredData}
            layout="vertical"
              margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              className="fill-muted-foreground" 
              domain={[0, 'dataMax']} 
              allowDecimals={false}
              tickFormatter={(v) => (Number.isInteger(v) ? v : Math.round(v))}
              label={{ value: 'Items listed', position: 'insideBottomRight', offset: -5, style: { fill: 'var(--foreground)', fontSize: 12 } }}
            />
            <YAxis 
              dataKey="category" 
              type="category" 
              width={0} /* Collapse Y-axis space */
              tick={false} /* Hide ticks/labels */
            />
            <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                radius={[0, 6, 6, 0]}
                barSize={24} /* Thicker bars for expanded y-axis */
                barCategoryGap="10%" /* Slight gap between categories */
              >
                <LabelList 
                  dataKey="category" 
                  content={(props) => {
                    const { x, y, width, height, value } = props
                    if (value == null) return null
                    const padding = 6
                    const textX = x + padding
                    const centerY = y + height / 2
                    return (
                      <text
                        x={textX}
                        y={centerY}
                        fontSize={11}
                        fontWeight={500}
                        fill="var(--foreground)"
                        dominantBaseline="middle"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {value}
                      </text>
                    )
                  }}
                />
              {coloredData.map((entry, index) => (
                <Cell key={`cell-bar-${index}`} fill={entry.color} />
              ))}
            </Bar>
            </BarChart>
          </ResponsiveContainer>
          {hiddenCount > 0 && (
            <div className="mt-2 text-xs text-muted-foreground px-2">
              +{hiddenCount} more categories not shown
            </div>
          )}
      </div>
    </div>
  )
}

export default CategoryChart
