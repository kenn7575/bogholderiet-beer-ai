import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { list_beers, list_breweries, list_categories } from '@/lib/ai/tools-sdk'
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_OLLAMA_MODEL,
  OLLAMA_BASE_URL,
  type Provider,
} from '@/lib/ai/models'

export const runtime = 'nodejs'

const SYSTEM = `Du er en kyndig ølekspert-assistent for Bogholderiet bar i Danmark.
Hjælp brugerne med at opdage øl fra databasen ved hjælp af dine værktøjer.
Svar altid på dansk, uanset hvad brugeren skriver.
Vær kortfattet, entusiastisk og giv praktiske anbefalinger.
Når du lister øl, inkluder vigtige detaljer som bryggeri, stil og pris, når det er tilgængeligt.
Al data i databasen er på dansk – brug søgetermer på dansk.`

function getModel(provider: Provider) {
  if (provider === 'ollama') {
    const ollama = createOpenAI({ baseURL: OLLAMA_BASE_URL, apiKey: 'ollama' })
    return ollama(DEFAULT_OLLAMA_MODEL)
  }
  return openai(DEFAULT_CHAT_MODEL)
}

export async function POST(req: Request) {
  const { messages, provider = 'openai' } = await req.json()

  const result = streamText({
    model: getModel(provider as Provider),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    tools: { list_beers, list_breweries, list_categories },
    stopWhen: stepCountIs(10),
  })

  return result.toUIMessageStreamResponse()
}
