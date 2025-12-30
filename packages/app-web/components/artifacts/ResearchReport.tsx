'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Search,
  Lightbulb,
  AlertTriangle,
  Download,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types from @osqr/core router
export type ResearchDepth = 'quick' | 'standard' | 'comprehensive'

export interface ResearchSource {
  title: string
  url: string
  snippet: string
  relevanceScore?: number
  citationIndex: number
  publishedDate?: string
  domain?: string
}

export interface ResearchSection {
  heading: string
  content: string
  sources: ResearchSource[]
}

export interface ResearchReport {
  title: string
  summary: string
  sections: ResearchSection[]
  keyFindings: string[]
  sources: ResearchSource[]
  methodology: string
  limitations?: string
  generatedAt: Date
  depth: ResearchDepth
  tokensUsed: number
  estimatedCost: number
  subQuestionsResearched: string[]
  councilUsed: boolean
  totalTimeMs: number
  searchQueriesPerformed: number
}

export interface ResearchProgress {
  phase: 'analyzing_query' | 'generating_questions' | 'searching' | 'synthesizing' | 'council_deliberation' | 'finalizing'
  percentage: number
  message: string
  sourcesFound: number
  subQuestions?: string[]
  currentSubQuestion?: string
}

interface ResearchReportProps {
  report: ResearchReport
  onClose?: () => void
}

interface ResearchProgressProps {
  progress: ResearchProgress
}

const depthLabels: Record<ResearchDepth, { label: string; color: string }> = {
  quick: { label: 'Quick', color: 'bg-green-500/20 text-green-400' },
  standard: { label: 'Standard', color: 'bg-blue-500/20 text-blue-400' },
  comprehensive: { label: 'Comprehensive', color: 'bg-purple-500/20 text-purple-400' },
}

const phaseLabels: Record<ResearchProgress['phase'], string> = {
  analyzing_query: 'Analyzing your question...',
  generating_questions: 'Breaking down into sub-questions...',
  searching: 'Searching sources...',
  synthesizing: 'Synthesizing findings...',
  council_deliberation: 'AI Council deliberating...',
  finalizing: 'Finalizing report...',
}

export function ResearchProgressIndicator({ progress }: ResearchProgressProps) {
  return (
    <Card className="p-4 bg-slate-900/50 border-slate-700/50">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <BookOpen className="h-5 w-5 text-purple-400 animate-pulse" />
          </div>
          <span className="text-sm font-medium text-slate-200">
            {phaseLabels[progress.phase]}
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{progress.message}</span>
          <span>{progress.sourcesFound} sources found</span>
        </div>

        {/* Current sub-question being researched */}
        {progress.currentSubQuestion && (
          <div className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg">
            <Search className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">{progress.currentSubQuestion}</p>
          </div>
        )}
      </div>
    </Card>
  )
}

export function ResearchReportView({ report, onClose }: ResearchReportProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]))
  const [showAllSources, setShowAllSources] = useState(false)
  const [copied, setCopied] = useState(false)

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSections(newExpanded)
  }

  const handleCopy = async () => {
    const text = `# ${report.title}\n\n## Summary\n${report.summary}\n\n## Key Findings\n${report.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\n${report.sections.map(s => `## ${s.heading}\n${s.content}`).join('\n\n')}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = `# ${report.title}\n\n## Summary\n${report.summary}\n\n## Key Findings\n${report.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\n${report.sections.map(s => `## ${s.heading}\n${s.content}`).join('\n\n')}\n\n## Sources\n${report.sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`).join('\n')}`
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title.toLowerCase().replace(/\s+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const displayedSources = showAllSources ? report.sources : report.sources.slice(0, 5)

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-purple-400" />
              <Badge className={depthLabels[report.depth].color}>
                {depthLabels[report.depth].label} Research
              </Badge>
              {report.councilUsed && (
                <Badge className="bg-amber-500/20 text-amber-400">
                  <Users className="h-3 w-3 mr-1" />
                  Council
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-semibold text-slate-100 truncate">
              {report.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {Math.round(report.totalTimeMs / 1000)}s
          </span>
          <span className="flex items-center gap-1">
            <Search className="h-3 w-3" />
            {report.searchQueriesPerformed} queries
          </span>
          <span>{report.sources.length} sources</span>
          <span className="text-green-400">~${report.estimatedCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary */}
        <Card className="p-4 bg-slate-900/50 border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Summary</h3>
          <p className="text-sm text-slate-100 leading-relaxed">{report.summary}</p>
        </Card>

        {/* Key Findings */}
        <Card className="p-4 bg-slate-900/50 border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Key Findings
          </h3>
          <ul className="space-y-2">
            {report.keyFindings.map((finding, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                  {index + 1}
                </span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Sections */}
        {report.sections.map((section, index) => (
          <Card key={index} className="bg-slate-900/50 border-slate-700/50 overflow-hidden">
            <button
              onClick={() => toggleSection(index)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
            >
              <h3 className="text-sm font-medium text-slate-200">{section.heading}</h3>
              {expandedSections.has(index) ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {expandedSections.has(index) && (
              <div className="px-4 pb-4 pt-0">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </p>
                {section.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-2">
                      Sources: {section.sources.map(s => `[${s.citationIndex}]`).join(' ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}

        {/* Limitations */}
        {report.limitations && (
          <Card className="p-4 bg-amber-500/5 border-amber-500/20">
            <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Limitations
            </h3>
            <p className="text-sm text-slate-300">{report.limitations}</p>
          </Card>
        )}

        {/* Sources */}
        <Card className="p-4 bg-slate-900/50 border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-3">
            Sources ({report.sources.length})
          </h3>
          <div className="space-y-2">
            {displayedSources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group"
              >
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-xs text-slate-400 font-medium">
                  {source.citationIndex}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {source.title}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    {source.domain || new URL(source.url).hostname}
                    {source.publishedDate && ` · ${source.publishedDate}`}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-blue-400 flex-shrink-0" />
              </a>
            ))}
          </div>
          {report.sources.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllSources(!showAllSources)}
              className="mt-2 w-full text-slate-400 hover:text-slate-200"
            >
              {showAllSources ? 'Show fewer' : `Show all ${report.sources.length} sources`}
            </Button>
          )}
        </Card>

        {/* Methodology */}
        <Card className="p-4 bg-slate-900/50 border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Methodology</h3>
          <p className="text-xs text-slate-400">{report.methodology}</p>
          {report.subQuestionsResearched.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 mb-2">Sub-questions researched:</p>
              <ul className="space-y-1">
                {report.subQuestionsResearched.map((q, i) => (
                  <li key={i} className="text-xs text-slate-500 flex items-center gap-2">
                    <Search className="h-3 w-3" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// Inline summary component for displaying in chat
interface ResearchSummaryProps {
  report: ResearchReport
  onExpand?: () => void
}

export function ResearchSummary({ report, onExpand }: ResearchSummaryProps) {
  return (
    <Card className="p-4 bg-purple-500/5 border-purple-500/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">Research Complete</span>
            <Badge className={cn(depthLabels[report.depth].color, 'text-xs')}>
              {depthLabels[report.depth].label}
            </Badge>
          </div>
          <h3 className="text-sm font-medium text-slate-200 mb-2">{report.title}</h3>
          <p className="text-sm text-slate-400 line-clamp-2">{report.summary}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span>{report.sources.length} sources</span>
            <span>{report.keyFindings.length} key findings</span>
            <span>{Math.round(report.totalTimeMs / 1000)}s</span>
          </div>
        </div>
        {onExpand && (
          <Button variant="outline" size="sm" onClick={onExpand}>
            View Full Report
          </Button>
        )}
      </div>
    </Card>
  )
}
