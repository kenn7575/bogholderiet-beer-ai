"use client"

import {
  DefaultChatTransport,
  isTextUIPart,
  isToolUIPart,
  isReasoningUIPart,
  isStaticToolUIPart,
  getToolName,
  type UIMessage,
  type ToolUIPart,
  type DynamicToolUIPart,
  type UITools,
  type ChatStatus,
} from "ai"
import { useChat } from "@ai-sdk/react"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageReasoning,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import { Button } from "@/components/ui/button"
import { syncDatabase } from "./actions"
import { BeerIcon, DatabaseIcon } from "lucide-react"
import { useState, useRef, useMemo, useEffect } from "react"
import type { Provider } from "@/lib/ai/models"

const IS_DEV = process.env.NODE_ENV === "development"

type Suggestion = { label: string; value: string }
type SuggestionOutput = { question: string; suggestions: Suggestion[] }

function SuggestOptions({
  output,
  onSend,
}: {
  output: SuggestionOutput | null
  onSend: (text: string) => void
}) {
  if (!output) return null
  return (
    <div className="space-y-3 p-3">
      <p className="text-sm font-medium">{output.question}</p>
      <div className="flex flex-wrap gap-2">
        {output.suggestions.map((s) => (
          <button
            key={s.value}
            onClick={() => onSend(s.value)}
            className="rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ToolPart({
  part,
  onSend,
}: {
  part: ToolUIPart | DynamicToolUIPart
  onSend: (text: string) => void
}) {
  const name = getToolName(part)
  const isOpen =
    part.state === "output-available" || part.state === "output-error"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyPart = part as any

  if (name === "suggest_options" && anyPart.output) {
    return (
      <Tool defaultOpen={isOpen}>
        {isStaticToolUIPart(part) ? (
          <ToolHeader
            type={part.type as ToolUIPart<UITools>["type"]}
            state={part.state}
            title="Forslag"
          />
        ) : (
          <ToolHeader
            type="dynamic-tool"
            state={(part as DynamicToolUIPart).state}
            toolName={name}
            title="Forslag"
          />
        )}
        <SuggestOptions
          output={anyPart.output as SuggestionOutput}
          onSend={onSend}
        />
      </Tool>
    )
  }

  return (
    <Tool defaultOpen={isOpen}>
      {isStaticToolUIPart(part) ? (
        <ToolHeader
          type={part.type as ToolUIPart<UITools>["type"]}
          state={part.state}
          title={name.replace(/_/g, " ")}
        />
      ) : (
        <ToolHeader
          type="dynamic-tool"
          state={(part as DynamicToolUIPart).state}
          toolName={name}
          title={name.replace(/_/g, " ")}
        />
      )}
      <ToolContent>
        {anyPart.input != null && <ToolInput input={anyPart.input} />}
        <ToolOutput
          output={anyPart.output ?? null}
          errorText={anyPart.errorText ?? null}
        />
      </ToolContent>
    </Tool>
  )
}

function AssistantMessage({
  message,
  isLast,
  status,
  onSend,
}: {
  message: UIMessage
  isLast: boolean
  status: ChatStatus
  onSend: (text: string) => void
}) {
  return (
    <Message from="assistant">
      {message.parts.map((part, i) => {
        if (isReasoningUIPart(part)) {
          return (
            <MessageReasoning key={i} isStreaming={part.state === "streaming"}>
              {part.text}
            </MessageReasoning>
          )
        }
        if (isTextUIPart(part)) {
          return (
            <MessageContent key={i}>
              <MessageResponse isAnimating={isLast && status === "streaming"}>
                {part.text}
              </MessageResponse>
            </MessageContent>
          )
        }
        if (isToolUIPart(part)) {
          return <ToolPart key={i} part={part} onSend={onSend} />
        }
        return null
      })}
    </Message>
  )
}

export default function Page() {
  const [provider, setProvider] = useState<Provider>("openai")
  const providerRef = useRef(provider)
  providerRef.current = provider

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: IS_DEV ? () => ({ provider: providerRef.current }) : undefined,
      }),
    []
  )

  const { messages, sendMessage, status, stop } = useChat({ transport })
  const [syncing, setSyncing] = useState(false)
  const [introText, setIntroText] = useState("")
  const [introAnimating, setIntroAnimating] = useState(true)

  const INTRO_MESSAGE =
    "Hej! Jeg er **Hops** 🍻 — din personlige ølguide. Jeg kender hver eneste flaske og dåse på hylden her hos Bogholderiet. Fortæl mig hvad du er i humør til — kan du lide noget hoppet, mørkt, surt, eller måske noget let og forfriskende?"

  useEffect(() => {
    if (messages.length > 0) return
    let i = 0
    const interval = setInterval(() => {
      i += 2
      if (i >= INTRO_MESSAGE.length) {
        setIntroText(INTRO_MESSAGE)
        setIntroAnimating(false)
        clearInterval(interval)
      } else {
        setIntroText(INTRO_MESSAGE.slice(0, i))
      }
    }, 16)
    return () => clearInterval(interval)
  }, [messages.length])

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await syncDatabase()
      console.log("Synced:", result)
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
                className={`rounded px-2 py-1 transition-colors ${provider === "openai" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setProvider("openai")}
              >
                OpenAI
              </button>
              <button
                className={`rounded px-2 py-1 transition-colors ${provider === "ollama" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setProvider("ollama")}
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
            {syncing ? "Syncing…" : "Sync DB"}
          </Button>
        </div>
      </header>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <Message from="assistant">
              <MessageContent>
                <MessageResponse isAnimating={introAnimating}>
                  {introText}
                </MessageResponse>
              </MessageContent>
            </Message>
          ) : (
            <>
              {messages.map((message, i) =>
                message.role === "user" ? (
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
                    onSend={(text) => sendMessage({ text })}
                  />
                )
              )}
              {status === "submitted" && (
                <Message from="assistant">
                  <MessageContent>
                    <div className="flex items-center gap-1 py-0.5">
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                    </div>
                  </MessageContent>
                </Message>
              )}
            </>
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
          <PromptInputTextarea placeholder="Spørg om øl, bryggerier, stilarter, smagsnoter…" />
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
