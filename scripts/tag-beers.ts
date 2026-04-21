import "dotenv/config"
import { z } from "zod"
import { prisma } from "../lib/db"
import { ollamaWebSearchStructured } from "../lib/ai/backend-agent"
import { Models } from "../lib/ai/models"

const TasteTagsSchema = z.object({
  tags: z.array(z.string()),
})

async function fetchTasteTagsForBeer(
  title: string,
  breweryName: string | null
): Promise<string[]> {
  const beerDescription = breweryName ? `${title} by ${breweryName}` : title
  const result = await ollamaWebSearchStructured(
    `Search for the taste and flavor profile of the beer "${beerDescription}". Return exactly 6 short taste tags (1-2 words each) that best describe this beer's flavor. Use descriptive words like "bitter", "sød", "karamel", "kaffe", "frugtig", "citrus", "røget", "humle", "dank", "krydret", "blomster", "tropisk", "syrlig" etc. Tags can be in Danish or English. Return only taste/flavor tags, no style or brand names.`,
    TasteTagsSchema,
    {
      model: Models.GEMMA4_E4B,
      systemPrompt:
        "You are a beer expert. Use web search to find accurate taste information about beers and return structured flavor tags.",
    }
  )
  return result.tags.slice(0, 6).map((t: string) => t.toLowerCase().trim())
}

async function main() {
  const beers = await prisma.beer.findMany({
    where: { tasteTags: { none: {} } },
    include: { brewery: true },
    orderBy: { id: "asc" },
  })

  console.log(`Found ${beers.length} beers without taste tags`)

  for (let i = 0; i < beers.length; i++) {
    const beer = beers[i]
    console.log(`[${i + 1}/${beers.length}] ${beer.title}`)

    try {
      const tags = await fetchTasteTagsForBeer(
        beer.title,
        beer.brewery?.name ?? null
      )
      console.log(`  → ${tags.join(", ")}`)

      for (const tagName of tags) {
        const tasteTag = await prisma.tasteTag.upsert({
          where: { name: tagName },
          create: { name: tagName },
          update: {},
        })
        await prisma.beerTasteTag.upsert({
          where: {
            beerId_tasteTagId: { beerId: beer.id, tasteTagId: tasteTag.id },
          },
          create: { beerId: beer.id, tasteTagId: tasteTag.id },
          update: {},
        })
      }
    } catch (err) {
      console.error(
        `  Error: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  await prisma.$disconnect()
  console.log("Done!")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
