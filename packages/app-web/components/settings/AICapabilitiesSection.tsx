'use client'

import { useState } from 'react'
import {
  Sparkles,
  DollarSign,
  Mic,
  BookOpen,
  Ban,
  RotateCcw,
  Check,
  ChevronDown,
  Volume2,
  Search,
  Code,
  Image,
  Eye,
  MessageSquare,
} from 'lucide-react'
import {
  useCapabilityPreferences,
  VOICE_OPTIONS,
  RESEARCH_DEPTH_OPTIONS,
  CAPABILITY_OPTIONS,
  type VoiceOption,
  type ResearchDepth,
} from '@/hooks/useCapabilityPreferences'
import type { CapabilityType } from '@/components/oscar/CapabilityBar'

// Icon mapping for capabilities
const CAPABILITY_ICONS: Record<string, React.ElementType> = {
  web_search: Search,
  code_execution: Code,
  image_generation: Image,
  vision_analysis: Eye,
  deep_research: BookOpen,
  voice_input: Mic,
  voice_output: Volume2,
}

/**
 * Toggle Switch Component
 */
function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? 'bg-cyan-500' : 'bg-neutral-700'
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
          enabled ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  )
}

/**
 * Select Dropdown Component
 */
function Select<T extends string>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; description?: string }[]
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find(o => o.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white hover:bg-neutral-750 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{selectedOption?.label || value}</span>
        <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-2.5 text-left hover:bg-neutral-700 transition-colors ${
                  option.value === value ? 'bg-cyan-500/20 text-cyan-300' : 'text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{option.label}</p>
                    {option.description && (
                      <p className="text-xs text-neutral-400 mt-0.5">{option.description}</p>
                    )}
                  </div>
                  {option.value === value && <Check className="h-4 w-4 text-cyan-400" />}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Slider Component
 */
function Slider({
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  formatValue?: (value: number) => string
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-50"
        />
        <span className="ml-4 text-white font-medium min-w-[60px] text-right">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  )
}

/**
 * AI Capabilities Settings Section
 */
export function AICapabilitiesSection() {
  const {
    preferences,
    isLoaded,
    setAutoCapabilities,
    setConfirmExpensiveOps,
    setExpensiveThreshold,
    setVoiceSettings,
    setResearchSettings,
    toggleDisabledCapability,
    resetToDefaults,
  } = useCapabilityPreferences()

  if (!isLoaded) {
    return (
      <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-1/3" />
          <div className="h-4 bg-neutral-800 rounded w-2/3" />
          <div className="h-12 bg-neutral-800 rounded" />
        </div>
      </section>
    )
  }

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Sparkles className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">AI Capabilities</h2>
            <p className="text-sm text-neutral-400">Configure how OSQR uses its AI capabilities</p>
          </div>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="space-y-8">
        {/* Auto-Capabilities Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Auto-detect Capabilities</p>
              <p className="text-sm text-neutral-400">
                Let OSQR automatically decide what capabilities to use based on your query
              </p>
            </div>
            <Toggle
              enabled={preferences.autoCapabilities}
              onChange={setAutoCapabilities}
            />
          </div>
        </div>

        {/* Cost Controls */}
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-medium text-white">Cost Controls</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Confirm Expensive Operations</p>
              <p className="text-sm text-neutral-400">
                Ask for confirmation before using capabilities above the cost threshold
              </p>
            </div>
            <Toggle
              enabled={preferences.confirmExpensiveOps}
              onChange={setConfirmExpensiveOps}
            />
          </div>

          {preferences.confirmExpensiveOps && (
            <div className="ml-4 mt-4">
              <label className="block text-sm font-medium text-neutral-400 mb-3">
                Cost Threshold
              </label>
              <Slider
                value={preferences.expensiveThreshold}
                onChange={setExpensiveThreshold}
                min={0.01}
                max={1.0}
                step={0.01}
                formatValue={v => `$${v.toFixed(2)}`}
              />
              <p className="text-xs text-neutral-500 mt-2">
                Operations estimated above this cost will require confirmation
              </p>
            </div>
          )}
        </div>

        {/* Voice Settings */}
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-medium text-white">Voice Settings</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Output Voice
              </label>
              <Select<VoiceOption>
                value={preferences.voiceSettings.outputVoice}
                onChange={v => setVoiceSettings({ outputVoice: v })}
                options={VOICE_OPTIONS}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Auto-play Responses</p>
                <p className="text-sm text-neutral-400">
                  Automatically speak responses when voice input is used
                </p>
              </div>
              <Toggle
                enabled={preferences.voiceSettings.autoPlayResponses}
                onChange={v => setVoiceSettings({ autoPlayResponses: v })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Input Language
              </label>
              <Select<string>
                value={preferences.voiceSettings.inputLanguage}
                onChange={v => setVoiceSettings({ inputLanguage: v })}
                options={[
                  { value: 'en', label: 'English', description: 'Default' },
                  { value: 'es', label: 'Spanish', description: 'Español' },
                  { value: 'fr', label: 'French', description: 'Français' },
                  { value: 'de', label: 'German', description: 'Deutsch' },
                  { value: 'it', label: 'Italian', description: 'Italiano' },
                  { value: 'pt', label: 'Portuguese', description: 'Português' },
                  { value: 'zh', label: 'Chinese', description: '中文' },
                  { value: 'ja', label: 'Japanese', description: '日本語' },
                  { value: 'ko', label: 'Korean', description: '한국어' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Research Settings */}
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-medium text-white">Research Settings</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Default Research Depth
              </label>
              <Select<ResearchDepth>
                value={preferences.researchSettings.defaultDepth}
                onChange={v => setResearchSettings({ defaultDepth: v })}
                options={RESEARCH_DEPTH_OPTIONS}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Multi-Model Synthesis (Council)</p>
                <p className="text-sm text-neutral-400">
                  Use multiple AI models to synthesize research findings for more balanced perspectives
                </p>
              </div>
              <Toggle
                enabled={preferences.researchSettings.useCouncil}
                onChange={v => setResearchSettings({ useCouncil: v })}
              />
            </div>
          </div>
        </div>

        {/* Disabled Capabilities */}
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          <div className="flex items-center gap-2 mb-4">
            <Ban className="h-5 w-5 text-red-400" />
            <h3 className="text-lg font-medium text-white">Disabled Capabilities</h3>
          </div>
          <p className="text-sm text-neutral-400 mb-4">
            Capabilities you disable will never be used, even in auto mode
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CAPABILITY_OPTIONS.map(cap => {
              const isDisabled = preferences.disabledCapabilities.includes(cap.id)
              const Icon = CAPABILITY_ICONS[cap.id] || MessageSquare

              return (
                <button
                  key={cap.id}
                  onClick={() => toggleDisabledCapability(cap.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                    isDisabled
                      ? 'bg-red-500/10 ring-1 ring-red-500/30'
                      : 'bg-neutral-800 hover:bg-neutral-700'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      isDisabled ? 'bg-red-500/20' : 'bg-neutral-700'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isDisabled ? 'text-red-400' : 'text-neutral-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium text-sm ${
                        isDisabled ? 'text-red-300' : 'text-white'
                      }`}
                    >
                      {cap.label}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">{cap.description}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isDisabled
                        ? 'border-red-500 bg-red-500'
                        : 'border-neutral-600'
                    }`}
                  >
                    {isDisabled && <Ban className="h-3 w-3 text-white" />}
                  </div>
                </button>
              )
            })}
          </div>

          {preferences.disabledCapabilities.length > 0 && (
            <p className="text-xs text-red-400 mt-2">
              {preferences.disabledCapabilities.length} capability{preferences.disabledCapabilities.length !== 1 ? 'ies' : 'y'} disabled
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
