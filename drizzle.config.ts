import { defineConfig } from 'drizzle-kit'

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: './.migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: 'postgresql://neondb_owner:dHPFoDcEif04@ep-young-grass-a5agy33i.us-east-2.aws.neon.tech/neondb?sslmode=require'
    }
})