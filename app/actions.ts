'use server'
import fs from 'fs/promises'
import { syncAll } from '@/lib/sync'

export async function saveBeersToFile(beers: unknown): Promise<void> {
  await fs.writeFile('beers.json', JSON.stringify(beers, null, 2))
}

export async function syncDatabase(): Promise<{
  countries: number
  breweries: number
  categories: number
  beers: number
}> {
  return syncAll()
}
