import { defineConfig } from 'drizzle-kit';
import { urlBd } from './src/db/url';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/esquema.ts',
  out: './src/db/migraciones',
  dbCredentials: { url: urlBd() },
});
