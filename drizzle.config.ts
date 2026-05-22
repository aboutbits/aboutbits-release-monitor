import { defineConfig } from 'drizzle-kit';
import { DB_SCHEMA } from '@db/schema.ts';

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    migrations: {
        schema: DB_SCHEMA,
    },
})
