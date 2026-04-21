import { z } from 'zod'
import { prisma } from '@/lib/db'

export const listBreweriesTool = {
  name: 'list_breweries',
  description: 'Hent bryggerier fra databasen. Filtrer valgfrit på navn.',
  parameters: z.object({
    search: z.string().optional().describe('Ufølsom navnefiltrering (dansk)'),
    limit: z.number().int().min(1).max(100).optional().describe('Maks resultater (standard 20)'),
  }),
  async execute({ search, limit }: { search?: string; limit?: number }) {
    return prisma.brewery.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      take: limit ?? 20,
      select: { id: true, name: true, slug: true, count: true },
      orderBy: { name: 'asc' },
    })
  },
} as const
