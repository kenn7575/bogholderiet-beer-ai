export interface BeerCategoryResponse {
  id: number
  count: number
  description: string
  link: string
  name: string
  slug: string
}

export interface BeerCountryResponse {
  id: number
  count: number
  description: string
  link: string
  name: string
  slug: string
}

export interface BeerResponse {
  id: string
  title: {
    rendered: string
  }
  slug: string
  link: string
  categories: number[]
  beer_brewery: number[]
  beer_country: number[]
}

export interface BeersWithInfo {
  title: string
  brewery: BeerCountryResponse | null
  country: BeerCountryResponse | null
  style: BeerCategoryResponse | null
  url: string
}
