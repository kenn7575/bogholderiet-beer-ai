export const Models = {
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_41: 'gpt-4.1',
  GPT_41_MINI: 'gpt-4.1-mini',
  GPT_41_NANO: 'gpt-4.1-nano',
  O3: 'o3',
  O4_MINI: 'o4-mini',
} as const

export type Model = (typeof Models)[keyof typeof Models]

export const DEFAULT_BACKEND_MODEL: Model = Models.GPT_4O
export const DEFAULT_CHAT_MODEL: Model = Models.GPT_41_MINI
