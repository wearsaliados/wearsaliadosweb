import "server-only";
import { prisma } from "@/lib/prisma";
import { startOfVenezuelaDay, startOfVenezuelaMonth, startOfVenezuelaYear } from "@/lib/inventory";

export async function getAdminDashboardMetrics() {
  const [locations, sales, ledgerEntries, pendingSupportCount] = await Promise.all([
    prisma.location.findMany({
      include: {
        ally: true,
        inventoryItems: { include: { product: { include: { collection: true } } } },
      },
    }),
    prisma.sale.findMany({
      include: { product: true, ally: true, location: true },
      orderBy: { saleDate: "desc" },
    }),
    prisma.ledgerEntry.findMany({ include: { ally: true } }),
    prisma.supportRequest.count({ where: { status: "PENDIENTE" } }),
  ]);

  const inventoryByLocationType = { WEB: 0, STORE: 0, FACTORY: 0, ALLY: 0 };
  const inventoryValueByLocationType = { WEB: 0, STORE: 0, FACTORY: 0, ALLY: 0 };
  const inventoryManufacturingValueByLocationType = { WEB: 0, STORE: 0, FACTORY: 0, ALLY: 0 };
  const inventorySaleValueByLocationType = { WEB: 0, STORE: 0, FACTORY: 0, ALLY: 0 };
  let totalUnits = 0;
  let totalInventoryValue = 0;
  let totalConsignmentValue = 0;
  let totalConsignmentUnits = 0;
  const collectionStock = new Map<
    string,
    { quantity: number; value: number; manufacturingValue: number; saleValue: number }
  >();
  const restockNeeded: {
    locationName: string;
    locationType: string;
    productName: string;
    quantity: number;
    minStock: number;
  }[] = [];
  const outOfStock: {
    locationName: string;
    locationType: string;
    allyId: string | null;
    productName: string;
  }[] = [];

  for (const loc of locations) {
    for (const item of loc.inventoryItems) {
      const itemValue = item.quantity * item.unitCost;
      const itemManufacturingValue = item.quantity * item.product.manufacturingCost;
      const itemSaleValue = item.quantity * item.product.price;
      inventoryByLocationType[loc.type] += item.quantity;
      inventoryValueByLocationType[loc.type] += itemValue;
      inventoryManufacturingValueByLocationType[loc.type] += itemManufacturingValue;
      inventorySaleValueByLocationType[loc.type] += itemSaleValue;
      totalUnits += item.quantity;
      totalInventoryValue += itemValue;

      if (item.acquisitionType === "CONSIGNMENT" && loc.type === "ALLY") {
        totalConsignmentValue += itemValue;
        totalConsignmentUnits += item.quantity;
      }

      const collectionName = item.product.collection?.name ?? "Sin colección";
      const current = collectionStock.get(collectionName) ?? {
        quantity: 0,
        value: 0,
        manufacturingValue: 0,
        saleValue: 0,
      };
      current.quantity += item.quantity;
      current.value += itemValue;
      current.manufacturingValue += itemManufacturingValue;
      current.saleValue += itemSaleValue;
      collectionStock.set(collectionName, current);

      // La fábrica es la que repone a los demás canales, así que no
      // genera alertas de reposición sobre sí misma.
      if (loc.type !== "FACTORY" && item.product.active) {
        if (item.quantity <= item.product.minStock) {
          restockNeeded.push({
            locationName: loc.ally?.businessName ?? loc.name,
            locationType: loc.type,
            productName: item.product.name,
            quantity: item.quantity,
            minStock: item.product.minStock,
          });
        }
        if (item.quantity === 0 && loc.type !== "WEB") {
          outOfStock.push({
            locationName: loc.ally?.businessName ?? loc.name,
            locationType: loc.type,
            allyId: loc.allyId,
            productName: item.product.name,
          });
        }
      }
    }
  }

  const salesByAlly = new Map<string, { name: string; units: number; revenue: number }>();
  const salesByProduct = new Map<string, { name: string; units: number }>();
  const directSales = { WEB: { units: 0, revenue: 0 }, STORE: { units: 0, revenue: 0 } };
  const allySales = { units: 0, revenue: 0 };

  for (const sale of sales) {
    if (sale.ally) {
      const allyEntry = salesByAlly.get(sale.allyId!) ?? {
        name: sale.ally.businessName,
        units: 0,
        revenue: 0,
      };
      allyEntry.units += sale.quantity;
      allyEntry.revenue += sale.quantity * sale.unitPrice;
      salesByAlly.set(sale.allyId!, allyEntry);
      allySales.units += sale.quantity;
      allySales.revenue += sale.quantity * sale.unitPrice;
    } else if (sale.location.type === "WEB" || sale.location.type === "STORE") {
      directSales[sale.location.type].units += sale.quantity;
      directSales[sale.location.type].revenue += sale.quantity * sale.unitPrice;
    }

    const productEntry = salesByProduct.get(sale.productId) ?? {
      name: sale.product.name,
      units: 0,
    };
    productEntry.units += sale.quantity;
    salesByProduct.set(sale.productId, productEntry);
  }

  const alliesRanking = [...salesByAlly.values()].sort((a, b) => b.units - a.units);
  const productsRanking = [...salesByProduct.values()].sort((a, b) => b.units - a.units);

  // Rentabilidad: ganancia real de Wears por canal, siempre sobre lo que
  // Wears realmente recibe por unidad menos su costo de fabricación.
  // Directo (web/física): precio de venta − fabricación.
  // Aliados: costo al que se le entregó al aliado (ya cobrado por
  // consignación) − fabricación — el margen propio del aliado no es de Wears.
  // Agrupado por día, mes y año.
  const startOfDay = startOfVenezuelaDay();
  const startOfMonth = startOfVenezuelaMonth();
  const startOfYear = startOfVenezuelaYear();

  function emptyProfitBucket() {
    return { web: 0, store: 0, ally: 0, total: 0 };
  }
  const profitability = {
    daily: emptyProfitBucket(),
    monthly: emptyProfitBucket(),
    annual: emptyProfitBucket(),
  };
  // Ventas totales de Wears: precio final de cada venta (aliados incluye
  // el margen propio del aliado), sin restar nada — es lo que factura Wears.
  const revenueTotals = {
    daily: emptyProfitBucket(),
    monthly: emptyProfitBucket(),
    annual: emptyProfitBucket(),
  };

  for (const sale of sales) {
    const profit = sale.ally
      ? (sale.unitCost - sale.product.manufacturingCost) * sale.quantity
      : (sale.unitPrice - sale.product.manufacturingCost) * sale.quantity;
    const revenue = sale.quantity * sale.unitPrice;
    const channel: "web" | "store" | "ally" | null = sale.ally
      ? "ally"
      : sale.location.type === "WEB"
        ? "web"
        : sale.location.type === "STORE"
          ? "store"
          : null;
    if (!channel) continue;

    const applyTo = (
      bucket: { web: number; store: number; ally: number; total: number },
      value: number
    ) => {
      bucket[channel] += value;
      bucket.total += value;
    };
    if (sale.saleDate >= startOfDay) {
      applyTo(profitability.daily, profit);
      applyTo(revenueTotals.daily, revenue);
    }
    if (sale.saleDate >= startOfMonth) {
      applyTo(profitability.monthly, profit);
      applyTo(revenueTotals.monthly, revenue);
    }
    if (sale.saleDate >= startOfYear) {
      applyTo(profitability.annual, profit);
      applyTo(revenueTotals.annual, revenue);
    }
  }

  // Cobro de ventas de aliados: lo que Wears aún debe cobrarle al aliado
  // por unidades ya vendidas (costo al aliado x cantidad), marcado
  // manualmente por el admin al recibir el pago.
  let totalToCollect = 0;
  let totalCollected = 0;
  for (const sale of sales) {
    if (!sale.ally) continue;
    const amount = sale.unitCost * sale.quantity;
    if (sale.collected) totalCollected += amount;
    else totalToCollect += amount;
  }

  const debtByAlly = new Map<string, { name: string; balance: number }>();
  for (const entry of ledgerEntries) {
    const current = debtByAlly.get(entry.allyId) ?? {
      name: entry.ally.businessName,
      balance: 0,
    };
    const sign = entry.type === "PAYMENT" ? -1 : 1;
    current.balance += sign * entry.amount;
    debtByAlly.set(entry.allyId, current);
  }
  const totalDebt = [...debtByAlly.values()].reduce((sum, a) => sum + a.balance, 0);
  const alliesWithDebt = [...debtByAlly.values()]
    .filter((a) => a.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  return {
    inventoryByLocationType,
    inventoryValueByLocationType,
    inventoryManufacturingValueByLocationType,
    inventorySaleValueByLocationType,
    totalUnits,
    totalInventoryValue,
    totalConsignmentValue,
    totalConsignmentUnits,
    collectionStock: [...collectionStock.entries()]
      .map(([name, v]) => ({
        name,
        quantity: v.quantity,
        value: v.value,
        manufacturingValue: v.manufacturingValue,
        saleValue: v.saleValue,
      }))
      .sort((a, b) => b.quantity - a.quantity),
    restockNeeded,
    outOfStock,
    topAllies: alliesRanking.slice(0, 5),
    bottomAllies: [...alliesRanking].reverse().slice(0, 5),
    topProducts: productsRanking.slice(0, 5),
    bottomProducts: [...productsRanking].reverse().slice(0, 5),
    totalDebt,
    alliesWithDebt,
    totalToCollect,
    totalCollected,
    directSales,
    allySales,
    profitability,
    revenueTotals,
    pendingSupportCount,
    recentSales: sales.slice(0, 8),
    allyCount: locations.filter((l) => l.type === "ALLY").length,
  };
}
