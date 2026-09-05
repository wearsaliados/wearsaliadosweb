export type StockStatus = "AGOTADO" | "BAJO" | "DISPONIBLE";

export function getStockStatus(quantity: number, minStock: number): StockStatus {
  if (quantity <= 0) return "AGOTADO";
  if (quantity <= minStock) return "BAJO";
  return "DISPONIBLE";
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  AGOTADO: "Agotado — falta reponer",
  BAJO: "Stock bajo",
  DISPONIBLE: "Disponible",
};

export const STOCK_STATUS_CLASSES: Record<StockStatus, string> = {
  AGOTADO: "bg-red-100 text-red-700 border-red-300",
  BAJO: "bg-amber-100 text-amber-700 border-amber-300",
  DISPONIBLE: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

export function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const VENEZUELA_TZ = "America/Caracas";

export function formatDateTime(date: Date) {
  return date.toLocaleString("es-VE", { timeZone: VENEZUELA_TZ });
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("es-VE", { timeZone: VENEZUELA_TZ });
}

// América/Caracas no tiene horario de verano, así que su offset es fijo (UTC-4).
const VENEZUELA_UTC_OFFSET_HOURS = 4;

function venezuelaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VENEZUELA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Medianoche de "hoy" según la hora de Venezuela, como instante UTC. */
export function startOfVenezuelaDay(date: Date = new Date()) {
  const { year, month, day } = venezuelaDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, VENEZUELA_UTC_OFFSET_HOURS, 0, 0));
}

/** Medianoche del día 1 del mes actual según la hora de Venezuela. */
export function startOfVenezuelaMonth(date: Date = new Date()) {
  const { year, month } = venezuelaDateParts(date);
  return new Date(Date.UTC(year, month - 1, 1, VENEZUELA_UTC_OFFSET_HOURS, 0, 0));
}

/** Medianoche del 1 de enero del año actual según la hora de Venezuela. */
export function startOfVenezuelaYear(date: Date = new Date()) {
  const { year } = venezuelaDateParts(date);
  return new Date(Date.UTC(year, 0, 1, VENEZUELA_UTC_OFFSET_HOURS, 0, 0));
}
