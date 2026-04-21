import axios from 'axios'
import type { BeerCategoryResponse, BeerCountryResponse, BeerResponse } from './types'

const BASE = 'https://bogholderiet.bar/wp-json/wp/v2'

async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const first = await axios.get<T[]>(`${BASE}/${endpoint}`, {
    params: { per_page: 100, page: 1 },
  })
  const totalPages = Number(first.headers['x-wp-totalpages'] ?? '1')
  const results: T[] = [...first.data]

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        axios.get<T[]>(`${BASE}/${endpoint}`, {
          params: { per_page: 100, page: i + 2 },
        }),
      ),
    )
    for (const res of rest) results.push(...res.data)
  }

  return results
}

export const fetchCountries = () => fetchAllPages<BeerCountryResponse>('beer_country')
export const fetchBreweries = () => fetchAllPages<BeerCountryResponse>('beer_brewery')
export const fetchCategories = () => fetchAllPages<BeerCategoryResponse>('categories')
export const fetchBeers = () => fetchAllPages<BeerResponse>('oel')
