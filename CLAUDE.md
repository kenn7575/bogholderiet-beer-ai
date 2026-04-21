# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server with Turbopack
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run format     # Prettier format all .ts/.tsx files
npm run typecheck  # TypeScript type check without emit
```

No test suite is configured.

## Architecture

This is a Next.js app that scrapes beer data from a WordPress REST API and stores it as JSON.

**Data flow:**
1. `app/page.tsx` (client component) — fetches paginated beer data from `https://bogholderiet.bar/wp-json/wp/v2/oel` (100 items/page), parses HTML content via regex to extract structured fields (brewery, country, style, ABV, size, price)
2. `app/actions.ts` (server action) — receives the parsed beer array and writes it to `beers.json` on disk
3. `beers.json` — output artifact with ~520 beer entries; shape: `{ id, name, brewery, country, style, abv, size_ml, price_dkk, url }`

**UI:** Single-page with a trigger button. Dark mode toggled with the `d` key (handled in `components/theme-provider.tsx`).

**Component system:** shadcn/ui with Tailwind CSS. Add components via `npx shadcn@latest add <component>`. Component config in `components.json` (style: radix-luma, icons: lucide-react). Path alias `@/*` maps to the project root.

## Code style

Prettier is configured (`.prettierrc`): 2-space indent, trailing commas, single quotes, Tailwind class sorting via `prettier-plugin-tailwindcss`.
