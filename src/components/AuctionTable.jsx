import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { CATEGORY_TREE, SELLER_CATEGORIES, getAllCategories, mapSellerToCategory, findParentCategory } from '@/lib/filters'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar as DatePicker } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Calendar,
  User,
  Package,
  Tag,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { format, isWithinInterval } from 'date-fns'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  saveFilterPreferences,
  loadFilterPreferences,
  savePaginationPreferences,
  loadPaginationPreferences,
  saveUIState,
  loadUIState
} from '@/lib/userPreferences'


// Props:
// data: array of rows already filtered by parent-level criteria and map selection
// totalCount: total number of rows available across all pages (pre-filter)
// onPageChange: callback({ pageIndex, pageSize }) for parent to fetch data (only if manualPagination true)
// onPageSizeChange: callback with current pageSize (for parent first-page slicing)
// resetPageSignal: any changing value triggers pageIndex reset to 0 (used when clearing map selection)
// onFilterStateChange: callback invoked when local filter UI changes so parent can mirror state
// onVisibleRowsChange: callback invoked with currently visible rows on the current page (for map markers)
const AuctionTable = ({
  data = [],
  totalCount = undefined,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  resetPageSignal,
  onFilterStateChange,
  onVisibleRowsChange,
}) => {
  // Get all categories once
  const allCategories = useMemo(() => getAllCategories(), [])

  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedSellers, setSelectedSellers] = useState([])
  const [dateRange, setDateRange] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // Expanded parents state
  const [expandedParents, setExpandedParents] = useState(() => new Set())

  // Track if preferences have been loaded to prevent premature initialization
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const isMobile = useIsMobile()

  // Load preferences from localStorage on component mount
  useEffect(() => {
    console.log('Loading preferences from localStorage...')
    
    // Load filter preferences
    const filterPrefs = loadFilterPreferences()
    console.log('Loaded filter preferences:', filterPrefs)
    
    if (filterPrefs) {
      if (filterPrefs.selectedCategories && filterPrefs.selectedCategories.length > 0) {
        setSelectedCategories(filterPrefs.selectedCategories)
      } else {
        setSelectedCategories(getAllCategories())
      }
      
      if (filterPrefs.selectedSellers && filterPrefs.selectedSellers.length > 0) {
        setSelectedSellers(filterPrefs.selectedSellers)
      }
      
      if (filterPrefs.dateRange) {
        setDateRange(filterPrefs.dateRange)
      }
      
      if (filterPrefs.expandedParents) {
        setExpandedParents(filterPrefs.expandedParents)
      }
    } else {
      // Initialize with all categories if no saved preferences
      setSelectedCategories(getAllCategories())
    }

    // Load pagination preferences
    const paginationPrefs = loadPaginationPreferences()
    console.log('Loaded pagination preferences:', paginationPrefs)
    setPagination(prev => ({ ...prev, pageSize: paginationPrefs.pageSize }))

    // Load UI state preferences
    const uiPrefs = loadUIState()
    console.log('Loaded UI preferences:', uiPrefs)
    setShowFilters(uiPrefs.showFilters)
    
    setPreferencesLoaded(true)
  }, [])

  // Initialize selectedSellers with all seller categories when data changes, but only if no saved preferences exist
  const hasInitializedSellers = useRef(false)
  useEffect(() => {
    if (data.length > 0 && preferencesLoaded && !hasInitializedSellers.current) {
      // Only set all seller categories if no saved preferences exist and selectedSellers is empty
      if (selectedSellers.length === 0) {
        console.log('Initializing selectedSellers with all seller categories:', SELLER_CATEGORIES)
        setSelectedSellers(SELLER_CATEGORIES)
        hasInitializedSellers.current = true
      }
    }
  }, [data.length, preferencesLoaded])

  // Save preferences whenever they change (but only after initial load)
  useEffect(() => {
    if (preferencesLoaded) {
      console.log('Saving filter preferences:', {
        selectedCategories: selectedCategories.length,
        selectedSellers: selectedSellers.length,
        dateRange: !!dateRange,
        expandedParents: expandedParents.size
      })
      saveFilterPreferences({
        selectedCategories,
        selectedSellers,
        dateRange,
        expandedParents
      })
    }
  }, [selectedCategories, selectedSellers, dateRange, expandedParents, preferencesLoaded])

  useEffect(() => {
    if (preferencesLoaded) {
      console.log('Saving pagination preferences:', { pageSize: pagination.pageSize })
      savePaginationPreferences({ pageSize: pagination.pageSize })
      if (typeof onPageSizeChange === 'function') {
        onPageSizeChange(pagination.pageSize)
      }
    }
  }, [pagination.pageSize, preferencesLoaded])

  useEffect(() => {
    if (preferencesLoaded) {
      console.log('Saving UI state:', { showFilters })
      saveUIState({ showFilters })
    }
  }, [showFilters, preferencesLoaded])

  const toggleParentExpansion = (parentName) => {
    setExpandedParents(prev => {
      const next = new Set(prev)
      if (next.has(parentName)) next.delete(parentName); else next.add(parentName)
      return next
    })
  }

  // Helper: all descendant categories for a parent (including parent itself)
  const getAllDescendants = (parentName) => {
    const node = CATEGORY_TREE.find(p => p.name === parentName)
    if (!node) return []
    return [parentName, ...(node.children || [])]
  }

  // Parent checkbox state helpers
  const isParentFullySelected = (parentName) => {
    const descendants = getAllDescendants(parentName)
    return descendants.every(d => selectedCategories.includes(d))
  }

  const isParentIndeterminate = (parentName) => {
    const descendants = getAllDescendants(parentName)
    const selectedCount = descendants.filter(d => selectedCategories.includes(d)).length
    return selectedCount > 0 && selectedCount < descendants.length
  }

  const toggleParentSelection = (parentName) => {
    setSelectedCategories(prev => {
      const descendants = getAllDescendants(parentName)
      const allSelected = descendants.every(d => prev.includes(d))
      if (allSelected) {
        // remove all
        return prev.filter(c => !descendants.includes(c))
      }
      // add all (merge unique)
      const next = new Set([...prev, ...descendants])
      return Array.from(next)
    })
  }

  const toggleChildSelection = (parentName, childName, checked) => {
    console.log('toggleChildSelection called:', { parentName, childName, checked })
    setSelectedCategories(prev => {
      let next
      if (checked) {
        next = new Set([...prev, childName])
      } else {
        next = new Set(prev.filter(c => c !== childName))
      }
      const result = Array.from(next)
      console.log('Updated selectedCategories:', result)
      return result
    })
  }

  // Get unique seller categories from data
  const uniqueSellers = useMemo(() => {
    return SELLER_CATEGORIES
  }, [])

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0
    // Only count category filter as active if not all categories are selected
    if (selectedCategories.length > 0 && selectedCategories.length < allCategories.length) count++
    // Only count seller filter as active if not all sellers are selected
    if (selectedSellers.length > 0 && selectedSellers.length < uniqueSellers.length) count++
    if (dateRange?.from || dateRange?.to) count++
    return count
  }, [selectedCategories, selectedSellers, dateRange, allCategories.length, uniqueSellers.length])

  // Helper function to find parent category for a subcategory
  const findParentCategory = useCallback((categoryName) => {
    // Handle format like "Parent Category: Sub Category"
    if (categoryName.includes(':')) {
      const [parentPart, childPart] = categoryName.split(':').map(s => s.trim())
      
      // Verify this is a valid parent-child relationship in our tree
      const parentNode = CATEGORY_TREE.find(p => p.name === parentPart)
      if (parentNode && parentNode.children.includes(childPart)) {
        return parentPart
      }
    }
    
    // Fallback: check if it's a direct subcategory name
    for (const parent of CATEGORY_TREE) {
      if (parent.name === categoryName) {
        // It's a parent category
        return null
      }
      if (parent.children.includes(categoryName)) {
        // It's a subcategory
        return parent.name
      }
    }
    return null
  }, [])

  const columns = useMemo(
    () => [
      {
        accessorKey: 'inserted_at',
        filterFn: (row, columnId, filterValue) => {
          // If no filter value is set, show all items
          if (!filterValue || (!filterValue.from && !filterValue.to)) {
            return true
          }
          
          const date = new Date(row.getValue(columnId))
          
          // If only 'from' date is set
          if (filterValue.from && !filterValue.to) {
            return date >= filterValue.from
          }
          
          // If only 'to' date is set
          if (!filterValue.from && filterValue.to) {
            return date <= filterValue.to
          }
          
          // If both dates are set
          if (filterValue.from && filterValue.to) {
            return isWithinInterval(date, {
              start: filterValue.from,
              end: filterValue.to
            })
          }
          
          return true
        },
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Date Added
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => {
          const date = new Date(row.getValue('inserted_at'))
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          
          let dateLabel
          if (date >= today) {
            dateLabel = 'Today'
          } else if (date >= yesterday) {
            dateLabel = 'Yesterday'
          } else {
            dateLabel = 'Earlier'
          }
          
          return (
            <div className="text-sm">
              <div className="font-medium">{dateLabel}</div>
              {dateLabel === 'Earlier' ? (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>{format(date, 'MMM dd, yyyy')}</div>
                  <div>{format(date, 'HH:mm')}</div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {format(date, 'HH:mm')}
                </div>
              )}
            </div>
          )
        },
        size: 150,
      },
      {
        accessorKey: 'item',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              <Package className="mr-2 h-4 w-4" />
              Item
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="max-w-[600px]">
            <div className="font-medium break-words">{row.getValue('item')}</div>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        filterFn: (row, columnId, filterValue) => {
          // filterValue is an array of selected category names (include semantics)
          if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) return true
          
          const value = row.getValue(columnId)
          
          // Handle "Parent: Child" format in data
          if (value && value.includes(':')) {
            const [parentPart, childPart] = value.split(':').map(s => s.trim())
            
            // For an item to be shown, BOTH the parent category AND child category must be in the filter
            // OR if all categories are selected (when filter is undefined/null, we return true above)
            const shouldShow = filterValue.includes(parentPart) && filterValue.includes(childPart)
            return shouldShow
          }
          
          // Fallback for direct category names
          const shouldShow = filterValue.includes(value)
          return shouldShow
        },
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              <Tag className="mr-2 h-4 w-4" />
              Category
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => {
          const category = row.getValue('category')
          
          if (!category || category === 'Unknown') {
            return <div className="font-medium">Unknown</div>
          }
          
          const parentCategory = findParentCategory(category)
          
          if (parentCategory) {
            // It's a subcategory in "Parent: Child" format, extract the child part
            const childPart = category.includes(':') ? category.split(':')[1].trim() : category
            console.log(`Rendering subcategory: ${childPart}, parent: ${parentCategory}`)
            
            return (
              <div className="font-medium">
                <div className="text-sm text-muted-foreground">{parentCategory}</div>
                <div>{childPart}</div>
              </div>
            )
          } else {
            // It's a parent category or unknown format
            console.log(`Rendering parent category: ${category}`)
            return <div className="font-medium">{category}</div>
          }
        },
        size: 200,
      },
      {
        accessorKey: 'seller',
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue || filterValue.length === 0) return true
          const rawSeller = row.getValue(columnId)
          const sellerCategory = mapSellerToCategory(rawSeller)
          return filterValue.includes(sellerCategory)
        },
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              <User className="mr-2 h-4 w-4" />
              Seller
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => {
          const rawSeller = row.getValue('seller')
          const sellerCategory = mapSellerToCategory(rawSeller)
          return (
            <div className="space-y-1">
              <div className="font-medium">{sellerCategory}</div>
              {rawSeller && rawSeller !== sellerCategory && (
                <div className="text-xs text-muted-foreground">{rawSeller}</div>
              )}
            </div>
          )
        },
        size: 200,
      },
    ],
    [findParentCategory]
  )

  // Use client-side pagination (manualPagination=false). We let react-table derive pageCount
  // from the filtered row model so page numbers update after filters are applied.
  const shouldUseManualPagination = false

  const table = useReactTable({
    data,
    columns,
    manualPagination: shouldUseManualPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    autoResetPageIndex: false,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  })

  // Number of rows after all filtering (react-table's filtered row model)
  const filteredRowCount = table.getFilteredRowModel().rows.length

  // Reset page index when filters or global search change so we don't end up on an empty page
  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [globalFilter, columnFilters])

  // Notify parent about pagination changes (for data fetching)
  // Only notify when using manual pagination (server-side)
  useEffect(() => {
    if (typeof onPageChange === 'function' && shouldUseManualPagination) {
      onPageChange({ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize })
    }
  }, [pagination.pageIndex, pagination.pageSize, onPageChange, shouldUseManualPagination])

  // Report filter UI state upward whenever it changes so parent can derive filtered base.
  const prevFilterStateRef = useRef({})
  useEffect(() => {
    if (!onFilterStateChange || !preferencesLoaded) return
    
    const currentState = {
      selectedCategories: selectedCategories.join(','),
      selectedSellers: selectedSellers.join(','),
      dateRange: dateRange ? `${dateRange.from?.toISOString()}-${dateRange.to?.toISOString()}` : '',
      globalFilter,
    }
    
    const prevState = prevFilterStateRef.current
    
    // Only call the callback if something actually changed
    if (
      currentState.selectedCategories !== prevState.selectedCategories ||
      currentState.selectedSellers !== prevState.selectedSellers ||
      currentState.dateRange !== prevState.dateRange ||
      currentState.globalFilter !== prevState.globalFilter
    ) {
      prevFilterStateRef.current = currentState
      onFilterStateChange({
        selectedCategories,
        selectedSellers,
        dateRange,
        globalFilter,
      })
    }
  }, [selectedCategories, selectedSellers, dateRange, globalFilter, onFilterStateChange, preferencesLoaded])

  // Expose pageSize changes immediately (initial mount after preferences load)
  useEffect(() => {
    if (preferencesLoaded && typeof onPageSizeChange === 'function') {
      onPageSizeChange(pagination.pageSize)
    }
  }, [preferencesLoaded, pagination.pageSize, onPageSizeChange])

  // Report currently visible rows to parent (for map markers)
  // Use a ref to store the table instance to avoid infinite loops
  const tableRef = useRef(table)
  tableRef.current = table
  
  const prevVisibleRowsRef = useRef([])
  useEffect(() => {
    if (!onVisibleRowsChange) return
    const visibleRows = tableRef.current.getRowModel().rows.map(row => row.original)
    
    // Only call the callback if the visible rows actually changed (by ID)
    const prevIds = prevVisibleRowsRef.current.map(r => r.id).join(',')
    const currentIds = visibleRows.map(r => r.id).join(',')
    
    if (prevIds !== currentIds) {
      prevVisibleRowsRef.current = visibleRows
      onVisibleRowsChange(visibleRows)
    }
  }, [pagination.pageIndex, pagination.pageSize, data, onVisibleRowsChange])

  // Reset page index externally (e.g. when clearing map selection)
  useEffect(() => {
    if (resetPageSignal !== undefined) {
      setPagination(p => ({ ...p, pageIndex: 0 }))
    }
  }, [resetPageSignal])

  // Apply filters to table columns
  useEffect(() => {
    const categoryColumn = tableRef.current.getColumn('category')
    if (categoryColumn) {
      // Only apply category filter if not all categories are selected
      // Check if selected categories include all available categories from the tree
      const allCategoriesFromTree = getAllCategories()
      const hasAllCategories = allCategoriesFromTree.every(cat => selectedCategories.includes(cat))
      const shouldFilter = selectedCategories.length > 0 && !hasAllCategories
      const filterValue = shouldFilter ? selectedCategories : undefined
      console.log('Applying category filter:', { 
        shouldFilter, 
        hasAllCategories,
        selectedCategories: selectedCategories.length, 
        allCategoriesFromTree: allCategoriesFromTree.length
      })
      categoryColumn.setFilterValue(filterValue)
    }
  }, [selectedCategories, allCategories.length])

  useEffect(() => {
    const sellerColumn = tableRef.current.getColumn('seller')
    if (sellerColumn) {
      // Only apply seller filter if not all sellers are selected
      const shouldFilter = selectedSellers.length > 0 && selectedSellers.length < uniqueSellers.length
      sellerColumn.setFilterValue(
        shouldFilter ? selectedSellers : undefined
      )
    }
  }, [selectedSellers, uniqueSellers.length])

  useEffect(() => {
    const dateColumn = tableRef.current.getColumn('inserted_at')
    if (dateColumn) {
      dateColumn.setFilterValue(dateRange || undefined)
    }
  }, [dateRange])

  // Re-apply all filters when pagination pageSize changes to ensure filter state is preserved
  useEffect(() => {
    // Category filter
    const categoryColumn = tableRef.current.getColumn('category')
    if (categoryColumn) {
      const allCategoriesFromTree = getAllCategories()
      const hasAllCategories = allCategoriesFromTree.every(cat => selectedCategories.includes(cat))
      const shouldFilter = selectedCategories.length > 0 && !hasAllCategories
      categoryColumn.setFilterValue(shouldFilter ? selectedCategories : undefined)
    }
    
    // Seller filter
    const sellerColumn = tableRef.current.getColumn('seller')
    if (sellerColumn) {
      const shouldFilter = selectedSellers.length > 0 && selectedSellers.length < uniqueSellers.length
      sellerColumn.setFilterValue(shouldFilter ? selectedSellers : undefined)
    }
    
    // Date filter
    const dateColumn = tableRef.current.getColumn('inserted_at')
    if (dateColumn) {
      dateColumn.setFilterValue(dateRange || undefined)
    }
  }, [pagination.pageSize, selectedCategories, selectedSellers, dateRange, allCategories.length, uniqueSellers.length])

  const clearFilters = () => {
    // Reset to all categories selected (default state)
    setSelectedCategories(getAllCategories())
    // Reset to all seller categories selected (default state)
    setSelectedSellers(SELLER_CATEGORIES)
    setDateRange(null)
    setGlobalFilter('')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="rounded-md border">
          <div className="h-12 bg-muted animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-t bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Auction Items</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {filteredRowCount > 0 ? (
              <>Viewing {filteredRowCount} item{filteredRowCount !== 1 ? 's' : ''}</>
            ) : (
              <>No items found</>
            )}
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="p-2 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          {/* Top Row: Search and Filter Toggle */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search all columns..."
                value={globalFilter ?? ''}
                onChange={(event) => setGlobalFilter(String(event.target.value))}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
                {showFilters ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {dateRange?.from && (
                <Badge variant="secondary" className="gap-2">
                  <Calendar className="h-3 w-3" />
                  {dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                    </>
                  ) : (
                    <>From {format(dateRange.from, "MMM dd, yyyy")}</>
                  )}
                  <button
                    onClick={() => setDateRange(null)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCategories.length > 0 && selectedCategories.length < allCategories.length && (
                <Badge variant="secondary" className="gap-2">
                  <Tag className="h-3 w-3" />
                  Including {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'}
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedSellers.length > 0 && selectedSellers.length < uniqueSellers.length && (
                <Badge variant="secondary" className="gap-2">
                  <User className="h-3 w-3" />
                  {selectedSellers.length} seller{selectedSellers.length === 1 ? '' : 's'}
                  <button
                    onClick={() => setSelectedSellers([])}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid gap-3 sm:gap-4 border-t pt-3 sm:pt-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DatePicker
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => setDateRange(range || null)}
                      numberOfMonths={isMobile ? 1 : 2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category Filter (Tree) */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4" />
                  Category
                </label>
                <div className="space-y-1 max-h-64 overflow-y-auto border rounded p-2 bg-background">
                  {CATEGORY_TREE.map(parent => {
                    const fullySelected = isParentFullySelected(parent.name)
                    const indeterminate = isParentIndeterminate(parent.name)
                    return (
                      <div key={parent.name} className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`parent-${parent.name}`}
                            checked={fullySelected}
                            onCheckedChange={() => toggleParentSelection(parent.name)}
                            // @ts-ignore (radix prop for indeterminate styling - apply class)
                            data-indeterminate={indeterminate || undefined}
                            className={cn(indeterminate && 'data-[state=checked]:bg-primary')}
                          />
                          <button
                            type="button"
                            onClick={() => toggleParentExpansion(parent.name)}
                            className="p-0.5 rounded hover:bg-muted"
                            aria-label={expandedParents.has(parent.name) ? 'Collapse' : 'Expand'}
                          >
                            {expandedParents.has(parent.name) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          <label
                            htmlFor={`parent-${parent.name}`}
                            className="text-sm font-medium leading-none cursor-pointer select-none flex-1"
                          >
                            {parent.name}
                          </label>
                        </div>
                        {expandedParents.has(parent.name) && (
                          <div className="pl-6 space-y-1">
                            {parent.children.map(child => (
                              <div key={child} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`child-${child}`}
                                  checked={selectedCategories.includes(child)}
                                  onCheckedChange={(checked) => toggleChildSelection(parent.name, child, checked)}
                                />
                                <label
                                  htmlFor={`child-${child}`}
                                  className="text-xs font-medium leading-none cursor-pointer select-none flex-1"
                                >
                                  {child}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Seller Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Seller
                </label>
                <div className="space-y-1 max-h-[180px] overflow-y-auto border rounded p-2 bg-background">
                  {uniqueSellers.length > 0 ? (
                    uniqueSellers.map((seller) => (
                      <div key={seller} className="flex items-center space-x-2">
                        <Checkbox
                          id={`seller-${seller}`}
                          checked={selectedSellers.includes(seller)}
                          onCheckedChange={(checked) => {
                            const newSelected = checked
                              ? [...selectedSellers, seller]
                              : selectedSellers.filter(s => s !== seller)
                            setSelectedSellers(newSelected)
                          }}
                        />
                        <label
                          htmlFor={`seller-${seller}`}
                          className="text-sm font-medium leading-none cursor-pointer select-none flex-1"
                        >
                          {seller}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No sellers</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Table - Desktop view */}
      {!isMobile ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b bg-muted/50">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getPaginationRowModel().rows?.length ? (
                  table.getPaginationRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        const url = row.original.url
                        if (url) {
                          window.open(url, '_blank', 'noopener,noreferrer')
                        }
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-4 align-middle">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Mobile card view */
        <div className="space-y-2">
          {table.getPaginationRowModel().rows?.length ? (
            table.getPaginationRowModel().rows.map((row) => (
              <Card
                key={row.id}
                className="p-3 cursor-pointer active:bg-muted/50 transition-colors"
                onClick={() => {
                  const url = row.original.url
                  if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer')
                  }
                }}
              >
                <div className="space-y-1.5">
                  <div className="font-medium text-sm leading-snug break-words">
                    {row.original.item}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {row.original.category && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {row.original.category}
                      </span>
                    )}
                    {row.original.seller && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {mapSellerToCategory(row.original.seller)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {row.original.inserted_at ? format(new Date(row.original.inserted_at), 'MMM dd, HH:mm') : '—'}
                    </span>
                    {row.original.location && (
                      <span className="truncate ml-2 max-w-[120px]">{row.original.location}</span>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
              No results found.
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 sm:px-2">
        <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
          {filteredRowCount > 0 ? (
            <>
              {Math.min((pagination.pageIndex * pagination.pageSize) + 1, filteredRowCount)}-{Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredRowCount)} of {filteredRowCount}
              {typeof totalCount === 'number' && filteredRowCount < totalCount && <> (from {totalCount})</>}
            </>
          ) : (
            <>No items</>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 sm:gap-4 lg:gap-8 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <p className="text-xs sm:text-sm font-medium whitespace-nowrap">Per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                const size = Number(value)
                setPagination(p => ({ ...p, pageSize: size, pageIndex: 0 }))
                table.setPageSize(size)
              }}
            >
              <SelectTrigger className="h-8 w-[60px] sm:w-[70px] text-xs sm:text-sm">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs sm:text-sm font-medium whitespace-nowrap">
            {table.getState().pagination.pageIndex + 1}/{Math.max(1, table.getPageCount())}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage() || table.getPageCount() <= 1}
            >
              <span className="sr-only">First page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage() || table.getPageCount() <= 1}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || table.getPageCount() <= 1}
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage() || table.getPageCount() <= 1}
            >
              <span className="sr-only">Last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuctionTable