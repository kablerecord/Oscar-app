'use client'

/**
 * Table Renderer Component
 * Renders data table with sort, filter, search, and pagination
 * @see docs/features/TEMPLATE_SYSTEM_SPEC.md
 */

import { useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  X,
  Check,
} from 'lucide-react'
import type {
  TableArtifactContent,
  TableState,
  TableColumn,
} from '@/lib/render/types'
import {
  filterTableRows,
  sortTableRows,
  paginateTableRows,
  exportToCSV,
} from '@/lib/render/templates/table'

interface TableRendererProps {
  content: TableArtifactContent
  onStateChange?: (state: TableState) => void
}

export function TableRenderer({ content, onStateChange }: TableRendererProps) {
  const { rows: allRows, columns, config, state: initialState } = content

  const [state, setState] = useState<TableState>(initialState)
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)

  // Update state and notify parent
  const updateState = useCallback((newState: Partial<TableState>) => {
    setState(prev => {
      const updated = { ...prev, ...newState }
      onStateChange?.(updated)
      return updated
    })
  }, [onStateChange])

  // Process rows: search → filter → sort → paginate
  const processedData = useMemo(() => {
    let result = allRows

    // Search and filter
    result = filterTableRows(result, state.activeFilters, state.searchQuery)

    // Sort
    if (state.currentSort) {
      result = sortTableRows(result, state.currentSort)
    }

    // Paginate if enabled
    if (config.pagination) {
      return {
        ...paginateTableRows(result, state.currentPage, config.pageSize),
        allFiltered: result,
      }
    }

    return {
      rows: result,
      totalPages: 1,
      totalRows: result.length,
      allFiltered: result,
    }
  }, [allRows, state.activeFilters, state.searchQuery, state.currentSort, state.currentPage, config.pagination, config.pageSize])

  // Handle sort
  const handleSort = (column: string) => {
    if (!config.sortable) return

    const currentSort = state.currentSort
    let newOrder: 'asc' | 'desc' = 'asc'

    if (currentSort?.column === column) {
      newOrder = currentSort.order === 'asc' ? 'desc' : 'asc'
    }

    updateState({
      currentSort: { column, order: newOrder },
      currentPage: 1,
    })
  }

  // Handle search
  const handleSearch = (query: string) => {
    updateState({
      searchQuery: query,
      currentPage: 1,
    })
  }

  // Handle filter
  const handleFilter = (column: string, value: unknown) => {
    updateState({
      activeFilters: {
        ...state.activeFilters,
        [column]: value,
      },
      currentPage: 1,
    })
  }

  // Clear filter
  const clearFilter = (column: string) => {
    const newFilters = { ...state.activeFilters }
    delete newFilters[column]
    updateState({
      activeFilters: newFilters,
      currentPage: 1,
    })
  }

  // Handle row selection
  const handleSelectRow = (rowId: string) => {
    if (!config.selectable) return

    const newSelected = state.selectedRows.includes(rowId)
      ? state.selectedRows.filter(id => id !== rowId)
      : [...state.selectedRows, rowId]

    updateState({ selectedRows: newSelected })
  }

  // Handle select all
  const handleSelectAll = () => {
    if (!config.selectable) return

    const currentPageIds = processedData.rows.map((_, i) => `row-${i}`)
    const allSelected = currentPageIds.every(id => state.selectedRows.includes(id))

    updateState({
      selectedRows: allSelected
        ? state.selectedRows.filter(id => !currentPageIds.includes(id))
        : [...new Set([...state.selectedRows, ...currentPageIds])],
    })
  }

  // Export to CSV
  const handleExport = () => {
    if (!config.exportable) return

    const csv = exportToCSV(processedData.allFiltered, columns)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Format cell value
  const formatCell = (value: unknown, column: TableColumn): React.ReactNode => {
    if (value === null || value === undefined) return '-'

    switch (column.type) {
      case 'currency':
        if (typeof value === 'number') {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(value)
        }
        return String(value)

      case 'date':
        try {
          const date = new Date(value as string | number | Date)
          return date.toLocaleDateString()
        } catch {
          return String(value)
        }

      case 'number':
        if (typeof value === 'number') {
          return new Intl.NumberFormat().format(value)
        }
        return String(value)

      case 'boolean':
        return value ? 'Yes' : 'No'

      default:
        return String(value)
    }
  }

  // Active filters count
  const activeFilterCount = Object.keys(state.activeFilters).filter(
    k => state.activeFilters[k] !== undefined && state.activeFilters[k] !== ''
  ).length

  return (
    <div className="w-full max-w-6xl">
      {/* Header: Search + Export */}
      <div className="mb-4 flex items-center justify-between gap-4">
        {config.searchable && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={state.searchQuery || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Filter indicator */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-sm">
              <Filter className="h-3 w-3" />
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
            </div>
          )}

          {/* Export button */}
          {config.exportable && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        {processedData.totalRows} row{processedData.totalRows !== 1 ? 's' : ''}
        {state.selectedRows.length > 0 && (
          <span className="ml-2 text-purple-600 dark:text-purple-400">
            ({state.selectedRows.length} selected)
          </span>
        )}
      </p>

      {/* Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              {config.selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={processedData.rows.length > 0 &&
                      processedData.rows.every((_, i) => state.selectedRows.includes(`row-${i}`))}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-purple-500 focus:ring-purple-500"
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider"
                  onMouseEnter={() => setHoveredColumn(column.key)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  <div className="flex items-center gap-2">
                    {/* Sort button */}
                    {config.sortable && column.sortable !== false ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                      >
                        {column.label}
                        {state.currentSort?.column === column.key ? (
                          state.currentSort.order === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      column.label
                    )}

                    {/* Filter input (on hover) */}
                    {config.filterable && column.filterable !== false && hoveredColumn === column.key && (
                      <div className="relative ml-auto">
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={(state.activeFilters[column.key] as string) || ''}
                          onChange={(e) => handleFilter(column.key, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-24 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                        />
                        {state.activeFilters[column.key] !== undefined && state.activeFilters[column.key] !== '' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); clearFilter(column.key) }}
                            className="absolute right-1 top-1/2 -translate-y-1/2"
                          >
                            <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {processedData.rows.map((row, rowIndex) => {
              const rowId = `row-${rowIndex}`
              const isSelected = state.selectedRows.includes(rowId)

              return (
                <tr
                  key={rowIndex}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                  }`}
                >
                  {config.selectable && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(rowId)}
                        className="rounded border-gray-300 dark:border-gray-600 text-purple-500 focus:ring-purple-500"
                      />
                    </td>
                  )}
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {column.type === 'image' && row[column.key] ? (
                        <img
                          src={String(row[column.key])}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : column.type === 'boolean' ? (
                        row[column.key] ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-gray-300" />
                        )
                      ) : (
                        formatCell(row[column.key], column)
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Empty state */}
        {processedData.rows.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No data matches your search or filters.</p>
            {(state.searchQuery || activeFilterCount > 0) && (
              <button
                onClick={() => updateState({ searchQuery: '', activeFilters: {}, currentPage: 1 })}
                className="mt-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 text-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {config.pagination && processedData.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {state.currentPage} of {processedData.totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateState({ currentPage: state.currentPage - 1 })}
              disabled={state.currentPage === 1}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, processedData.totalPages) }, (_, i) => {
                let page: number
                if (processedData.totalPages <= 5) {
                  page = i + 1
                } else if (state.currentPage <= 3) {
                  page = i + 1
                } else if (state.currentPage >= processedData.totalPages - 2) {
                  page = processedData.totalPages - 4 + i
                } else {
                  page = state.currentPage - 2 + i
                }

                return (
                  <button
                    key={page}
                    onClick={() => updateState({ currentPage: page })}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
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
              onClick={() => updateState({ currentPage: state.currentPage + 1 })}
              disabled={state.currentPage === processedData.totalPages}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
