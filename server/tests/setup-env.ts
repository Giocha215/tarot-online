/**
 * Entorno de pruebas. Se ejecuta antes que cualquier test, así que
 * `config/env.ts` ya encuentra valores válidos al importarse.
 *
 * DATABASE_URL apunta a `TEST_DATABASE_URL` si existe; si no, a una BD local
 * llamada `tarot_test`. Nunca uses aquí la BD de producción: las pruebas de
 * integración borran filas.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "secreto-de-pruebas-suficientemente-largo-1234567890";
process.env.ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? "15m";
process.env.REFRESH_TOKEN_TTL_DAYS = process.env.REFRESH_TOKEN_TTL_DAYS ?? "30";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/tarot_test";
process.env.DATABASE_SSL = process.env.DATABASE_SSL ?? "false";
// Menos rondas: bcrypt con 12 haría la suite lenta sin aportar nada al test.
process.env.BCRYPT_ROUNDS = "10";
process.env.CORS_ORIGIN = "http://localhost:3000";
