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
import { zodToJsonSchema } from 'zod-to-json-schema'
import ollama from 'ollama'
import { getClient } from './client'
import { type Model, DEFAULT_BACKEND_MODEL, DEFAULT_OLLAMA_MODEL } from './models'

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

export async function webSearchStructured<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options: Options = {},
): Promise<z.infer<T>> {
  const { model = DEFAULT_BACKEND_MODEL, systemPrompt } = options
  const client = getClient()

  const response = await client.responses.parse({
    model,
    tools: [{ type: 'web_search_preview' }],
    input: [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ],
    text: { format: zodTextFormat(schema, 'result') },
  })

  return response.output_parsed as z.infer<T>
}

async function ollamaWebSearch(query: string): Promise<string> {
  const apiKey = process.env.OLLAMA_API_KEY
  if (!apiKey) throw new Error('OLLAMA_API_KEY is not set')

  const response = await fetch('https://ollama.com/api/web_search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, max_results: 5 }),
  })

  if (!response.ok) throw new Error(`Ollama web search failed: ${response.statusText}`)

  const data = await response.json()
  return (data.results as { title: string; url: string; content: string }[])
    .map((r) => `${r.title}\n${r.url}\n${r.content}`)
    .join('\n\n')
}

export async function ollamaWebSearchStructured<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options: { model?: string; systemPrompt?: string } = {},
): Promise<z.infer<T>> {
  const searchResults = await ollamaWebSearch(prompt)

  const messages: { role: 'system' | 'user'; content: string }[] = [
    ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
    { role: 'user' as const, content: `${prompt}\n\nSearch results:\n${searchResults}` },
  ]

  const response = await ollama.chat({
    model: options.model ?? DEFAULT_OLLAMA_MODEL,
    messages,
  
    format: zodToJsonSchema(schema as any) as Record<string, unknown>,
    options: { temperature: 0 },
  })
  console.log("🚀 ~ ollamaWebSearchStructured ~ response:", response)

  return schema.parse(JSON.parse(response.message.content)) as z.infer<T>
}
