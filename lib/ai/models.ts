export const Models = {
  GPT_5: "gpt-5",
  GPT_54_NANO: "gpt-5.4-nano-2026-03-17",
  GEMMA4_E4B: "gemma4:e4b",
  GEMMA4_E2B: "gemma4:e2b",
} as const

export type Model = (typeof Models)[keyof typeof Models]

export type Provider = "openai" | "ollama"

export const DEFAULT_BACKEND_MODEL: Model = Models.GPT_54_NANO
export const DEFAULT_CHAT_MODEL: Model = Models.GPT_54_NANO
export const DEFAULT_OLLAMA_MODEL: Model = Models.GEMMA4_E2B

export const OLLAMA_BASE_URL = "http://localhost:11434/v1"
