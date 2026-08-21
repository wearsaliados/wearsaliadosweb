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
