import Link from "next/link";
import { requireAlly } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD, getStockStatus } from "@/lib/inventory";
import StatCard from "@/components/stat-card";
import UpcomingBanner from "@/components/upcoming-banner";
import InventoryBrowser from "@/components/inventory-browser";

export default async function AllyDashboardPage() {
  const session = await requireAlly();

  const [ally, location, ledgerEntries, profitSales] = await Promise.all([
    prisma.ally.findUniqueOrThrow({ where: { id: session.allyId } }),
    prisma.location.findUnique({
      where: { allyId: session.allyId },
      include: { inventoryItems: { include: { product: { include: { collection: true } } } } },
    }),
    prisma.ledgerEntry.findMany({ where: { allyId: session.allyId } }),
    prisma.sale.findMany({
      where: { allyId: session.allyId },
      select: { quantity: true, unitPrice: true, unitCost: true },
    }),
  ]);

  const items = location?.inventoryItems ?? [];
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const outOfStock = items.filter((i) => getStockStatus(i.quantity, i.product.minStock) === "AGOTADO");
  const lowStock = items.filter((i) => getStockStatus(i.quantity, i.product.minStock) === "BAJO");
  const balance = ledgerEntries.reduce(
    (s, e) => s + (e.type === "PAYMENT" ? -e.amount : e.amount),
    0
  );
  const totalProfit = profitSales.reduce(
    (sum, s) => sum + (s.unitPrice - s.unitCost) * s.quantity,
    0
  );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const salesThisMonth = await prisma.sale.aggregate({
    where: { allyId: session.allyId, saleDate: { gte: startOfMonth } },
    _sum: { quantity: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <UpcomingBanner />

      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Hola, {ally.contactName}
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Este es el inventario que {ally.businessName} tiene disponible con Wears.
        </p>
      </div>

      <Link
        href="/aliado/ventas"
        className="group flex flex-col items-start gap-2 rounded-2xl border-2 border-wears-gold bg-gradient-to-br from-wears-gold to-wears-tan p-6 shadow-md transition hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-wears-black/70">
            Lo más importante
          </p>
          <p className="text-xl font-bold text-wears-black">Registrar una venta</p>
          <p className="mt-1 text-sm text-wears-black/70">
            Anota lo que vendiste para reponer tu inventario y llevar tu control.
          </p>
        </div>
        <span className="rounded-full bg-wears-black px-6 py-3 text-sm font-semibold text-wears-cream transition group-hover:bg-wears-espresso">
          Registrar venta →
        </span>
      </Link>

      {outOfStock.length > 0 && (
        <section className="rounded-xl border-2 border-red-400 bg-red-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-red-800">
              🔴 {outOfStock.length} producto{outOfStock.length === 1 ? "" : "s"} agotado
              {outOfStock.length === 1 ? "" : "s"}
            </h2>
            <Link href="/aliado/soporte" className="text-sm text-red-700 hover:underline">
              Solicitar reposición
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {outOfStock.map((item) => (
              <li key={item.id} className="rounded-lg border border-red-300 bg-white px-3 py-2">
                <p className="font-medium text-wears-black">{item.product.name}</p>
                <p className="text-xs text-red-700">0 disponibles</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Unidades disponibles" value={totalUnits.toString()} />
        <StatCard
          label="Vendidas este mes"
          value={(salesThisMonth._sum.quantity ?? 0).toString()}
        />
        <StatCard
          label="Productos agotados"
          value={outOfStock.length.toString()}
          tone={outOfStock.length > 0 ? "critical" : "default"}
        />
        {balance > 0 ? (
          <StatCard
            label="Saldo a consignación"
            value={formatUSD(balance)}
            tone="warning"
          />
        ) : (
          <StatCard label="Productos en stock bajo" value={lowStock.length.toString()} tone={lowStock.length > 0 ? "warning" : "default"} />
        )}
        <StatCard
          label="Rentabilidad"
          value={formatUSD(totalProfit)}
          hint="Lo que has ganado con Wears"
          tone="success"
        />
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-wears-black">Mi inventario</h2>
        </div>
        <InventoryBrowser
          items={items.map((item) => ({
            id: item.id,
            name: item.product.name,
            size: item.product.size,
            quantity: item.quantity,
            minStock: item.product.minStock,
            acquisitionType: item.acquisitionType,
            collectionId: item.product.collectionId ?? "sin-coleccion",
            collectionName: item.product.collection?.name ?? "Otros productos",
            collectionImageUrl: item.product.collection?.imageUrl ?? null,
          }))}
        />
      </section>

      <section className="flex flex-col items-start gap-4 rounded-2xl border border-wears-gold/40 bg-gradient-to-br from-wears-black to-wears-espresso p-6 text-wears-cream shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold">Te ayudamos a vender</p>
          <p className="mt-1 text-sm text-wears-sand/70">
            Activaciones de marca para tu punto de venta, o soporte si tienes
            un problema con tu producto Wears.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/aliado/soporte"
            className="rounded-full bg-wears-gold px-5 py-2.5 text-sm font-medium text-wears-black transition hover:bg-wears-tan"
          >
            Solicita tu activación de marca
          </Link>
          <Link
            href="/aliado/soporte"
            className="rounded-full border border-wears-cream/40 px-5 py-2.5 text-sm font-medium text-wears-cream transition hover:border-wears-gold hover:text-wears-gold"
          >
            Contáctanos
          </Link>
        </div>
      </section>
    </div>
  );
}
