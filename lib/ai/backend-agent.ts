/**
 * Backend AI agent — server-only, never imported client-side.
 *
 * Two functions:
 *   webSearch  – fetches live web results and returns a plain-text summary
 *   structured – returns data matching a Zod schema (structured output)
 *
 * For "web search → structured output" combine them:
 *   const text = await webSearch(query)
 *   const data = await structured(`Extract from: ${text}`, MySchema)
 */

import { z } from 'zod'
import { zodTextFormat } from 'openai/helpers/zod'
import { getClient } from './client'
import { type Model, DEFAULT_BACKEND_MODEL } from './models'

interface Options {
  model?: Model
  systemPrompt?: string
}

export async function webSearch(query: string, options: Options = {}): Promise<string> {
  const { model = DEFAULT_BACKEND_MODEL, systemPrompt } = options
  const client = getClient()

  const response = await client.responses.create({
    model,
    tools: [{ type: 'web_search_preview' }],
    input: [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: query },
    ],
  })

  return response.output_text
}

export async function structured<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options: Options = {},
): Promise<z.infer<T>> {
  const { model = DEFAULT_BACKEND_MODEL, systemPrompt } = options
  const client = getClient()

  const response = await client.responses.parse({
    model,
    input: [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ],
    text: { format: zodTextFormat(schema, 'result') },
  })

  return response.output_parsed as z.infer<T>
}
