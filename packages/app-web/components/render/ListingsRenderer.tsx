'use client'

/**
 * Listings Renderer Component
 * Renders card grid with filters, sort, and pagination
 * @see docs/features/TEMPLATE_SYSTEM_SPEC.md
 */

import { useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SortAsc,
  SortDesc,
  Filter,
  X,
} from 'lucide-react'
import type {
  ListingsArtifactContent,
  ListingItem,
  ListingsState,
} from '@/lib/render/types'
import {
  filterListings,
  sortListings,
  paginateListings,
} from '@/lib/render/templates/listings'

interface ListingsRendererProps {
  content: ListingsArtifactContent
  onStateChange?: (state: ListingsState) => void
}

export function ListingsRenderer({ content, onStateChange }: ListingsRendererProps) {
  const { items, config, state: initialState } = content

  const [state, setState] = useState<ListingsState>(initialState)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Update state and notify parent
  const updateState = useCallback((newState: Partial<ListingsState>) => {
    setState(prev => {
      const updated = { ...prev, ...newState }
      onStateChange?.(updated)
      return updated
    })
  }, [onStateChange])

  // Process items: search → filter → sort → paginate
  const processedData = useMemo(() => {
    let result = items

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(query)
        )
      )
    }

    // Filter
    result = filterListings(result, state.activeFilters)

    // Sort
    result = sortListings(result, state.currentSort)

    // Paginate
    return paginateListings(result, state.currentPage, config.pageSize)
  }, [items, searchQuery, state.activeFilters, state.currentSort, state.currentPage, config.pageSize])

  // Handle sort change
  const handleSort = (field: string) => {
    updateState({
      currentSort: {
        field,
        order: state.currentSort.field === field && state.currentSort.order === 'asc' ? 'desc' : 'asc',
      },
      currentPage: 1,
    })
  }

  // Handle filter change
  const handleFilter = (field: string, value: unknown) => {
    updateState({
      activeFilters: {
        ...state.activeFilters,
        [field]: value,
      },
      currentPage: 1,
    })
  }

  // Clear filter
  const clearFilter = (field: string) => {
    const newFilters = { ...state.activeFilters }
    delete newFilters[field]
    updateState({
      activeFilters: newFilters,
      currentPage: 1,
    })
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    updateState({ currentPage: page })
  }

  // Format field value for display
  const formatValue = (item: ListingItem, field: string): React.ReactNode => {
    const value = item[field]
    if (value === null || value === undefined) return ''

    if (field === config.priceField && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value)
    }

    return String(value)
  }

  // Active filters count
  const activeFilterCount = Object.keys(state.activeFilters).filter(
    k => state.activeFilters[k] !== undefined && state.activeFilters[k] !== ''
  ).length

  return (
    <div className="w-full max-w-6xl">
      {/* Header: Search + Sort + Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Sort + Filter controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <select
              value={state.currentSort.field}
              onChange={(e) => handleSort(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              {config.sortableFields.map(field => (
                <option key={field} value={field}>
                  Sort by {formatFieldLabel(field)}
                </option>
              ))}
            </select>

            <button
              onClick={() => updateState({
                currentSort: { ...state.currentSort, order: state.currentSort.order === 'asc' ? 'desc' : 'asc' }
              })}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {state.currentSort.order === 'asc' ? (
                <SortAsc className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <SortDesc className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-500 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              {config.filterableFields.map(field => (
                <div key={field} className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {formatFieldLabel(field)}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Filter by ${formatFieldLabel(field).toLowerCase()}`}
                      value={(state.activeFilters[field] as string) || ''}
                      onChange={(e) => handleFilter(field, e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                    />
                    {state.activeFilters[field] !== undefined && state.activeFilters[field] !== '' && (
                      <button
                        onClick={() => clearFilter(field)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                      >
                        <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {processedData.items.length} of {processedData.totalItems} items
        </p>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {processedData.items.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Image */}
            {config.imageField && item[config.imageField] !== undefined && item[config.imageField] !== null && (
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                <img
                  src={String(item[config.imageField])}
                  alt={String(item[config.primaryField] || '')}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              {/* Primary field */}
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {formatValue(item, config.primaryField)}
              </h3>

              {/* Secondary field */}
              {config.secondaryField && item[config.secondaryField] !== undefined && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {formatValue(item, config.secondaryField)}
                </p>
              )}

              {/* Price */}
              {config.priceField && item[config.priceField] !== undefined && (
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {formatValue(item, config.priceField)}
                </p>
              )}

              {/* Other fields */}
              <div className="mt-3 space-y-1">
                {config.cardFields
                  .filter(f =>
                    f !== config.primaryField &&
                    f !== config.secondaryField &&
                    f !== config.priceField &&
                    f !== config.imageField &&
                    item[f] !== undefined
                  )
                  .slice(0, 2)
                  .map(field => (
                    <div key={field} className="text-xs text-gray-400">
                      <span className="font-medium">{formatFieldLabel(field)}:</span>{' '}
                      {formatValue(item, field)}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {processedData.items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No items match your search or filters.</p>
          {(searchQuery || activeFilterCount > 0) && (
            <button
              onClick={() => {
                setSearchQuery('')
                updateState({ activeFilters: {}, currentPage: 1 })
              }}
              className="mt-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 text-sm"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {processedData.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(state.currentPage - 1)}
            disabled={state.currentPage === 1}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: processedData.totalPages }, (_, i) => i + 1)
              .filter(page =>
                page === 1 ||
                page === processedData.totalPages ||
                Math.abs(page - state.currentPage) <= 1
              )
              .map((page, idx, arr) => {
                // Add ellipsis
                if (idx > 0 && page - arr[idx - 1] > 1) {
                  return (
                    <span key={`ellipsis-${page}`} className="flex items-center">
                      <span className="px-2 text-gray-400">...</span>
                      <button
                        onClick={() => handlePageChange(page)}
                        className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition-colors ${
                          page === state.currentPage
                            ? 'bg-purple-500 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    </span>
                  )
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition-colors ${
                      page === state.currentPage
                        ? 'bg-purple-500 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
          </div>

          <button
            onClick={() => handlePageChange(state.currentPage + 1)}
            disabled={state.currentPage === processedData.totalPages}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Format field name to human-readable label
 */
function formatFieldLabel(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
