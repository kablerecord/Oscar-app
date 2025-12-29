/**
 * Simple Game Template Schema & Utilities
 * @see docs/features/TEMPLATE_SYSTEM_SPEC.md
 */

import type {
  GameSimpleArtifactContent,
  GameSimpleConfig,
  GameSimpleState,
  GameSimpleVariant,
} from '../types'

/**
 * Create a simple game artifact content
 */
export function createGameContent(
  variant: GameSimpleVariant,
  configOverrides?: Partial<GameSimpleConfig>
): GameSimpleArtifactContent {
  const config = getDefaultConfig(variant, configOverrides)
  const state = getInitialState(variant)

  return {
    type: 'template',
    template: 'game-simple',
    variant,
    config,
    state,
  }
}

/**
 * Get default config for a game variant
 */
function getDefaultConfig(
  variant: GameSimpleVariant,
  overrides?: Partial<GameSimpleConfig>
): GameSimpleConfig {
  const baseConfig: GameSimpleConfig = {
    name: 'Game',
    players: ['Player 1', 'Player 2'],
    controls: 'mouse',
    theme: 'default',
    ...overrides,
  }

  switch (variant) {
    case 'tic-tac-toe':
      return {
        ...baseConfig,
        name: 'Tic Tac Toe',
        players: ['X', 'O'],
        controls: 'dpad-ab',
        ...overrides,
      }

    case 'memory':
      return {
        ...baseConfig,
        name: 'Memory Game',
        players: ['Player 1'],
        controls: 'mouse',
        ...overrides,
      }

    case 'quiz':
      return {
        ...baseConfig,
        name: 'Quiz',
        players: ['Player'],
        controls: 'arrows',
        ...overrides,
      }

    default:
      return baseConfig
  }
}

/**
 * Get initial state for a game variant
 */
function getInitialState(variant: GameSimpleVariant): GameSimpleState {
  switch (variant) {
    case 'tic-tac-toe':
      return {
        grid: {
          rows: 3,
          cols: 3,
          cells: [
            [null, null, null],
            [null, null, null],
            [null, null, null],
          ],
        },
        turn: 'X',
        score: { X: 0, O: 0 },
        status: 'playing',
      }

    case 'memory':
      return {
        grid: {
          rows: 4,
          cols: 4,
          cells: createMemoryGrid(4, 4),
        },
        turn: 'Player 1',
        score: { 'Player 1': 0 },
        status: 'playing',
      }

    case 'quiz':
      return {
        score: { Player: 0 },
        status: 'playing',
      }

    default:
      return {
        status: 'playing',
      }
  }
}

/**
 * Create a shuffled memory grid
 */
function createMemoryGrid(rows: number, cols: number): (string | null)[][] {
  const totalCells = rows * cols
  const pairs = totalCells / 2
  const symbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']

  // Create pairs of symbols
  const cards = symbols.slice(0, pairs).flatMap(s => [s, s])

  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }

  // Create grid
  const grid: (string | null)[][] = []
  let cardIndex = 0
  for (let r = 0; r < rows; r++) {
    const row: (string | null)[] = []
    for (let c = 0; c < cols; c++) {
      row.push(cards[cardIndex++] || null)
    }
    grid.push(row)
  }

  return grid
}

// ============================================
// Tic Tac Toe Game Logic
// ============================================

export interface TicTacToeMove {
  row: number
  col: number
}

/**
 * Make a move in tic-tac-toe
 */
export function makeTicTacToeMove(
  state: GameSimpleState,
  move: TicTacToeMove
): GameSimpleState {
  if (!state.grid || state.status !== 'playing') {
    return state
  }

  const { row, col } = move
  const grid = state.grid

  // Check if cell is already occupied
  if (grid.cells[row][col] !== null) {
    return state
  }

  // Make the move
  const newCells: (string | null)[][] = grid.cells.map((r, ri) =>
    ri === row ? r.map((c, ci) => (ci === col ? (state.turn || 'X') : c)) : [...r]
  )

  const newGrid = { ...grid, cells: newCells }

  // Check for winner
  const winner = checkTicTacToeWinner(newCells)
  if (winner) {
    const newScore = { ...state.score }
    newScore[winner] = (newScore[winner] || 0) + 1

    return {
      ...state,
      grid: newGrid,
      status: 'won',
      winner,
      score: newScore,
    }
  }

  // Check for draw
  const isDraw = newCells.every(row => row.every(cell => cell !== null))
  if (isDraw) {
    return {
      ...state,
      grid: newGrid,
      status: 'draw',
    }
  }

  // Next turn
  return {
    ...state,
    grid: newGrid,
    turn: state.turn === 'X' ? 'O' : 'X',
  }
}

/**
 * Check for tic-tac-toe winner
 */
function checkTicTacToeWinner(cells: (string | null)[][]): string | null {
  // Check rows
  for (let r = 0; r < 3; r++) {
    if (cells[r][0] && cells[r][0] === cells[r][1] && cells[r][1] === cells[r][2]) {
      return cells[r][0]
    }
  }

  // Check columns
  for (let c = 0; c < 3; c++) {
    if (cells[0][c] && cells[0][c] === cells[1][c] && cells[1][c] === cells[2][c]) {
      return cells[0][c]
    }
  }

  // Check diagonals
  if (cells[0][0] && cells[0][0] === cells[1][1] && cells[1][1] === cells[2][2]) {
    return cells[0][0]
  }
  if (cells[0][2] && cells[0][2] === cells[1][1] && cells[1][1] === cells[2][0]) {
    return cells[0][2]
  }

  return null
}

/**
 * Reset tic-tac-toe game
 */
export function resetTicTacToe(state: GameSimpleState): GameSimpleState {
  return {
    ...state,
    grid: {
      rows: 3,
      cols: 3,
      cells: [
        [null, null, null],
        [null, null, null],
        [null, null, null],
      ],
    },
    turn: 'X',
    status: 'playing',
    winner: undefined,
  }
}

// ============================================
// D-Pad Controls
// ============================================

export interface DPadInput {
  type: 'up' | 'down' | 'left' | 'right' | 'a' | 'b'
}

export interface CursorPosition {
  row: number
  col: number
}

/**
 * Handle D-pad input for grid navigation
 */
export function handleDPadInput(
  cursor: CursorPosition,
  input: DPadInput,
  grid: { rows: number; cols: number }
): CursorPosition {
  switch (input.type) {
    case 'up':
      return { ...cursor, row: Math.max(0, cursor.row - 1) }
    case 'down':
      return { ...cursor, row: Math.min(grid.rows - 1, cursor.row + 1) }
    case 'left':
      return { ...cursor, col: Math.max(0, cursor.col - 1) }
    case 'right':
      return { ...cursor, col: Math.min(grid.cols - 1, cursor.col + 1) }
    default:
      return cursor
  }
}

/**
 * Key mappings for controls
 */
export const KEY_MAPPINGS = {
  'dpad-ab': {
    up: ['ArrowUp', 'w', 'W'],
    down: ['ArrowDown', 's', 'S'],
    left: ['ArrowLeft', 'a', 'A'],
    right: ['ArrowRight', 'd', 'D'],
    a: ['Enter', ' ', 'z', 'Z'],
    b: ['Escape', 'x', 'X'],
  },
  arrows: {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    a: ['Enter', ' '],
    b: ['Escape'],
  },
}

/**
 * Map keyboard event to DPad input
 */
export function keyToDPadInput(
  key: string,
  controlType: 'dpad-ab' | 'arrows'
): DPadInput | null {
  const mappings = KEY_MAPPINGS[controlType]

  for (const [inputType, keys] of Object.entries(mappings)) {
    if (keys.includes(key)) {
      return { type: inputType as DPadInput['type'] }
    }
  }

  return null
}
