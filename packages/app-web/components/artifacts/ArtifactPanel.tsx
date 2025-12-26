'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Code,
  FileText,
  GitBranch,
  Globe,
  Image,
  Database,
  Table,
  Component,
  Copy,
  Download,
  Maximize2,
  X,
  Check,
} from 'lucide-react'
import type { ArtifactBlock, ArtifactType } from '@/lib/artifacts/types'

interface ArtifactPanelProps {
  artifacts: ArtifactBlock[]
  onClose?: () => void
}

const typeIcons: Record<ArtifactType, React.ElementType> = {
  IMAGE: Image,
  CHART: GitBranch,
  CODE: Code,
  DOCUMENT: FileText,
  DIAGRAM: GitBranch,
  HTML: Globe,
  SVG: Image,
  JSON: Database,
  CSV: Table,
  REACT: Component,
}

const typeLabels: Record<ArtifactType, string> = {
  IMAGE: 'Image',
  CHART: 'Chart',
  CODE: 'Code',
  DOCUMENT: 'Document',
  DIAGRAM: 'Diagram',
  HTML: 'HTML',
  SVG: 'SVG',
  JSON: 'JSON',
  CSV: 'CSV',
  REACT: 'React',
}

const typeColors: Record<ArtifactType, string> = {
  IMAGE: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
  CHART: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  CODE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  DOCUMENT: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  DIAGRAM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  HTML: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  SVG: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
  JSON: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  CSV: 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
  REACT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
}

export function ArtifactPanel({ artifacts, onClose }: ArtifactPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (artifacts.length === 0) return null

  const currentArtifact = artifacts[selectedIndex]
  const Icon = typeIcons[currentArtifact.type]

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentArtifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const extensions: Record<ArtifactType, string> = {
      IMAGE: 'png',
      CHART: 'svg',
      CODE: currentArtifact.language || 'txt',
      DOCUMENT: 'md',
      DIAGRAM: 'mmd',
      HTML: 'html',
      SVG: 'svg',
      JSON: 'json',
      CSV: 'csv',
      REACT: 'tsx',
    }

    const ext = extensions[currentArtifact.type]
    const filename = `${currentArtifact.title.toLowerCase().replace(/\s+/g, '-')}.${ext}`
    const blob = new Blob([currentArtifact.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className={`flex flex-col bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 ${
        expanded ? 'fixed inset-0 z-50' : 'w-96'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-neutral-500" />
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            Artifacts
          </span>
          <Badge variant="secondary" className="text-xs">
            {artifacts.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Artifact Tabs (if multiple) */}
      {artifacts.length > 1 && (
        <div className="flex gap-1 p-2 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          {artifacts.map((artifact, index) => {
            const TabIcon = typeIcons[artifact.type]
            return (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  index === selectedIndex
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {artifact.title.length > 20
                  ? artifact.title.slice(0, 20) + '...'
                  : artifact.title}
              </button>
            )
          })}
        </div>
      )}

      {/* Current Artifact Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {currentArtifact.title}
            </h3>
            {currentArtifact.description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {currentArtifact.description}
              </p>
            )}
          </div>
          <Badge className={typeColors[currentArtifact.type]}>
            {typeLabels[currentArtifact.type]}
            {currentArtifact.language && ` (${currentArtifact.language})`}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <ArtifactContent artifact={currentArtifact} />
      </div>
    </div>
  )
}

function ArtifactContent({ artifact }: { artifact: ArtifactBlock }) {
  switch (artifact.type) {
    case 'HTML':
      return <HtmlPreview content={artifact.content} />
    case 'SVG':
      return <SvgPreview content={artifact.content} />
    case 'DIAGRAM':
      return <DiagramPreview content={artifact.content} />
    case 'JSON':
      return <JsonPreview content={artifact.content} />
    default:
      return <CodePreview content={artifact.content} language={artifact.language} />
  }
}

function CodePreview({ content, language }: { content: string; language?: string }) {
  return (
    <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
      <code>{content}</code>
    </pre>
  )
}

function HtmlPreview({ content }: { content: string }) {
  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
        <div className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
          Preview
        </div>
        <iframe
          srcDoc={content}
          className="w-full h-64 bg-white"
          sandbox="allow-scripts"
          title="HTML Preview"
        />
      </div>
      {/* Source */}
      <CodePreview content={content} language="html" />
    </div>
  )
}

function SvgPreview({ content }: { content: string }) {
  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <div dangerouslySetInnerHTML={{ __html: content }} className="max-w-full" />
      </div>
      {/* Source */}
      <CodePreview content={content} language="svg" />
    </div>
  )
}

function DiagramPreview({ content }: { content: string }) {
  // For now, just show the mermaid source
  // TODO: Integrate mermaid.js for live rendering
  return (
    <div className="space-y-4">
      <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg text-center text-sm text-neutral-500">
        Diagram preview coming soon
      </div>
      <CodePreview content={content} language="mermaid" />
    </div>
  )
}

function JsonPreview({ content }: { content: string }) {
  let formatted = content
  try {
    formatted = JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    // Keep original if not valid JSON
  }
  return <CodePreview content={formatted} language="json" />
}
