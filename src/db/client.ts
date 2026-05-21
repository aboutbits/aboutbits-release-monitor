import { drizzle } from 'drizzle-orm/bun-sql'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

export const db = drizzle(process.env.DATABASE_URL)
