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

export const listBreweriesTool = {
  name: "list_breweries",
  description:
    "Hent bryggerier fra databasen. Filtrer valgfrit på navn. Hvis resultatet er tooManyResults, brug suggest_options til at hjælpe brugeren med at indsnævre søgningen.",
  parameters: z.object({
    search: z.string().optional().describe("Ufølsom navnefiltrering (dansk)"),
  }),
  async execute({ search }: { search?: string }) {
    const where = search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : undefined

    const totalCount = await prisma.brewery.count({ where })

    if (totalCount > 10) {
      return {
        tooManyResults: true,
        totalCount,
        hint: "For mange resultater. Brug suggest_options til at tilbyde brugeren at søge på bryggeri-navn.",
      }
    }

    const breweries = await prisma.brewery.findMany({
      where,
      select: { id: true, name: true, slug: true, count: true },
    })

    return shuffle(breweries)
  },
} as const
