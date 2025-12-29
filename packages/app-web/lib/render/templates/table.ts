/**
 * Table Template Schema & Utilities
 * @see docs/features/TEMPLATE_SYSTEM_SPEC.md
 */

import type {
  TableArtifactContent,
  TableConfig,
  TableState,
  TableColumn,
} from '../types'

/**
 * Create a table artifact content with auto-inferred config
 */
export function createTableContent(
  rows: Record<string, unknown>[],
  overrides?: Partial<TableConfig>
): TableArtifactContent {
  const columns = inferTableColumns(rows)
  const config: TableConfig = {
    sortable: true,
    filterable: true,
    searchable: true,
    resizable: true,
    exportable: true,
    pagination: true,
    pageSize: 10,
    selectable: false,
    ...overrides,
  }
  const state: TableState = {
    currentPage: 1,
    activeFilters: {},
    selectedRows: [],
  }

  return {
    type: 'template',
    template: 'table',
    rows,
    columns,
    config,
    state,
  }
}

/**
 * Infer column definitions from data
 */
export function inferTableColumns(rows: Record<string, unknown>[]): TableColumn[] {
  if (rows.length === 0) {
    return []
  }

  // Collect all unique keys from all rows
  const keySet = new Set<string>()
  const typeMap = new Map<string, Set<string>>()

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      keySet.add(key)

      // Track types for each key
      if (!typeMap.has(key)) {
        typeMap.set(key, new Set())
      }
      typeMap.get(key)!.add(detectValueType(value))
    }
  }

  // Build column definitions
  const columns: TableColumn[] = []
  for (const key of keySet) {
    const types = typeMap.get(key) || new Set(['string'])
    const primaryType = determinePrimaryType(types)

    columns.push({
      key,
      label: formatColumnLabel(key),
      type: primaryType,
      sortable: true,
      filterable: primaryType !== 'image',
    })
  }

  return columns
}

/**
 * Detect value type
 */
function detectValueType(value: unknown): TableColumn['type'] {
  if (value === null || value === undefined) return 'string'

  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  if (typeof value === 'string') {
    // Check if it's a date
    const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/
    if (datePattern.test(value) || !isNaN(Date.parse(value))) {
      return 'date'
    }

    // Check if it's a currency
    if (/^\$[\d,]+\.?\d*$|^[\d,]+\.?\d*\s*(?:USD|EUR|GBP)$/i.test(value)) {
      return 'currency'
    }

    // Check if it's an image URL
    if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(value) ||
        /^https?:\/\/.+\/image/i.test(value)) {
      return 'image'
    }

    return 'string'
  }

  if (value instanceof Date) {
    return 'date'
  }

  return 'string'
}

/**
 * Determine primary type from multiple detected types
 */
function determinePrimaryType(types: Set<string>): TableColumn['type'] {
  // Priority order: image > currency > number > date > boolean > string
  if (types.has('image')) return 'image'
  if (types.has('currency')) return 'currency'
  if (types.has('number')) return 'number'
  if (types.has('date')) return 'date'
  if (types.has('boolean')) return 'boolean'
  return 'string'
}

/**
 * Format column key into human-readable label
 */
function formatColumnLabel(key: string): string {
  // Handle common patterns
  const label = key
    // camelCase -> Camel Case
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // snake_case -> snake case
    .replace(/_/g, ' ')
    // kebab-case -> kebab case
    .replace(/-/g, ' ')
    // Capitalize first letter of each word
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return label
}

/**
 * Validate table data
 */
export function validateTableData(data: unknown): {
  valid: boolean
  error?: string
  rows?: Record<string, unknown>[]
} {
  if (!Array.isArray(data)) {
    return { valid: false, error: 'Data must be an array' }
  }

  if (data.length === 0) {
    return { valid: false, error: 'Data array is empty' }
  }

  // Check if items are objects
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { valid: false, error: `Item at index ${i} is not an object` }
    }
  }

  return { valid: true, rows: data as Record<string, unknown>[] }
}

/**
 * Filter table rows
 */
export function filterTableRows(
  rows: Record<string, unknown>[],
  filters: Record<string, unknown>,
  searchQuery?: string
): Record<string, unknown>[] {
  let filtered = rows

  // Apply search query across all fields
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim()
    filtered = filtered.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(query)
      )
    )
  }

  // Apply column filters
  if (Object.keys(filters).length > 0) {
    filtered = filtered.filter(row => {
      for (const [field, filterValue] of Object.entries(filters)) {
        if (filterValue === undefined || filterValue === null || filterValue === '') {
          continue
        }

        const rowValue = row[field]

        // Handle range filters
        if (typeof filterValue === 'object' && filterValue !== null) {
          const range = filterValue as { min?: number; max?: number }
          if (typeof rowValue === 'number') {
            if (range.min !== undefined && rowValue < range.min) return false
            if (range.max !== undefined && rowValue > range.max) return false
          }
          continue
        }

        // Handle string matching
        if (typeof filterValue === 'string') {
          if (!String(rowValue).toLowerCase().includes(filterValue.toLowerCase())) {
            return false
          }
        } else if (rowValue !== filterValue) {
          return false
        }
      }
      return true
    })
  }

  return filtered
}

/**
 * Sort table rows
 */
export function sortTableRows(
  rows: Record<string, unknown>[],
  sort: { column: string; order: 'asc' | 'desc' }
): Record<string, unknown>[] {
  return [...rows].sort((a, b) => {
    const aValue = a[sort.column]
    const bValue = b[sort.column]

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0
    if (aValue == null) return sort.order === 'asc' ? 1 : -1
    if (bValue == null) return sort.order === 'asc' ? -1 : 1

    // Compare based on type
    let comparison = 0
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime()
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      // Try to parse as dates
      const aDate = Date.parse(aValue)
      const bDate = Date.parse(bValue)
      if (!isNaN(aDate) && !isNaN(bDate)) {
        comparison = aDate - bDate
      } else {
        comparison = aValue.localeCompare(bValue)
      }
    } else {
      comparison = String(aValue).localeCompare(String(bValue))
    }

    return sort.order === 'asc' ? comparison : -comparison
  })
}

/**
 * Paginate table rows
 */
export function paginateTableRows(
  rows: Record<string, unknown>[],
  page: number,
  pageSize: number
): { rows: Record<string, unknown>[]; totalPages: number; totalRows: number } {
  const totalRows = rows.length
  const totalPages = Math.ceil(totalRows / pageSize)
  const startIndex = (page - 1) * pageSize
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize)

  return {
    rows: paginatedRows,
    totalPages,
    totalRows,
  }
}

/**
 * Export table to CSV
 */
export function exportToCSV(
  rows: Record<string, unknown>[],
  columns: TableColumn[]
): string {
  // Header row
  const header = columns.map(col => `"${col.label}"`).join(',')

  // Data rows
  const dataRows = rows.map(row =>
    columns.map(col => {
      const value = row[col.key]
      if (value === null || value === undefined) return ''
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
  )

  return [header, ...dataRows].join('\n')
}
