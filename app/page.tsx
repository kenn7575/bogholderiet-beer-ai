'use client'

import {
  DefaultChatTransport,
  isTextUIPart,
  isToolUIPart,
  isStaticToolUIPart,
  getToolName,
  type UIMessage,
  type ToolUIPart,
  type DynamicToolUIPart,
  type UITools,
  type ChatStatus,
} from 'ai'
import { useChat } from '@ai-sdk/react'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool'
import { Button } from '@/components/ui/button'
import { syncDatabase } from './actions'
import { BeerIcon, DatabaseIcon } from 'lucide-react'
import { useState, useRef, useMemo } from 'react'
import type { Provider } from '@/lib/ai/models'

const IS_DEV = process.env.NODE_ENV === 'development'

function ToolPart({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  const name = getToolName(part)
  const isOpen = part.state === 'output-available' || part.state === 'output-error'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyPart = part as any

  return (
    <Tool defaultOpen={isOpen}>
      {isStaticToolUIPart(part) ? (
        <ToolHeader
          type={part.type as ToolUIPart<UITools>['type']}
          state={part.state}
          title={name.replace(/_/g, ' ')}
        />
      ) : (
        <ToolHeader
          type="dynamic-tool"
          state={(part as DynamicToolUIPart).state}
          toolName={name}
          title={name.replace(/_/g, ' ')}
        />
      )}
      <ToolContent>
        {anyPart.input != null && <ToolInput input={anyPart.input} />}
        <ToolOutput output={anyPart.output ?? null} errorText={anyPart.errorText ?? null} />
      </ToolContent>
    </Tool>
  )
}

function AssistantMessage({
  message,
  isLast,
  status,
}: {
  message: UIMessage
  isLast: boolean
  status: ChatStatus
}) {
  return (
    <Message from="assistant">
      {message.parts.map((part, i) => {
        if (isTextUIPart(part)) {
          return (
            <MessageContent key={i}>
              <MessageResponse isAnimating={isLast && status === 'streaming'}>
                {part.text}
              </MessageResponse>
            </MessageContent>
          )
        }
        if (isToolUIPart(part)) {
          return <ToolPart key={i} part={part} />
        }
        return null
      })}
    </Message>
  )
}

export default function Page() {
  const [provider, setProvider] = useState<Provider>('openai')
  const providerRef = useRef(provider)
  providerRef.current = provider

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: IS_DEV ? () => ({ provider: providerRef.current }) : undefined,
      }),
    [],
  )

  const { messages, sendMessage, status, stop } = useChat({ transport })
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await syncDatabase()
      console.log('Synced:', result)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <BeerIcon className="size-5 text-amber-500" />
          <span className="font-semibold">Beer AI</span>
        </div>
        <div className="flex items-center gap-2">
          {IS_DEV && (
            <div className="flex items-center rounded-md border p-0.5 text-xs">
              <button
                className={`rounded px-2 py-1 transition-colors ${provider === 'openai' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setProvider('openai')}
              >
                OpenAI
              </button>
              <button
                className={`rounded px-2 py-1 transition-colors ${provider === 'ollama' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setProvider('ollama')}
              >
                Ollama
              </button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <DatabaseIcon className="mr-1.5 size-3.5" />
            {syncing ? 'Syncing…' : 'Sync DB'}
          </Button>
        </div>
      </header>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<BeerIcon className="size-8" />}
              title="What can I get you?"
              description="Ask me about beers, breweries, styles, or get personalised recommendations."
            />
          ) : (
            messages.map((message, i) =>
              message.role === 'user' ? (
                <Message key={message.id} from="user">
                  <MessageContent>
                    {message.parts.filter(isTextUIPart).map((p, j) => (
                      <span key={j}>{p.text}</span>
                    ))}
                  </MessageContent>
                </Message>
              ) : (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  isLast={i === messages.length - 1}
                  status={status}
                />
              ),
            )
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 border-t p-4">
        <PromptInput
          onSubmit={({ text }) => {
            if (text.trim()) return sendMessage({ text })
          }}
        >
          <PromptInputTextarea placeholder="Ask about beers, breweries, styles…" />
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
