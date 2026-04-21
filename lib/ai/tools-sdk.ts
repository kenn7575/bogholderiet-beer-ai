import { tool } from 'ai'
import { listBeersTool, listCategoriesTool } from './tools/beer'
import { listBreweriesTool } from './tools/brewery'

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
