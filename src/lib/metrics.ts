import "server-only";
import { prisma } from "@/lib/prisma";

export async function getAdminDashboardMetrics() {
  const [locations, sales, ledgerEntries, pendingSupportCount] = await Promise.all([
    prisma.location.findMany({
      include: {
        ally: true,
        inventoryItems: { include: { product: { include: { collection: true } } } },
      },
    }),
    prisma.sale.findMany({
      include: { product: true, ally: true },
      orderBy: { saleDate: "desc" },
    }),
    prisma.ledgerEntry.findMany({ include: { ally: true } }),
    prisma.supportRequest.count({ where: { status: "PENDIENTE" } }),
  ]);

  const inventoryByLocationType = { WEB: 0, STORE: 0, FACTORY: 0, ALLY: 0 };
  let totalUnits = 0;
  let totalConsignmentValue = 0;
  let totalConsignmentUnits = 0;
  const collectionStock = new Map<string, number>();
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
      inventoryByLocationType[loc.type] += item.quantity;
      totalUnits += item.quantity;

      if (item.acquisitionType === "CONSIGNMENT" && loc.type === "ALLY") {
        totalConsignmentValue += item.quantity * item.unitCost;
        totalConsignmentUnits += item.quantity;
      }

      const collectionName = item.product.collection?.name ?? "Sin colección";
      collectionStock.set(
        collectionName,
        (collectionStock.get(collectionName) ?? 0) + item.quantity
      );

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
        if (item.quantity === 0) {
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

  for (const sale of sales) {
    const allyEntry = salesByAlly.get(sale.allyId) ?? {
      name: sale.ally.businessName,
      units: 0,
      revenue: 0,
    };
    allyEntry.units += sale.quantity;
    allyEntry.revenue += sale.quantity * sale.unitPrice;
    salesByAlly.set(sale.allyId, allyEntry);

    const productEntry = salesByProduct.get(sale.productId) ?? {
      name: sale.product.name,
      units: 0,
    };
    productEntry.units += sale.quantity;
    salesByProduct.set(sale.productId, productEntry);
  }

  const alliesRanking = [...salesByAlly.values()].sort((a, b) => b.units - a.units);
  const productsRanking = [...salesByProduct.values()].sort((a, b) => b.units - a.units);

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
    totalUnits,
    totalConsignmentValue,
    totalConsignmentUnits,
    collectionStock: [...collectionStock.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity),
    restockNeeded,
    outOfStock,
    topAllies: alliesRanking.slice(0, 5),
    bottomAllies: [...alliesRanking].reverse().slice(0, 5),
    topProducts: productsRanking.slice(0, 5),
    bottomProducts: [...productsRanking].reverse().slice(0, 5),
    totalDebt,
    alliesWithDebt,
    pendingSupportCount,
    recentSales: sales.slice(0, 8),
    allyCount: locations.filter((l) => l.type === "ALLY").length,
  };
}
