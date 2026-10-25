// Postgres de desarrollo: `docker compose -f docker-compose.dev.yml up -d` (puerto 5433).
export const urlBd = () =>
  process.env.DATABASE_URL ?? 'postgres://apuflow:apuflow@localhost:5433/apuflow';

export const urlBdPruebas = () =>
  process.env.DATABASE_URL_TEST ?? 'postgres://apuflow:apuflow@localhost:5433/apuflow_test';
