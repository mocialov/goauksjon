import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Tag, Users, TrendingUp } from 'lucide-react'

const StatsCards = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: "Total Auctions",
      value: stats?.totalCount?.toLocaleString() || "0",
      description: "Total auction items",
      icon: Database,
      color: "text-blue-600"
    },
    {
      title: "Categories",
      value: stats?.uniqueCategories?.toString() || "0",
      description: "Unique categories",
      icon: Tag,
      color: "text-green-600"
    },
    {
      title: "Sellers",
      value: stats?.uniqueSellers?.toString() || "0",
      description: "Active sellers",
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Most Popular",
      value: stats?.categoryStats ? 
        Object.entries(stats.categoryStats)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || "—" : "—",
      description: "Top category",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default StatsCards
