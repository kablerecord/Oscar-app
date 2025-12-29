'use client'

/**
 * Game Renderer Component
 * Renders simple games with D-Pad controls
 * @see docs/features/TEMPLATE_SYSTEM_SPEC.md
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { RotateCcw, Trophy, Gamepad2 } from 'lucide-react'
import type {
  GameSimpleArtifactContent,
  GameSimpleState,
} from '@/lib/render/types'
import {
  makeTicTacToeMove,
  resetTicTacToe,
  handleDPadInput,
  keyToDPadInput,
  type TicTacToeMove,
  type CursorPosition,
  type DPadInput,
} from '@/lib/render/templates/game-simple'

interface GameRendererProps {
  content: GameSimpleArtifactContent
  onStateChange?: (state: GameSimpleState) => void
}

export function GameRenderer({ content, onStateChange }: GameRendererProps) {
  const { variant, config, state: initialState } = content

  const [state, setState] = useState<GameSimpleState>(initialState)
  const [cursor, setCursor] = useState<CursorPosition>({ row: 1, col: 1 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Update state and notify parent
  const updateState = useCallback((newState: GameSimpleState) => {
    setState(newState)
    onStateChange?.(newState)
  }, [onStateChange])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const controlType = config.controls === 'dpad-ab' ? 'dpad-ab' : 'arrows'
      const input = keyToDPadInput(e.key, controlType)

      if (!input) return

      e.preventDefault()

      if (input.type === 'a') {
        // A button = confirm/select
        handleAction()
      } else if (input.type === 'b') {
        // B button = cancel/reset
        handleReset()
      } else {
        // Direction
        if (state.grid) {
          setCursor(prev => handleDPadInput(prev, input, state.grid!))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, cursor, config.controls])

  // Handle action (A button or click)
  const handleAction = useCallback(() => {
    if (state.status !== 'playing') return

    if (variant === 'tic-tac-toe') {
      const move: TicTacToeMove = { row: cursor.row, col: cursor.col }
      updateState(makeTicTacToeMove(state, move))
    }
  }, [variant, state, cursor, updateState])

  // Handle cell click
  const handleCellClick = useCallback((row: number, col: number) => {
    setCursor({ row, col })
    if (state.status !== 'playing') return

    if (variant === 'tic-tac-toe') {
      const move: TicTacToeMove = { row, col }
      updateState(makeTicTacToeMove(state, move))
    }
  }, [variant, state, updateState])

  // Handle reset
  const handleReset = useCallback(() => {
    if (variant === 'tic-tac-toe') {
      updateState(resetTicTacToe(state))
      setCursor({ row: 1, col: 1 })
    }
  }, [variant, state, updateState])

  // D-Pad button handler
  const handleDPadButton = useCallback((input: DPadInput) => {
    if (input.type === 'a') {
      handleAction()
    } else if (input.type === 'b') {
      handleReset()
    } else if (state.grid) {
      setCursor(prev => handleDPadInput(prev, input, state.grid!))
    }
  }, [state.grid, handleAction, handleReset])

  // Get theme colors
  const getThemeColors = () => {
    switch (config.theme) {
      case 'retro':
        return {
          bg: 'bg-green-900',
          cell: 'bg-green-800 border-green-700',
          hover: 'hover:bg-green-700',
          x: 'text-yellow-400',
          o: 'text-cyan-400',
          cursor: 'ring-2 ring-yellow-400',
        }
      case 'minimal':
        return {
          bg: 'bg-white dark:bg-gray-900',
          cell: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
          hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
          x: 'text-gray-900 dark:text-white',
          o: 'text-gray-600 dark:text-gray-400',
          cursor: 'ring-2 ring-gray-400',
        }
      case 'dark':
        return {
          bg: 'bg-gray-900',
          cell: 'bg-gray-800 border-gray-700',
          hover: 'hover:bg-gray-700',
          x: 'text-purple-400',
          o: 'text-pink-400',
          cursor: 'ring-2 ring-purple-500',
        }
      default:
        return {
          bg: 'bg-gradient-to-br from-purple-600 to-blue-600',
          cell: 'bg-white/10 border-white/20',
          hover: 'hover:bg-white/20',
          x: 'text-white',
          o: 'text-yellow-300',
          cursor: 'ring-2 ring-white',
        }
    }
  }

  const colors = getThemeColors()

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-md mx-auto p-6 rounded-2xl ${colors.bg}`}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          {config.name}
        </h2>

        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Reset game"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {/* Score */}
      {state.score && (
        <div className="flex justify-center gap-8 mb-6">
          {Object.entries(state.score).map(([player, score]) => (
            <div key={player} className="text-center">
              <div className={`text-2xl font-bold ${player === 'X' ? colors.x : colors.o}`}>
                {player}
              </div>
              <div className="text-white/80 text-lg">{score}</div>
            </div>
          ))}
        </div>
      )}

      {/* Turn indicator */}
      {state.status === 'playing' && state.turn && (
        <div className="text-center mb-4 text-white/80">
          <span className={state.turn === 'X' ? colors.x : colors.o}>{state.turn}</span>'s turn
        </div>
      )}

      {/* Game status */}
      {state.status !== 'playing' && (
        <div className="text-center mb-4 p-3 bg-white/10 rounded-lg">
          {state.status === 'won' && (
            <div className="flex items-center justify-center gap-2 text-yellow-300">
              <Trophy className="h-5 w-5" />
              <span className="font-bold">{state.winner} wins!</span>
            </div>
          )}
          {state.status === 'draw' && (
            <div className="text-white/80 font-medium">It's a draw!</div>
          )}
        </div>
      )}

      {/* Game Grid */}
      {state.grid && variant === 'tic-tac-toe' && (
        <div className="flex justify-center mb-6">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${state.grid.cols}, minmax(0, 1fr))`,
            }}
          >
            {state.grid.cells.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isCursor = cursor.row === rowIndex && cursor.col === colIndex

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    disabled={state.status !== 'playing' || cell !== null}
                    className={`
                      w-20 h-20 flex items-center justify-center
                      text-4xl font-bold rounded-lg border-2 transition-all
                      ${colors.cell}
                      ${state.status === 'playing' && cell === null ? colors.hover : ''}
                      ${isCursor ? colors.cursor : ''}
                      ${cell !== null ? 'cursor-default' : 'cursor-pointer'}
                    `}
                  >
                    {cell && (
                      <span className={cell === 'X' ? colors.x : colors.o}>
                        {cell}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* D-Pad Controls */}
      {config.controls === 'dpad-ab' && (
        <div className="flex justify-center gap-8">
          {/* D-Pad */}
          <div className="relative w-32 h-32">
            {/* Up */}
            <button
              onPointerDown={() => handleDPadButton({ type: 'up' })}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-t-lg flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 5l-7 7h14l-7-7z" />
              </svg>
            </button>

            {/* Down */}
            <button
              onPointerDown={() => handleDPadButton({ type: 'down' })}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-b-lg flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-4 h-4 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 5l-7 7h14l-7-7z" />
              </svg>
            </button>

            {/* Left */}
            <button
              onPointerDown={() => handleDPadButton({ type: 'left' })}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-l-lg flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-4 h-4 -rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 5l-7 7h14l-7-7z" />
              </svg>
            </button>

            {/* Right */}
            <button
              onPointerDown={() => handleDPadButton({ type: 'right' })}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-r-lg flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 5l-7 7h14l-7-7z" />
              </svg>
            </button>

            {/* Center */}
            <div className="absolute inset-1/4 bg-white/10 rounded" />
          </div>

          {/* A/B Buttons */}
          <div className="flex flex-col items-center justify-center gap-4">
            <button
              onPointerDown={() => handleDPadButton({ type: 'a' })}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-400 text-white font-bold text-lg shadow-lg transition-colors"
            >
              A
            </button>
            <button
              onPointerDown={() => handleDPadButton({ type: 'b' })}
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-400 text-white font-bold text-lg shadow-lg transition-colors"
            >
              B
            </button>
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="mt-6 text-center text-white/50 text-xs">
        {config.controls === 'dpad-ab' && 'Use arrow keys + Enter to play, or tap controls'}
        {config.controls === 'mouse' && 'Click or tap to play'}
        {config.controls === 'arrows' && 'Use arrow keys + Enter to play'}
      </div>
    </div>
  )
}
