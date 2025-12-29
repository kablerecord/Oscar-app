/**
 * Render System Types
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import { ArtifactType, RenderState } from '@prisma/client'

// ============================================
// Content Schemas
// ============================================

export interface ImageArtifactContent {
  type: 'image'
  prompt: string              // User's request, refined by OSQR
  revisedPrompt?: string      // DALL-E's revised prompt (if different)
  model: 'dall-e-3'
  size: '1024x1024' | '1792x1024' | '1024x1792'
  imageUrl: string            // URL from OpenAI
  style?: 'vivid' | 'natural' // DALL-E style parameter
}

export interface ChartArtifactContent {
  type: 'chart'
  chartType: 'line' | 'bar' | 'area'
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  xKey: string                // Key in data for X axis
  yKey: string | string[]     // Key(s) in data for Y axis (multiple for multi-line)
  data: Record<string, unknown>[]  // Array of data points
  colors?: string[]           // Line/bar colors
  showLegend?: boolean
  showGrid?: boolean
}

// ============================================
// Template Types (v1.5.1)
// ============================================

export type TemplateType =
  | 'listings'      // Card grid with filters, sort, pagination
  | 'table'         // Data table with sort, filter, export
  | 'gallery'       // Image/media grid
  | 'timeline'      // Event timeline
  | 'game-simple'   // Simple games (tic-tac-toe, memory)
  | 'dashboard'     // KPI widgets
  | 'comparison'    // Side-by-side comparison

export interface ListingsConfig {
  cardFields: string[]          // Which fields to show on cards
  primaryField: string          // Main title field
  secondaryField?: string       // Subtitle field
  priceField?: string           // Price display
  imageField?: string           // Image URL field
  filterableFields: string[]
  sortableFields: string[]
  pageSize: number
}

export interface ListingsState {
  activeFilters: Record<string, unknown>
  currentSort: { field: string; order: 'asc' | 'desc' }
  currentPage: number
}

export interface ListingItem {
  id: string
  [key: string]: unknown
}

export interface TableColumn {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'image'
  width?: number
  sortable?: boolean
  filterable?: boolean
  format?: string
}

export interface TableConfig {
  sortable: boolean
  filterable: boolean
  searchable: boolean
  resizable: boolean
  exportable: boolean
  pagination: boolean
  pageSize: number
  selectable: boolean
}

export interface TableState {
  currentPage: number
  currentSort?: { column: string; order: 'asc' | 'desc' }
  activeFilters: Record<string, unknown>
  searchQuery?: string
  selectedRows: string[]
}

export type GameSimpleVariant = 'tic-tac-toe' | 'memory' | 'quiz' | 'custom'

export interface GameSimpleConfig {
  name: string
  description?: string
  players: string[]
  controls: 'dpad-ab' | 'arrows' | 'touch' | 'mouse'
  theme: 'default' | 'retro' | 'minimal' | 'dark'
}

export interface GameSimpleState {
  grid?: {
    rows: number
    cols: number
    cells: (string | null)[][]
  }
  turn?: string
  score?: Record<string, number>
  status: 'playing' | 'won' | 'draw' | 'lost'
  winner?: string
}

// Template artifact content types
export interface ListingsArtifactContent {
  type: 'template'
  template: 'listings'
  items: ListingItem[]
  config: ListingsConfig
  state: ListingsState
}

export interface TableArtifactContent {
  type: 'template'
  template: 'table'
  rows: Record<string, unknown>[]
  columns: TableColumn[]
  config: TableConfig
  state: TableState
}

export interface GameSimpleArtifactContent {
  type: 'template'
  template: 'game-simple'
  variant: GameSimpleVariant
  config: GameSimpleConfig
  state: GameSimpleState
}

export type TemplateArtifactContent =
  | ListingsArtifactContent
  | TableArtifactContent
  | GameSimpleArtifactContent

export type ArtifactContent =
  | ImageArtifactContent
  | ChartArtifactContent
  | TemplateArtifactContent

// ============================================
// Render Intent Detection
// ============================================

export interface RenderIntent {
  detected: boolean
  type: 'image' | 'chart' | null
  confidence: 'explicit' | 'inferred' | null
  trigger?: string  // The keyword/phrase that triggered detection
}

// Explicit render triggers (v1.5 - explicit only)
export const RENDER_TRIGGERS = {
  image: [
    /^\/render\b/i,
    /\brender\s+(?:me\s+)?(?:a|an|the)?\s*(?:image|picture|visual|drawing|concept|illustration)/i,
    /\bdraw\s+(?:me\s+)?(?:a|an|the)?/i,
    /\bcreate\s+(?:me\s+)?(?:a|an)?\s*image\s+of\b/i,
    /\bvisualize\s+(?:this\s+)?(?:as\s+an?\s+)?image/i,
    /\bgenerate\s+(?:me\s+)?(?:a|an)?\s*(?:image|picture|visual)/i,
  ],
  chart: [
    /^\/render\s+.*chart/i,
    /\brender\s+(?:me\s+)?(?:a|an|the)?\s*(?:chart|graph|visualization)/i,
    /\bvisualize\s+(?:this\s+)?(?:data|as\s+a?\s*chart)/i,
    /\bshow\s+(?:this\s+)?(?:as\s+)?(?:a\s+)?(?:chart|graph)/i,
    /\bcreate\s+(?:me\s+)?(?:a|an)?\s*(?:chart|graph)\s+(?:of|for|showing)/i,
    /\bplot\s+(?:this|the|a)/i,
  ],
}

// ============================================
// State Machine
// ============================================

export const VALID_STATE_TRANSITIONS: Record<RenderState, RenderState[]> = {
  IDLE: ['RENDERING'],
  RENDERING: ['COMPLETE_AWAITING_VIEW', 'ERROR', 'CANCELLED'],
  COMPLETE_AWAITING_VIEW: ['VIEWING', 'CANCELLED'],
  VIEWING: ['UPDATING', 'IDLE'],
  UPDATING: ['COMPLETE_AWAITING_VIEW', 'ERROR', 'CANCELLED'],
  ERROR: ['RENDERING', 'CANCELLED', 'IDLE'],  // Retry goes back to RENDERING
  CANCELLED: ['IDLE'],  // Can restart
}

// ============================================
// API Types
// ============================================

export interface CreateArtifactInput {
  userId: string
  workspaceId?: string
  type: ArtifactType
  title?: string
  content: ArtifactContent
  conversationId?: string
  messageId?: string
  parentId?: string  // For versioning
}

export interface UpdateArtifactInput {
  id: string
  title?: string
  content?: Partial<ArtifactContent>
  state?: RenderState
  viewedAt?: Date
}

export interface RenderImageInput {
  prompt: string
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  style?: 'vivid' | 'natural'
}

export interface RenderChartInput {
  chartType: 'line' | 'bar' | 'area'
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  xKey: string
  yKey: string | string[]
  data: Record<string, unknown>[]
  colors?: string[]
  showLegend?: boolean
  showGrid?: boolean
}

// ============================================
// Error Types
// ============================================

export interface RenderError {
  code: string
  message: string
  retryable: boolean
  simplifiable: boolean
}

export const RENDER_ERRORS: Record<string, RenderError> = {
  API_TIMEOUT: {
    code: 'API_TIMEOUT',
    message: 'Render failed. Want me to retry?',
    retryable: true,
    simplifiable: false,
  },
  RATE_LIMIT: {
    code: 'RATE_LIMIT',
    message: 'Render failed. I can simplify the request and try again.',
    retryable: true,
    simplifiable: true,
  },
  INVALID_PROMPT: {
    code: 'INVALID_PROMPT',
    message: "I couldn't generate that image. Can you describe it differently?",
    retryable: true,
    simplifiable: true,
  },
  INVALID_CHART_DATA: {
    code: 'INVALID_CHART_DATA',
    message: "I couldn't make sense of that data for a chart. Can you clarify?",
    retryable: true,
    simplifiable: false,
  },
  IMAGE_EXPIRED: {
    code: 'IMAGE_EXPIRED',
    message: 'That image is no longer available. Want me to regenerate it?',
    retryable: true,
    simplifiable: false,
  },
  CONTENT_POLICY: {
    code: 'CONTENT_POLICY',
    message: "I can't generate that image due to content guidelines.",
    retryable: false,
    simplifiable: false,
  },
  UNKNOWN: {
    code: 'UNKNOWN',
    message: 'Something went wrong. Want me to try again?',
    retryable: true,
    simplifiable: false,
  },
}

// Re-export Prisma types for convenience
export { ArtifactType, RenderState }
