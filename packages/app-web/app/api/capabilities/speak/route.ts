import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'

/**
 * Text-to-Speech API
 *
 * Uses OpenAI TTS for speech synthesis.
 * Returns audio as a binary stream.
 */

export type VoiceOption = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export interface SpeakRequest {
  text: string
  voice?: VoiceOption
  speed?: number // 0.25 to 4.0, default 1.0
  format?: 'mp3' | 'opus' | 'aac' | 'flac'
}

// Lazy initialization
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession()
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      text,
      voice = 'nova',
      speed = 1.0,
      format = 'mp3',
    } = body as SpeakRequest

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Limit text length to prevent abuse
    const maxLength = 4096
    const truncatedText = text.length > maxLength ? text.slice(0, maxLength) : text

    const openai = getOpenAI()

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: truncatedText,
      speed: Math.max(0.25, Math.min(4.0, speed)),
      response_format: format,
    })

    // Get audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer()

    // Return audio as binary response
    const contentTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      opus: 'audio/opus',
      aac: 'audio/aac',
      flac: 'audio/flac',
    }

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': contentTypes[format] || 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })

  } catch (error) {
    console.error('[Speak API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Speech synthesis failed' },
      { status: 500 }
    )
  }
}
