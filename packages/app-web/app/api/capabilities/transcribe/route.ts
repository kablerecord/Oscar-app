import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'

/**
 * Speech-to-Text (Transcription) API
 *
 * Uses OpenAI Whisper or Groq Whisper for audio transcription.
 * Accepts audio files or audio data URLs.
 */

export interface TranscribeRequest {
  audio: string // Base64 data URL or file URL
  language?: string // ISO 639-1 language code (e.g., 'en', 'es')
}

export interface TranscribeResponse {
  text: string
  language?: string
  duration?: number
  segments?: {
    start: number
    end: number
    text: string
  }[]
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
    const { audio, language } = body as TranscribeRequest

    if (!audio) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 })
    }

    // Extract audio data from data URL
    let audioBuffer: Buffer
    let mimeType = 'audio/webm'

    if (audio.startsWith('data:')) {
      const matches = audio.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        return NextResponse.json({ error: 'Invalid audio data URL' }, { status: 400 })
      }
      mimeType = matches[1]
      audioBuffer = Buffer.from(matches[2], 'base64')
    } else if (audio.startsWith('http')) {
      // Fetch audio from URL
      const audioResponse = await fetch(audio)
      audioBuffer = Buffer.from(await audioResponse.arrayBuffer())
      mimeType = audioResponse.headers.get('content-type') || 'audio/webm'
    } else {
      // Assume raw base64
      audioBuffer = Buffer.from(audio, 'base64')
    }

    // Determine file extension from mime type
    const extensions: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
    }
    const ext = extensions[mimeType] || 'webm'

    // Create a File object for the OpenAI API
    // Convert Buffer to Uint8Array for proper BlobPart compatibility
    const uint8Array = new Uint8Array(audioBuffer)
    const file = new File([uint8Array], `audio.${ext}`, { type: mimeType })

    const openai = getOpenAI()

    // Use Whisper for transcription
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: language,
      response_format: 'verbose_json',
    })

    const response: TranscribeResponse = {
      text: transcription.text,
      language: transcription.language,
      duration: transcription.duration,
      segments: transcription.segments?.map(seg => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Transcribe API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    )
  }
}
