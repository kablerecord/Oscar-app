'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AgentCard, Agent, AgentResponse } from './AgentCard'
import { Send, Bot, RotateCcw } from 'lucide-react'

interface PanelChatProps {
  agents: Agent[]
  workspaceId: string
}

export function PanelChat({ agents, workspaceId }: PanelChatProps) {
  const [userMessage, setUserMessage] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(
    new Set(agents.map((a) => a.id))
  )
  const [useRag, setUseRag] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [responses, setResponses] = useState<AgentResponse[]>([])
  const [showRoundtable, setShowRoundtable] = useState(false)
  const [roundtableResponses, setRoundtableResponses] = useState<AgentResponse[]>([])

  const handleToggleAgent = (agentId: string) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else {
        next.add(agentId)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (!userMessage.trim() || selectedAgents.size === 0) return

    setIsSubmitting(true)
    setResponses([])
    setRoundtableResponses([])
    setShowRoundtable(false)

    try {
      // TODO: Call API endpoint to get responses from selected agents
      // For now, simulate responses
      const selectedAgentsList = agents.filter((a) => selectedAgents.has(a.id))

      // Initialize loading state
      setResponses(
        selectedAgentsList.map((agent) => ({
          agentId: agent.id,
          content: '',
          isLoading: true,
        }))
      )

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock responses
      setResponses(
        selectedAgentsList.map((agent) => ({
          agentId: agent.id,
          content: `This is a simulated response from ${agent.name}. In production, this would be the actual AI response based on the user's message: "${userMessage}"`,
          isLoading: false,
        }))
      )

      setShowRoundtable(true)
    } catch (error) {
      console.error('Error submitting to panel:', error)
      setResponses(
        Array.from(selectedAgents).map((agentId) => ({
          agentId,
          content: '',
          error: 'Failed to get response',
          isLoading: false,
        }))
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoundtable = async () => {
    setRoundtableResponses([])
    const selectedAgentsList = agents.filter((a) => selectedAgents.has(a.id))

    // Initialize loading state
    setRoundtableResponses(
      selectedAgentsList.map((agent) => ({
        agentId: agent.id,
        content: '',
        isLoading: true,
      }))
    )

    try {
      // TODO: Call API endpoint for roundtable mode
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock roundtable responses
      setRoundtableResponses(
        selectedAgentsList.map((agent, idx) => ({
          agentId: agent.id,
          content: `After reviewing the other agents' responses, I ${
            idx % 2 === 0 ? 'agree' : 'would like to add'
          } that... [Roundtable response from ${agent.name}]`,
          isLoading: false,
        }))
      )
    } catch (error) {
      console.error('Error in roundtable:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input section */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="space-y-4">
          <div>
            <Label htmlFor="message" className="text-base font-semibold">
              Ask the Panel
            </Label>
            <Textarea
              id="message"
              placeholder="Type your question or prompt here..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              rows={4}
              className="mt-2"
              disabled={isSubmitting}
            />
          </div>

          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={useRag}
                  onChange={(e) => setUseRag(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                  disabled={isSubmitting}
                />
                <span className="text-neutral-700 dark:text-neutral-300">
                  Use Knowledge Base
                </span>
              </label>

              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {selectedAgents.size} of {agents.length} agents selected
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !userMessage.trim() || selectedAgents.size === 0}
              size="lg"
            >
              <Send className="mr-2 h-4 w-4" />
              Ask Panel
            </Button>
          </div>
        </div>
      </div>

      {/* Agent selection */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Select Agents
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgents.has(agent.id)}
              onToggle={handleToggleAgent}
              showSelection={!isSubmitting}
            />
          ))}
        </div>
      </div>

      {/* User message display */}
      {responses.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-start space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-100">You</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Your Question
              </p>
              <p className="mt-1 text-neutral-700 dark:text-neutral-300">{userMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Panel responses */}
      {responses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center space-x-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              <Bot className="h-5 w-5" />
              <span>Panel Responses</span>
            </h3>

            {showRoundtable && !responses.some((r) => r.isLoading) && (
              <Button
                variant="outline"
                onClick={handleRoundtable}
                disabled={roundtableResponses.some((r) => r.isLoading)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Roundtable Discussion
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {responses.map((response) => {
              const agent = agents.find((a) => a.id === response.agentId)
              if (!agent) return null

              return <AgentCard key={response.agentId} agent={agent} response={response} />
            })}
          </div>
        </div>
      )}

      {/* Roundtable responses */}
      {roundtableResponses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Roundtable Discussion
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roundtableResponses.map((response) => {
              const agent = agents.find((a) => a.id === response.agentId)
              if (!agent) return null

              return <AgentCard key={`rt-${response.agentId}`} agent={agent} response={response} />
            })}
          </div>
        </div>
      )}
    </div>
  )
}
