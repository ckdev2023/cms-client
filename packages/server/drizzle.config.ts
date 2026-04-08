import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  throw new Error(
    "Missing DB_URL for Drizzle. Use packages/server/.env.example as a reference.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infra/db/drizzle/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: dbUrl,
  },
  strict: true,
  verbose: true,
});
