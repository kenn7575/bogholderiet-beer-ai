import { z } from 'zod'
import { prisma } from '@/lib/db'

export const listBeersTool = {
  name: 'list_beers',
  description: 'List beers from the database with optional filters.',
  parameters: z.object({
    search: z.string().optional().describe('Filter by beer title'),
    brewerySlug: z.string().optional().describe('Filter by brewery slug'),
    countrySlug: z.string().optional().describe('Filter by country slug'),
    categorySlug: z.string().optional().describe('Filter by style/category slug'),
    limit: z.number().int().min(1).max(50).optional().describe('Max results (default 10)'),
  }),
  async execute({
    search,
    brewerySlug,
    countrySlug,
    categorySlug,
    limit,
  }: {
    search?: string
    brewerySlug?: string
    countrySlug?: string
    categorySlug?: string
    limit?: number
  }) {
    return prisma.beer.findMany({
      where: {
        ...(search && { title: { contains: search, mode: 'insensitive' } }),
        ...(brewerySlug && { brewery: { slug: brewerySlug } }),
        ...(countrySlug && { country: { slug: countrySlug } }),
        ...(categorySlug && { categories: { some: { category: { slug: categorySlug } } } }),
      },
      take: limit ?? 10,
      include: {
        brewery: { select: { name: true, slug: true } },
        country: { select: { name: true, slug: true } },
        categories: { include: { category: { select: { name: true, slug: true } } } },
      },
      orderBy: { title: 'asc' },
    })
  },
} as const

export const listCategoriesTool = {
  name: 'list_categories',
  description: 'List all beer style categories (e.g. IPA, Stout, Lager).',
  parameters: z.object({
    search: z.string().optional().describe('Filter categories by name'),
  }),
  async execute({ search }: { search?: string }) {
    return prisma.category.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      select: { id: true, name: true, slug: true, count: true },
      orderBy: { name: 'asc' },
    })
  },
} as const
