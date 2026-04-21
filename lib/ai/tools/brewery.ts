import { z } from 'zod'
import { prisma } from '@/lib/db'

export const listBreweriesTool = {
  name: 'list_breweries',
  description:
    'List breweries from the database. Optionally filter by name or limit results.',
  parameters: z.object({
    search: z.string().optional().describe('Case-insensitive name filter'),
    limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20)'),
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
