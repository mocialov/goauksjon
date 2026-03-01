import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Tag, Users, TrendingUp } from 'lucide-react'

const StatsCards = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="h-3 sm:h-4 w-16 sm:w-20 bg-muted animate-pulse rounded" />
              <div className="h-3 sm:h-4 w-3 sm:w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="h-6 sm:h-8 w-12 sm:w-16 bg-muted animate-pulse rounded mb-1" />
              <div className="h-2 sm:h-3 w-20 sm:w-24 bg-muted animate-pulse rounded" />
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
    <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${card.color}`} />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold truncate">{card.value}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
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
