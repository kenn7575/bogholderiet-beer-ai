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
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getClient } from './client'
import { type Model, DEFAULT_BACKEND_MODEL, DEFAULT_OLLAMA_MODEL, OLLAMA_BASE_URL } from './models'

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
  const ollamaClient = createOpenAI({ baseURL: OLLAMA_BASE_URL, apiKey: 'ollama' })

  const jsonSchema = z.toJSONSchema(schema)
  const system = [
    options.systemPrompt,
    `Respond with valid JSON only — no markdown, no explanation.\nRequired JSON schema:\n${JSON.stringify(jsonSchema)}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const { text } = await generateText({
    model: ollamaClient(options.model ?? DEFAULT_OLLAMA_MODEL),
    system,
    prompt: `${prompt}\n\nSearch results:\n${searchResults}`,
  })

  // Strip markdown code fences if the model wrapped the output
  const jsonText = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return schema.parse(JSON.parse(jsonText)) as z.infer<T>
}
