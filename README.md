# Auction Data Dashboard

A modern, responsive frontend application for visualizing and managing auction data from Supabase. Built with React, TypeScript, and modern web technologies to provide comprehensive table functionality and real-time data insights.

## Features

### 📊 **Dashboard Overview**
- **Real-time Statistics**: Total auctions, categories, sellers, and most popular category
- **Interactive Charts**: Bar charts and pie charts for category distribution analysis
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional interface with smooth animations and transitions

### 📋 **Advanced Table Functionality**
- **Global Search**: Search across all columns with real-time filtering
- **Category Filtering**: Filter by specific auction categories
- **Column Sorting**: Sort by any column (ID, Item, Seller, Category, Date)
- **Pagination**: Configurable rows per page (10, 20, 30, 40, 50)
- **Row Selection**: Multi-select functionality with selection indicators
- **Responsive Table**: Horizontal scrolling on smaller screens
- **External Links**: Direct links to original auction URLs

### 🎨 **User Experience**
- **Loading States**: Skeleton placeholders during data fetching
- **Error Handling**: Graceful error messages with retry options
- **Hover Effects**: Interactive hover states on all clickable elements
- **Icon Integration**: Lucide React icons for enhanced visual clarity
- **Dark/Light Theme**: Automatic theme detection and switching

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend Framework** | React 19.1.0 | Component-based UI development |
| **Build Tool** | Vite 6.3.5 | Fast development and optimized builds |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **UI Components** | shadcn/ui | Pre-built, accessible components |
| **Data Fetching** | TanStack Query | Server state management and caching |
| **Table Library** | TanStack Table | Powerful table functionality |
| **Charts** | Recharts | Responsive chart components |
| **Icons** | Lucide React | Modern icon library |
| **Database** | Supabase | Real-time database and API |
| **Date Handling** | date-fns | Date formatting and manipulation |

| Column | Type | Description |
| `description` | Text | Detailed item description |
| `inserted_at` | Timestamp | Record creation timestamp |
| `seller` | Text | Seller name or company |
| `item` | Text | Item name or title |
| `category` | Text | Auction category classification |

## Installation and Setup

### Prerequisites
- Node.js 18+ and pnpm
- Supabase account and project
- Environment variables configured

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd auction-frontend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   pnpm run dev
   ```

5. **Build for production**
   ```bash
   pnpm run build
   ```

**`AuctionTable.jsx`** - Advanced data table with sorting, filtering, and pagination
- Global search functionality
- Column-specific filtering
- Sortable headers with visual indicators
- Configurable pagination
- Row selection capabilities
- Responsive design with horizontal scrolling

**`StatsCards.jsx`** - Dashboard statistics display
- Total auctions count
- Unique categories and sellers
- Most popular category identification
- Loading state animations

**`CategoryChart.jsx`** - Data visualization components
- Bar chart for category distribution
- Pie chart for category breakdown
- Interactive tooltips with detailed information
- Responsive chart sizing

### Custom Hooks

**`useAuctions.js`** - Data fetching and state management
- Supabase integration
- Query optimization with caching
- Filter and pagination support
- Error handling and retry logic

**`useAuctionStats.js`** - Statistics calculation
- Real-time data aggregation
- Category analysis
- Performance optimization

## Performance Optimizations

The application implements several performance optimizations to ensure smooth user experience:


**Efficient Rendering**: React's virtual DOM and optimized re-rendering patterns ensure smooth interactions even with large datasets (564+ auction items).

**Responsive Images**: All visual assets are optimized for different screen sizes and device capabilities.

## Deployment

The application is deployed using modern deployment practices:

1. **Build Optimization**: Vite creates optimized production builds with code splitting and minification
2. **Static Hosting**: Deployed as a static React application for maximum performance
3. **Environment Configuration**: Secure environment variable handling for API keys
4. **Continuous Deployment**: Git-based deployment workflow for easy updates
The application supports all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
**API Security**: Uses Supabase Row Level Security (RLS) and anonymous keys for secure data access without exposing sensitive credentials.
**Environment Variables**: All sensitive configuration is handled through environment variables, never committed to version control.

**HTTPS Enforcement**: All API communications use HTTPS encryption for data protection.

- Hourly line chart now aggregates subcategories under their top-level category for consistent coloring and reduced legend noise.
## Future Enhancements

Potential improvements for future versions:

- **Export Functionality**: CSV/Excel export capabilities
- **Advanced Filters**: Date range filtering and multi-category selection
- **Real-time Updates**: WebSocket integration for live data updates
- **User Authentication**: Login system for personalized dashboards
- **Data Visualization**: Additional chart types and analytics
- **Mobile App**: React Native version for mobile platforms

## Category Color Strategy

To ensure consistent and meaningful visual grouping across charts and tables, the application assigns colors based on the top-level category. Subcategories inherit their parent's color.

### How It Works
1. A raw category string (e.g. `"Vehicles & Parts > Used Vehicles"` or `"Business & Industrial: Heavy Machinery"`) is normalized by splitting on delimiters (`>`, `/`, `:`, `→`, `»`).
2. The first segment (trimmed, lowercased) becomes the top-level key: `"vehicles & parts"`.
3. If the key exists in the fixed mapping, its predefined color is used.
4. If not, a deterministic hash maps the category into a fallback palette, ensuring stable coloring.

### Mapped Top-Level Categories
```
Animals & Pet Supplies
Apparel & Accessories
Arts & Entertainment
Baby & Toddler
Business & Industrial
Cameras & Optics
Electronics
Food, Beverages & Tobacco
Furniture
Hardware
Health & Beauty
Home & Garden
Luggage & Bags
Mature
Media
Office Supplies
Religious & Ceremonial
Software
Sporting Goods
Toys & Games
Vehicles & Parts
```

### Adding / Adjusting Colors
Edit `src/lib/categoryColors.js`:
- Modify the `CATEGORY_COLORS` object for direct changes.
- Ensure new colors maintain good contrast in both light and dark themes (>3:1 WCAG recommended).
- For new top-level categories, add them explicitly to avoid fallback hashing.

### Current Palette Mode
The application now uses a lighter pastel palette for improved subtlety and reduced visual weight in dense charts. To revert to stronger, saturated colors:
1. Replace the `CATEGORY_COLORS` object with the previous saturated values (see git history).
2. Replace `FALLBACK_PALETTE` with the legacy array.
3. Optionally add a toggle (e.g. user preference) to switch between palettes at runtime.

## Map Selection & Drawing Behavior

The map supports manual rectangle selection for spatial filtering. Key behaviors:

- Clicking "Draw Rectangle" enters a drawing mode (map panning/zooming temporarily disabled) where you click & drag to create a bounding box.
- Press `Escape` or the "Cancel" button to abort without selecting.
- Previous auto-fit issues (zooming back out to Norway bounds whenever drawing started) were fixed by making zoom-to-bounds fire only once per selection change. This is handled via `onZoomApplied` in `ZoomToBounds` inside `MapWidget`.
- You can now manually zoom/pan to a detailed area first, then click "Draw Rectangle" without losing your zoom level.

To adjust the one-time zoom behavior, see `src/components/MapWidget.jsx` and modify the `shouldZoom` state management or the `onZoomApplied` callback.

### Utility Functions
`getCategoryColor(category)` – returns the assigned hex color
`listMappedCategories()` – lists all explicitly mapped category keys
`explainCategoryColor(raw)` – debug helper returning `{ raw, top, color, mapped }`

### Future Improvement Ideas
- Make palette user-configurable via settings panel.
- Provide optional color-blind safe mode (e.g. Okabe-Ito palette).
- Persist color overrides in Supabase or local storage.

## Support and Maintenance

The application is built with maintainability in mind:
- **Clean Code**: Well-structured, documented components
- **Type Safety**: TypeScript integration for better development experience
- **Testing Ready**: Component structure supports unit and integration testing
- **Scalable Architecture**: Modular design allows for easy feature additions

---

**Author**: Manus AI  
**Version**: 1.0.0  
**Last Updated**: September 27, 2025
