'use client'

/**
 * Chart Renderer Component
 * Renders charts using Recharts
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartArtifactContent } from '@/lib/render/types'

interface ChartRendererProps {
  content: ChartArtifactContent
}

// Default colors if none provided
const DEFAULT_COLORS = [
  '#9333ea', // Primary purple
  '#a855f7', // Light purple
  '#7c3aed', // Violet
  '#6366f1', // Indigo
  '#8b5cf6', // Purple-500
]

export function ChartRenderer({ content }: ChartRendererProps) {
  const {
    chartType,
    title,
    xAxisLabel,
    yAxisLabel,
    xKey,
    yKey,
    data,
    colors = DEFAULT_COLORS,
    showLegend = false,
    showGrid = true,
  } = content

  // Normalize yKey to array
  const yKeys = Array.isArray(yKey) ? yKey : [yKey]

  // Common axis props
  const xAxisProps = {
    dataKey: xKey,
    label: xAxisLabel ? { value: xAxisLabel, position: 'insideBottom' as const, offset: -5 } : undefined,
    tick: { fill: '#6b7280', fontSize: 12 },
    axisLine: { stroke: '#d1d5db' },
    tickLine: { stroke: '#d1d5db' },
  }

  const yAxisProps = {
    label: yAxisLabel
      ? { value: yAxisLabel, angle: -90, position: 'insideLeft' as const, offset: 10 }
      : undefined,
    tick: { fill: '#6b7280', fontSize: 12 },
    axisLine: { stroke: '#d1d5db' },
    tickLine: { stroke: '#d1d5db' },
  }

  // Custom tooltip styles
  const tooltipStyles = {
    contentStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    },
    labelStyle: {
      color: '#374151',
      fontWeight: 600,
    },
  }

  // Render the appropriate chart type
  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipStyles} />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )

      case 'area':
        return (
          <AreaChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipStyles} />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )

      case 'line':
      default:
        return (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipStyles} />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        )
    }
  }

  return (
    <div className="w-full max-w-4xl">
      {/* Title */}
      {title && (
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-6">
          {title}
        </h2>
      )}

      {/* Chart container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <ResponsiveContainer width="100%" height={400}>
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Data summary */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{data.length} data points</span>
        <span className="capitalize">{chartType} chart</span>
      </div>
    </div>
  )
}
