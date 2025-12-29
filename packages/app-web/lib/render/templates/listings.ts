/**
 * Listings Template Schema & Utilities
 * @see docs/features/TEMPLATE_SYSTEM_SPEC.md
 */

import type {
  ListingsArtifactContent,
  ListingsConfig,
  ListingsState,
  ListingItem,
} from '../types'

/**
 * Create a listings artifact content with auto-inferred config
 */
export function createListingsContent(
  items: ListingItem[],
  overrides?: Partial<ListingsConfig>
): ListingsArtifactContent {
  const config = inferListingsConfig(items, overrides)
  const state: ListingsState = {
    activeFilters: {},
    currentSort: { field: config.sortableFields[0] || 'id', order: 'asc' },
    currentPage: 1,
  }

  return {
    type: 'template',
    template: 'listings',
    items,
    config,
    state,
  }
}

/**
 * Auto-infer listings config from data
 */
export function inferListingsConfig(
  items: ListingItem[],
  overrides?: Partial<ListingsConfig>
): ListingsConfig {
  if (items.length === 0) {
    return {
      cardFields: ['title', 'description'],
      primaryField: 'title',
      filterableFields: [],
      sortableFields: ['id'],
      pageSize: 12,
      ...overrides,
    }
  }

  const sample = items[0]
  const keys = Object.keys(sample).filter(k => k !== 'id')

  // Find the best primary field (title > name > label > first string field)
  const primaryField =
    findField(sample, ['title', 'name', 'label', 'heading']) ||
    keys.find(k => typeof sample[k] === 'string') ||
    keys[0] ||
    'id'

  // Find secondary field (description > subtitle > summary)
  const secondaryField = findField(sample, ['description', 'subtitle', 'summary', 'excerpt'])

  // Find price field
  const priceField = findField(sample, ['price', 'cost', 'amount', 'value', 'fee'])

  // Find image field
  const imageField = findField(sample, ['image', 'photo', 'thumbnail', 'picture', 'img', 'imageUrl', 'src', 'url'])

  // Determine which fields to show on cards
  const cardFields = [primaryField]
  if (secondaryField) cardFields.push(secondaryField)
  if (priceField) cardFields.push(priceField)

  // Add a few more string/number fields (max 5 total)
  for (const key of keys) {
    if (cardFields.length >= 5) break
    if (!cardFields.includes(key) && key !== imageField) {
      const value = sample[key]
      if (typeof value === 'string' || typeof value === 'number') {
        cardFields.push(key)
      }
    }
  }

  // Determine filterable fields (strings and numbers)
  const filterableFields = keys.filter(k => {
    const value = sample[k]
    return typeof value === 'string' || typeof value === 'number'
  }).slice(0, 5) // Max 5 filterable fields

  // Determine sortable fields (strings and numbers)
  const sortableFields = keys.filter(k => {
    const value = sample[k]
    return typeof value === 'string' || typeof value === 'number' || value instanceof Date
  }).slice(0, 5) // Max 5 sortable fields

  return {
    cardFields,
    primaryField,
    secondaryField,
    priceField,
    imageField,
    filterableFields,
    sortableFields,
    pageSize: 12,
    ...overrides,
  }
}

/**
 * Find a field by possible names
 */
function findField(sample: Record<string, unknown>, possibleNames: string[]): string | undefined {
  for (const name of possibleNames) {
    // Exact match
    if (name in sample) return name

    // Case-insensitive match
    const found = Object.keys(sample).find(k => k.toLowerCase() === name.toLowerCase())
    if (found) return found

    // Contains match
    const contains = Object.keys(sample).find(k => k.toLowerCase().includes(name.toLowerCase()))
    if (contains) return contains
  }
  return undefined
}

/**
 * Validate listings data
 */
export function validateListingsData(data: unknown): {
  valid: boolean
  error?: string
  items?: ListingItem[]
} {
  if (!Array.isArray(data)) {
    return { valid: false, error: 'Data must be an array' }
  }

  if (data.length === 0) {
    return { valid: false, error: 'Data array is empty' }
  }

  // Check if items are objects with an id
  const validItems: ListingItem[] = []
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (typeof item !== 'object' || item === null) {
      return { valid: false, error: `Item at index ${i} is not an object` }
    }

    // Ensure each item has an id (generate if missing)
    const listingItem: ListingItem = {
      ...item as Record<string, unknown>,
      id: (item as Record<string, unknown>).id?.toString() || `item-${i}`,
    }
    validItems.push(listingItem)
  }

  return { valid: true, items: validItems }
}

/**
 * Apply filters to listings
 */
export function filterListings(
  items: ListingItem[],
  filters: Record<string, unknown>
): ListingItem[] {
  if (Object.keys(filters).length === 0) {
    return items
  }

  return items.filter(item => {
    for (const [field, filterValue] of Object.entries(filters)) {
      const itemValue = item[field]

      if (filterValue === undefined || filterValue === null || filterValue === '') {
        continue
      }

      // Handle range filters (e.g., { min: 0, max: 1000 })
      if (typeof filterValue === 'object' && filterValue !== null) {
        const range = filterValue as { min?: number; max?: number }
        if (typeof itemValue === 'number') {
          if (range.min !== undefined && itemValue < range.min) return false
          if (range.max !== undefined && itemValue > range.max) return false
        }
        continue
      }

      // Handle exact match for strings and numbers
      if (typeof filterValue === 'string' || typeof filterValue === 'number') {
        if (typeof itemValue === 'string') {
          // Case-insensitive partial match for strings
          if (!itemValue.toLowerCase().includes(String(filterValue).toLowerCase())) {
            return false
          }
        } else if (itemValue !== filterValue) {
          return false
        }
      }
    }
    return true
  })
}

/**
 * Sort listings
 */
export function sortListings(
  items: ListingItem[],
  sort: { field: string; order: 'asc' | 'desc' }
): ListingItem[] {
  return [...items].sort((a, b) => {
    const aValue = a[sort.field]
    const bValue = b[sort.field]

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0
    if (aValue == null) return sort.order === 'asc' ? 1 : -1
    if (bValue == null) return sort.order === 'asc' ? -1 : 1

    // Compare based on type
    let comparison = 0
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue)
    } else {
      comparison = String(aValue).localeCompare(String(bValue))
    }

    return sort.order === 'asc' ? comparison : -comparison
  })
}

/**
 * Paginate listings
 */
export function paginateListings(
  items: ListingItem[],
  page: number,
  pageSize: number
): { items: ListingItem[]; totalPages: number; totalItems: number } {
  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (page - 1) * pageSize
  const paginatedItems = items.slice(startIndex, startIndex + pageSize)

  return {
    items: paginatedItems,
    totalPages,
    totalItems,
  }
}
