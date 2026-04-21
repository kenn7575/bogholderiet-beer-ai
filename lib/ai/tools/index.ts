import { z } from 'zod'
import type OpenAI from 'openai'
import { listBreweriesTool } from './brewery'
import { listBeersTool, listCategoriesTool } from './beer'

export interface Tool {
  name: string
  description: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: z.ZodObject<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (params: any) => Promise<unknown>
}

const ALL_TOOLS: Tool[] = [listBreweriesTool, listBeersTool, listCategoriesTool]

const TOOL_MAP = new Map(ALL_TOOLS.map((t) => [t.name, t]))

export function getToolDefinitions(): OpenAI.Chat.ChatCompletionTool[] {
  return ALL_TOOLS.map((tool) => {
    const { $schema: _, ...parameters } = tool.parameters.toJSONSchema() as Record<string, unknown> & {
      $schema?: string
    }
    return {
      type: 'function' as const,
      function: { name: tool.name, description: tool.description, parameters },
    }
  })
}

export async function executeTool(name: string, args: unknown): Promise<unknown> {
  const tool = TOOL_MAP.get(name)
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  const parsed = tool.parameters.parse(args)
  return tool.execute(parsed)
}
