import { z } from 'zod'
import { prisma } from '@/lib/db'

export const listBeersTool = {
  name: 'list_beers',
  description: 'Søg efter øl i databasen med valgfrie filtre.',
  parameters: z.object({
    search: z.string().optional().describe('Filtrer på øl-navn (dansk)'),
    brewerySlug: z.string().optional().describe('Filtrer på bryggeri-slug'),
    countrySlug: z.string().optional().describe('Filtrer på land-slug'),
    categorySlug: z.string().optional().describe('Filtrer på stil/kategori-slug'),
    limit: z.number().int().min(1).max(50).optional().describe('Maks resultater (standard 10)'),
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
  description: 'Hent alle ølstilkategorier (f.eks. IPA, Stout, Lager).',
  parameters: z.object({
    search: z.string().optional().describe('Filtrer kategorier på navn (dansk)'),
  }),
  async execute({ search }: { search?: string }) {
    return prisma.category.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      select: { id: true, name: true, slug: true, count: true },
      orderBy: { name: 'asc' },
    })
  },
} as const
