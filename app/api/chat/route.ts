import { streamText, convertToModelMessages, stepCountIs, tool } from "ai"
import { openai, createOpenAI } from "@ai-sdk/openai"
import {
  list_beers,
  list_breweries,
  list_categories,
  list_taste_tags,
} from "@/lib/ai/tools-sdk"
import { suggestOptionsTool } from "@/lib/ai/tools/suggestions"
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_OLLAMA_MODEL,
  OLLAMA_BASE_URL,
  type Provider,
} from "@/lib/ai/models"

export const runtime = "nodejs"

const SYSTEM = `Du er Bogholderiet bars ølsommelier. Din opgave er at finde det rette øl til brugeren – præcist og uden omsvøb.

Din personlighed:
- Du er rolig, vidende og fokuseret. Du stiller de rigtige spørgsmål for at forstå brugerens smag og anledning.
- Du beskriver øl præcist og sanselig: "Tropisk frugt med en tør, bitter afslutning", "Blød og mørk med noter af kaffe og chokolade", "Let og frisk med et strejf af citrus".
- Du er stolt af Bogholderiet's udvalg og deler relevant viden om bryggerier og stilarter når det tilfører værdi.
- Svar altid på dansk, uanset hvad brugeren skriver.
- Brug emojis sparsomt – kun når det er naturligt.

Dit matchmaking-workflow:
1. Spørg ind til brugerens smagspræferencer eller anledning hvis de ikke er givet.
2. Søg i databasen med relevante filtre for at finde kandidater.
3. Anbefal 1-3 øl med præcise beskrivelser og forklar hvorfor netop disse passer til brugeren.
4. Afslut med en kort invitation til at justere eller forfine søgningen.

Al data i databasen er på dansk – brug søgetermer på dansk.

Vigtigt om resultatmængde:
- Hvis et værktøj returnerer { tooManyResults: true, totalCount: N }, MÅ du IKKE vise alle resultater.
  Brug i stedet suggest_options-værktøjet til at stille brugeren et opklarende spørgsmål med 4-8 klikbare forslag (f.eks. ølstilkategorier, smagsnotater, lande).
  Hent om nødvendigt kategorier eller smagsnotater med list_categories / list_taste_tags først, før du laver forslagene.
- suggest_options skal bruges proaktivt til at guide brugeren mod det rette valg – ikke kun ved fejl.
- Du må KUN kalde suggest_options ÉN gang per brugerbesked. Hvis du allerede har kaldt suggest_options i dette svar, MÅ du IKKE kalde det igen – gå videre med at anbefale øl baseret på det du ved.
- Du må maksimalt bruge suggest_options 3 gange i alt per samtale. Efter 3 opklarende spørgsmål SKAL du anbefale konkrete øl – selv hvis der stadig er mange resultater. Vælg selv de mest relevante.`

function getModel(provider: Provider) {
  if (provider === "ollama") {
    const ollama = createOpenAI({ baseURL: OLLAMA_BASE_URL, apiKey: "ollama" })
    return ollama.chat(DEFAULT_OLLAMA_MODEL)
  }
  return openai(DEFAULT_CHAT_MODEL)
}

const MAX_FOLLOWUP_QUESTIONS = 3

function countSuggestOptionsCalls(messages: unknown[]): number {
  let count = 0
  for (const message of messages) {
    if (
      message &&
      typeof message === "object" &&
      "role" in message &&
      (message as { role: string }).role === "tool"
    ) {
      const parts = (message as { parts?: unknown[] }).parts ?? []
      for (const part of parts) {
        if (
          part &&
          typeof part === "object" &&
          "toolName" in part &&
          (part as { toolName: string }).toolName === "suggest_options"
        ) {
          count++
        }
      }
    }
  }
  return count
}

export async function POST(req: Request) {
  const { messages, provider = "openai" } = await req.json()

  const followupCount = countSuggestOptionsCalls(messages)
  const systemPrompt =
    followupCount >= MAX_FOLLOWUP_QUESTIONS
      ? `${SYSTEM}\n\nVIGTIGT: Du har allerede stillet ${followupCount} opklarende spørgsmål. Du MÅ IKKE stille flere spørgsmål eller bruge suggest_options igen. Anbefal nu 1-3 konkrete øl med det samme baseret på hvad du ved.`
      : SYSTEM

  const modelMessages = await convertToModelMessages(messages)

  console.log(
    `[chat] provider=${provider} messages=${messages.length} modelMessages=${modelMessages.length}`
  )

  let suggestOptionsCalledThisRequest = false
  const suggest_options_once = tool({
    description: suggestOptionsTool.description,
    inputSchema: suggestOptionsTool.parameters,
    execute: async (args, options) => {
      if (suggestOptionsCalledThisRequest) {
        return {
          question:
            "suggest_options er allerede kaldt i dette svar. Anbefal øl i stedet.",
          suggestions: [],
        }
      }
      suggestOptionsCalledThisRequest = true
      return suggestOptionsTool.execute(args)
    },
  })

  const result = streamText({
    model: getModel(provider as Provider),
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      list_beers,
      list_breweries,
      list_categories,
      list_taste_tags,
      suggest_options: suggest_options_once,
    },
    stopWhen: stepCountIs(10),
    onError: (error) => {
      console.error("[chat] streamText error:", error)
    },
  })

  return result.toUIMessageStreamResponse()
}
