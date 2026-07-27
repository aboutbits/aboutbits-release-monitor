import { drizzle } from 'drizzle-orm/bun-sql'
import { positiveInt, requiredString } from '@utils/env'

export const db = drizzle({
  connection: {
    url: requiredString('DATABASE_URL'),
    max: positiveInt('DATABASE_POOL_MAX', 10),
  },
})
