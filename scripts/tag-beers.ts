import "dotenv/config"
import { z } from "zod"
import { prisma } from "../lib/db"
import { ollamaWebSearchStructured } from "../lib/ai/backend-agent"
import { Models } from "../lib/ai/models"

export const BeerSchema = z.object({
  beerName: z.string(),
  brewery: z.string(),
  country: z.string().nullable(),
  style: z.string().nullable(),
  subStyle: z.string().nullable(),

  abv: z.number().nullable(),
  ibu: z.number().int().nullable(),
  ebc: z.number().int().nullable(),
  colorDescription: z.string().nullable(),

  description: z.string().nullable(),

  tastingNotes: z.object({
    aroma: z.array(z.string()).default([]),
    flavor: z.array(z.string()).default([]),
    aftertaste: z.array(z.string()).default([]),
    mouthfeel: z.string().nullable(),

    sweetness: z.number().min(0).max(10).nullable(),
    bitterness: z.number().min(0).max(10).nullable(),
    sourness: z.number().min(0).max(10).nullable(),
    body: z.number().min(0).max(10).nullable(),
    carbonation: z.number().min(0).max(10).nullable(),
  }),

  ingredients: z.object({
    malts: z.array(z.string()).default([]),
    hops: z.array(z.string()).default([]),
    yeast: z.string().nullable(),
    extras: z.array(z.string()).default([]),
  }),

  foodPairings: z.array(z.string()).default([]),

  serving: z.object({
    temperatureCelsius: z.object({
      min: z.number().nullable(),
      max: z.number().nullable(),
    }),
    glassType: z.string().nullable(),
  }),

  tags: z.array(z.string()).default([]),
  occasionTags: z.array(z.string()).default([]),

  similarBeers: z
    .array(
      z.object({
        beerName: z.string(),
        brewery: z.string(),
        reason: z.string(),
      })
    )
    .default([]),

  aiSummary: z.object({
    shortDescription: z.string().nullable(),
    recommendationText: z.string().nullable(),
    whoWouldLikeIt: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),

  dataQuality: z.object({
    source: z.enum(["ai_generated", "scraped", "user_provided", "verified"]),
    missingFields: z.array(z.string()).default([]),
    confidenceScore: z.number().min(0).max(1),
  }),
})

export type Beer = z.infer<typeof BeerSchema>

async function fetchTasteTagsForBeer(
  title: string,
  breweryName: string | null
): Promise<string[]> {
  const beerDescription = breweryName ? `${title} by ${breweryName}` : title
  const result = await ollamaWebSearchStructured(
    `Search for the taste and flavor profile of the beer "${beerDescription}". Return exactly 6 short taste tags (1-2 words each) that best describe this beer's flavor. Use descriptive words like "bitter", "sød", "karamel", "kaffe", "frugtig", "citrus", "røget", "humle", "dank", "krydret", "blomster", "tropisk", "syrlig" etc. Tags can be in Danish or English. Return only taste/flavor tags, no style or brand names.`,
    BeerSchema,
    {
      model: Models.GEMMA4_26B,
      systemPrompt: `Du er en specialiseret øl-agent. Din opgave er at finde og strukturere detaljeret information om en given øl ved hjælp af websøgning.

Når du modtager et input med ølens navn og bryggeri, skal du:

Altid udføre en web search for at finde pålidelige og relevante kilder (fx bryggeriets hjemmeside, Untappd, RateBeer, BeerAdvocate eller lignende).
Indsamle så mange af følgende datapunkter som muligt:
Generel info: navn, bryggeri, land, stil, sub-stil
Tekniske data: ABV, IBU, EBC/farve
Beskrivelse og smagsnoter (aroma, smag, eftersmag, mundfølelse)
Ingredienser (hvis tilgængeligt)
Food pairings
Serveringsinfo (temperatur, glas)
Tags og anvendelseskontekst
Lignende øl (hvis muligt)
Hvis noget data ikke kan findes:
Sæt feltet til null eller udelad det
Tilføj feltet til dataQuality.missingFields
Vurder datakvaliteten:
Angiv source som en af: "scraped", "verified", "ai_generated"
Giv en confidenceScore mellem 0 og 1 baseret på hvor sikker du er
Generér en kort AI-beskrivelse:
Kort opsummering
Hvem vil kunne lide øllen
En anbefalingstekst

Output SKAL være et JSON-objekt i præcis denne struktur:`,
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
