import { prisma } from './db'
import { fetchCountries, fetchBreweries, fetchCategories, fetchBeers } from './api'

export async function syncCountries(): Promise<number> {
  const data = await fetchCountries()
  await Promise.all(
    data.map((c) =>
      prisma.country.upsert({
        where: { id: c.id },
        create: { id: c.id, name: c.name, slug: c.slug, description: c.description, link: c.link, count: c.count },
        update: { name: c.name, slug: c.slug, description: c.description, link: c.link, count: c.count },
      }),
    ),
  )
  return data.length
}

export async function syncBreweries(): Promise<number> {
  const data = await fetchBreweries()
  await Promise.all(
    data.map((b) =>
      prisma.brewery.upsert({
        where: { id: b.id },
        create: { id: b.id, name: b.name, slug: b.slug, description: b.description, link: b.link, count: b.count },
        update: { name: b.name, slug: b.slug, description: b.description, link: b.link, count: b.count },
      }),
    ),
  )
  return data.length
}

export async function syncCategories(): Promise<number> {
  const data = await fetchCategories()
  await Promise.all(
    data.map((c) =>
      prisma.category.upsert({
        where: { id: c.id },
        create: { id: c.id, name: c.name, slug: c.slug, description: c.description, link: c.link, count: c.count },
        update: { name: c.name, slug: c.slug, description: c.description, link: c.link, count: c.count },
      }),
    ),
  )
  return data.length
}

export async function syncBeers(): Promise<number> {
  const data = await fetchBeers()
  for (const beer of data) {
    const beerId = parseInt(beer.id, 10)
    await prisma.beer.upsert({
      where: { id: beerId },
      create: {
        id: beerId,
        title: beer.title.rendered,
        slug: beer.slug,
        url: beer.link,
        breweryId: beer.beer_brewery[0] ?? null,
        countryId: beer.beer_country[0] ?? null,
      },
      update: {
        title: beer.title.rendered,
        slug: beer.slug,
        url: beer.link,
        breweryId: beer.beer_brewery[0] ?? null,
        countryId: beer.beer_country[0] ?? null,
      },
    })
    await prisma.beerCategory.deleteMany({ where: { beerId } })
    if (beer.categories.length > 0) {
      await prisma.beerCategory.createMany({
        data: beer.categories.map((categoryId) => ({ beerId, categoryId })),
        skipDuplicates: true,
      })
    }
  }
  return data.length
}

export async function syncAll(): Promise<{
  countries: number
  breweries: number
  categories: number
  beers: number
}> {
  const countries = await syncCountries()
  const breweries = await syncBreweries()
  const categories = await syncCategories()
  const beers = await syncBeers()
  return { countries, breweries, categories, beers }
}
