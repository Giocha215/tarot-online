/**
 * Conversión de zona horaria sin dependencias, usando Intl. La asesora define
 * sus horas en hora local de Portugal; el servidor las convierte a instantes
 * UTC (respetando el horario de verano) para guardar y comparar citas.
 */

export const ADVISOR_TIMEZONE = "Europe/Lisbon";

/** Offset (tz - UTC) en milisegundos que tiene `tz` en el instante `date`. */
function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUTC - date.getTime();
}

/**
 * Convierte una hora de pared (year/month/day/hour/minute interpretados en
 * `tz`) al instante UTC correspondiente.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string = ADVISOR_TIMEZONE,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = tzOffsetMs(tz, new Date(guess));
  return new Date(guess - offset);
}

/** Descompone un instante en sus partes de calendario dentro de `tz`. */
export function partsInTz(date: Date, tz: string = ADVISOR_TIMEZONE) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: weekdays[map.weekday as keyof typeof weekdays] ?? 0,
    minute: Number(map.hour) * 60 + Number(map.minute),
  };
}
