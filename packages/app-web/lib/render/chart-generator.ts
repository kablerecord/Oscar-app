/**
 * Chart Spec Generator
 * Generates Recharts-compatible chart specifications
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import { ChartArtifactContent, RenderChartInput, RENDER_ERRORS, RenderError } from './types'

export interface ChartGenerationResult {
  success: true
  content: ChartArtifactContent
}

export interface ChartGenerationError {
  success: false
  error: RenderError
}

export type ChartGenerationResponse = ChartGenerationResult | ChartGenerationError

// Default chart colors (OSQR purple palette)
const DEFAULT_COLORS = [
  '#9333ea', // Primary purple
  '#a855f7', // Light purple
  '#7c3aed', // Violet
  '#6366f1', // Indigo
  '#8b5cf6', // Purple-500
]

/**
 * Generate a chart specification from input
 */
export function generateChartSpec(input: RenderChartInput): ChartGenerationResponse {
  try {
    // Validate data
    if (!input.data || input.data.length === 0) {
      return {
        success: false,
        error: {
          ...RENDER_ERRORS.INVALID_CHART_DATA,
          message: 'No data provided for the chart.',
        },
      }
    }

    // Validate xKey exists in data
    const firstRow = input.data[0]
    if (!(input.xKey in firstRow)) {
      return {
        success: false,
        error: {
          ...RENDER_ERRORS.INVALID_CHART_DATA,
          message: `X-axis key "${input.xKey}" not found in data.`,
        },
      }
    }

    // Validate yKey(s) exist in data
    const yKeys = Array.isArray(input.yKey) ? input.yKey : [input.yKey]
    for (const key of yKeys) {
      if (!(key in firstRow)) {
        return {
          success: false,
          error: {
            ...RENDER_ERRORS.INVALID_CHART_DATA,
            message: `Y-axis key "${key}" not found in data.`,
          },
        }
      }
    }

    const content: ChartArtifactContent = {
      type: 'chart',
      chartType: input.chartType,
      title: input.title,
      xAxisLabel: input.xAxisLabel,
      yAxisLabel: input.yAxisLabel,
      xKey: input.xKey,
      yKey: input.yKey,
      data: input.data,
      colors: input.colors || DEFAULT_COLORS.slice(0, yKeys.length),
      showLegend: input.showLegend ?? yKeys.length > 1,
      showGrid: input.showGrid ?? true,
    }

    return {
      success: true,
      content,
    }
  } catch (error) {
    console.error('Chart generation error:', error)
    return {
      success: false,
      error: RENDER_ERRORS.INVALID_CHART_DATA,
    }
  }
}

/**
 * Parse structured data from text
 * Used when OSQR extracts chart data from conversation
 */
export function parseChartData(
  text: string
): { data: Record<string, unknown>[]; keys: string[] } | null {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const keys = Object.keys(parsed[0])
      return { data: parsed, keys }
    }
  } catch {
    // Not JSON, try other formats
  }

  // Try to parse CSV-like format
  const lines = text.trim().split('\n')
  if (lines.length < 2) return null

  const headers = lines[0].split(/[,\t]/).map((h) => h.trim())
  const data: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,\t]/).map((v) => v.trim())
    if (values.length !== headers.length) continue

    const row: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) {
      // Try to parse as number
      const numValue = parseFloat(values[j])
      row[headers[j]] = isNaN(numValue) ? values[j] : numValue
    }
    data.push(row)
  }

  if (data.length === 0) return null

  return { data, keys: headers }
}

/**
 * Infer chart configuration from data
 */
export function inferChartConfig(
  data: Record<string, unknown>[],
  keys: string[]
): Partial<RenderChartInput> {
  if (keys.length < 2) {
    return {}
  }

  // First column is typically x-axis
  const xKey = keys[0]

  // Remaining numeric columns are y-values
  const yKeys = keys.slice(1).filter((key) => {
    const value = data[0][key]
    return typeof value === 'number'
  })

  if (yKeys.length === 0) {
    // Try to find any numeric column
    const numericKeys = keys.filter((key) => {
      const value = data[0][key]
      return typeof value === 'number'
    })
    if (numericKeys.length > 0) {
      return {
        xKey: keys.find((k) => typeof data[0][k] !== 'number') || keys[0],
        yKey: numericKeys.length === 1 ? numericKeys[0] : numericKeys,
      }
    }
  }

  return {
    xKey,
    yKey: yKeys.length === 1 ? yKeys[0] : yKeys,
    chartType: 'line', // Default to line chart
  }
}

/**
 * Apply a modification to an existing chart spec
 */
export function applyChartModification(
  currentSpec: ChartArtifactContent,
  modification: string
): ChartArtifactContent {
  const lowercaseModification = modification.toLowerCase()
  const newSpec = { ...currentSpec }

  // Chart type changes
  if (lowercaseModification.includes('bar chart') || lowercaseModification.includes('bar graph')) {
    newSpec.chartType = 'bar'
  } else if (lowercaseModification.includes('line chart') || lowercaseModification.includes('line graph')) {
    newSpec.chartType = 'line'
  } else if (lowercaseModification.includes('area chart') || lowercaseModification.includes('area graph')) {
    newSpec.chartType = 'area'
  }

  // Legend toggle
  if (lowercaseModification.includes('show legend') || lowercaseModification.includes('add legend')) {
    newSpec.showLegend = true
  } else if (lowercaseModification.includes('hide legend') || lowercaseModification.includes('remove legend')) {
    newSpec.showLegend = false
  }

  // Grid toggle
  if (lowercaseModification.includes('show grid') || lowercaseModification.includes('add grid')) {
    newSpec.showGrid = true
  } else if (lowercaseModification.includes('hide grid') || lowercaseModification.includes('remove grid')) {
    newSpec.showGrid = false
  }

  // Title changes
  const titleMatch = modification.match(/(?:change|set|update)\s+(?:the\s+)?title\s+to\s+["']?(.+?)["']?$/i)
  if (titleMatch) {
    newSpec.title = titleMatch[1]
  }

  return newSpec
}

/**
 * Add data points to a chart
 */
export function addChartData(
  currentSpec: ChartArtifactContent,
  newData: Record<string, unknown>[]
): ChartArtifactContent {
  return {
    ...currentSpec,
    data: [...currentSpec.data, ...newData],
  }
}
