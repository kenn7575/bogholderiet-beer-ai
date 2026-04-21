/**
 * Public-facing streaming chat agent.
 *
 * streamChatAgent() is an async generator that yields StreamEvent objects.
 * It handles the full tool-calling loop internally — callers just consume events.
 *
 * Events:
 *   { type: 'text', delta: string }           — partial assistant text
 *   { type: 'tool_start', name: string }       — tool about to be called
 *   { type: 'tool_done', name: string, result: unknown } — tool result
 *
 * Mount as an SSE endpoint via app/api/chat/route.ts.
 */

import type OpenAI from 'openai'
import { getClient } from './client'
import { type Model, DEFAULT_CHAT_MODEL } from './models'
import { getToolDefinitions, executeTool } from './tools/index'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_start'; name: string }
  | { type: 'tool_done'; name: string; result: unknown }

interface AccumulatedToolCall {
  id: string
  name: string
  args: string
}

const MAX_ITERATIONS = 10

export async function* streamChatAgent(
  messages: ChatMessage[],
  model: Model = DEFAULT_CHAT_MODEL,
): AsyncGenerator<StreamEvent> {
  const client = getClient()
  const tools = getToolDefinitions()
  const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const stream = client.chat.completions.stream({
      model,
      messages: msgs,
      tools,
      tool_choice: 'auto',
    })

    const pendingCalls = new Map<number, AccumulatedToolCall>()
    let assistantText = ''
    let finishReason: string | null = null

    for await (const chunk of stream) {
      const choice = chunk.choices[0]
      if (!choice) continue

      if (choice.finish_reason) finishReason = choice.finish_reason

      const delta = choice.delta

      if (delta.content) {
        assistantText += delta.content
        yield { type: 'text', delta: delta.content }
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const acc = pendingCalls.get(tc.index) ?? { id: '', name: '', args: '' }
          pendingCalls.set(tc.index, {
            id: acc.id || tc.id || '',
            name: acc.name + (tc.function?.name ?? ''),
            args: acc.args + (tc.function?.arguments ?? ''),
          })
        }
      }
    }

    if (finishReason !== 'tool_calls') break

    const toolCalls = Array.from(pendingCalls.entries())
      .sort(([a], [b]) => a - b)
      .map(([, tc]) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.args },
      }))

    msgs.push({
      role: 'assistant',
      content: assistantText || null,
      tool_calls: toolCalls,
    })

    for (const tc of toolCalls) {
      yield { type: 'tool_start', name: tc.function.name }

      let result: unknown
      try {
        result = await executeTool(tc.function.name, JSON.parse(tc.function.arguments))
      } catch (err) {
        result = { error: err instanceof Error ? err.message : 'Tool execution failed' }
      }

      yield { type: 'tool_done', name: tc.function.name, result }

      msgs.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      })
    }
  }
}
