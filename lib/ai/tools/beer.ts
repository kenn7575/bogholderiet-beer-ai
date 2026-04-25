import { z } from "zod"
import { prisma } from "@/lib/db"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const listBeersTool = {
  name: "list_beers",
  description:
    "Søg efter øl i databasen med valgfrie filtre. Hvis resultatet er tooManyResults, brug suggest_options til at hjælpe brugeren med at indsnævre søgningen.",
  parameters: z.object({
    search: z.string().optional().describe("Filtrer på øl-navn (dansk)"),
    brewerySlug: z.string().optional().describe("Filtrer på bryggeri-slug"),
    countrySlug: z.string().optional().describe("Filtrer på land-slug"),
    categorySlug: z
      .string()
      .optional()
      .describe(
        'Filtrer på stil/kategori-slug (simpel form uden "øl", f.eks. "hvede" ikke "hvedeoel")'
      ),
    tasteTagName: z
      .string()
      .optional()
      .describe("Filtrer på smagsnotat (dansk)"),
  }),
  async execute({
    search,
    brewerySlug,
    countrySlug,
    categorySlug,
    tasteTagName,
  }: {
    search?: string
    brewerySlug?: string
    countrySlug?: string
    categorySlug?: string
    tasteTagName?: string
  }) {
    const where = {
      ...(search && {
        title: { contains: search, mode: "insensitive" as const },
      }),
      ...(brewerySlug && { brewery: { slug: brewerySlug } }),
      ...(countrySlug && { country: { slug: countrySlug } }),
      ...(categorySlug && {
        categories: { some: { category: { slug: categorySlug } } },
      }),
      ...(tasteTagName && {
        tasteTags: {
          some: {
            tasteTag: {
              name: { contains: tasteTagName, mode: "insensitive" as const },
            },
          },
        },
      }),
    }

    const totalCount = await prisma.beer.count({ where })

    if (totalCount > 10) {
      return {
        tooManyResults: true,
        totalCount,
        hint: "For mange resultater. Brug suggest_options til at tilbyde brugeren at indsnævre på kategori, smagsnotat, land eller bryggeri.",
      }
    }

    const beers = await prisma.beer.findMany({
      where,
      include: {
        brewery: { select: { name: true, slug: true } },
        country: { select: { name: true, slug: true } },
        categories: {
          include: { category: { select: { name: true, slug: true } } },
        },
        tasteTags: { include: { tasteTag: { select: { name: true } } } },
      },
    })

    return shuffle(beers)
  },
} as const

export const listCategoriesTool = {
  name: "list_categories",
  description:
    'Hent alle ølstilkategorier. Kategorierne er på simpel dansk form uden "øl" – f.eks. "Hvede", "Ale", "IPA", "Stout", "Lager". Søg UDEN ordet "øl".',
  parameters: z.object({
    search: z
      .string()
      .optional()
      .describe(
        'Filtrer kategorier på navn (dansk). Brug simpel form uden "øl", f.eks. "Hvede" ikke "Hvedeøl"'
      ),
  }),
  async execute({ search }: { search?: string }) {
    const categories = await prisma.category.findMany({
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      select: { id: true, name: true, slug: true, count: true },
    })
    return shuffle(categories)
  },
} as const

export const listTasteTagsTool = {
  name: "list_taste_tags",
  description:
    'Hent smagsnotaterne (taste tags) fra databasen, f.eks. "frugtig", "bitter", "sød".',
  parameters: z.object({
    search: z
      .string()
      .optional()
      .describe("Filtrer smagsnotater på navn (dansk)"),
  }),
  async execute({ search }: { search?: string }) {
    const tags = await prisma.tasteTag.findMany({
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      select: { id: true, name: true },
    })
    return shuffle(tags)
  },
} as const
