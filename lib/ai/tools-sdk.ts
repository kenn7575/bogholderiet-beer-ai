import { tool } from "ai"
import {
  listBeersTool,
  listCategoriesTool,
  listTasteTagsTool,
} from "./tools/beer"
import { listBreweriesTool } from "./tools/brewery"
import { suggestOptionsTool } from "./tools/suggestions"

export const list_beers = tool({
  description: listBeersTool.description,
  inputSchema: listBeersTool.parameters,
  execute: listBeersTool.execute,
})

export const list_breweries = tool({
  description: listBreweriesTool.description,
  inputSchema: listBreweriesTool.parameters,
  execute: listBreweriesTool.execute,
})

export const list_categories = tool({
  description: listCategoriesTool.description,
  inputSchema: listCategoriesTool.parameters,
  execute: listCategoriesTool.execute,
})

export const list_taste_tags = tool({
  description: listTasteTagsTool.description,
  inputSchema: listTasteTagsTool.parameters,
  execute: listTasteTagsTool.execute,
})

export const suggest_options = tool({
  description: suggestOptionsTool.description,
  inputSchema: suggestOptionsTool.parameters,
  execute: suggestOptionsTool.execute,
})
