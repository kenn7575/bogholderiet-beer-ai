import { streamChatAgent, type ChatMessage } from '@/lib/ai/chat-agent'

export const runtime = 'nodejs'

/**
 * POST /api/chat
 *
 * Request body: { messages: ChatMessage[], model?: string }
 *
 * Returns a text/event-stream SSE response. Each line is:
 *   data: <JSON StreamEvent>
 *
 * StreamEvent shapes:
 *   { type: "text",       delta: string }
 *   { type: "tool_start", name: string }
 *   { type: "tool_done",  name: string, result: unknown }
 *   { type: "error",      message: string }
 *   data: [DONE]   (terminal frame)
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
  const model = body.model

  const encoder = new TextEncoder()
  function frame(event: unknown) {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamChatAgent(messages, model)) {
          controller.enqueue(frame(event))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        controller.enqueue(
          frame({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' }),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
