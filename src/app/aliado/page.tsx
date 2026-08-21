import Link from "next/link";
import { requireAlly } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD, getStockStatus, STOCK_STATUS_LABEL, STOCK_STATUS_CLASSES } from "@/lib/inventory";
import StatCard from "@/components/stat-card";
import UpcomingBanner from "@/components/upcoming-banner";

export default async function AllyDashboardPage() {
  const session = await requireAlly();

  const [ally, location, ledgerEntries] = await Promise.all([
    prisma.ally.findUniqueOrThrow({ where: { id: session.allyId } }),
    prisma.location.findUnique({
      where: { allyId: session.allyId },
      include: { inventoryItems: { include: { product: true } } },
    }),
    prisma.ledgerEntry.findMany({ where: { allyId: session.allyId } }),
  ]);

  const items = location?.inventoryItems ?? [];
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const outOfStock = items.filter((i) => getStockStatus(i.quantity, i.product.minStock) === "AGOTADO");
  const lowStock = items.filter((i) => getStockStatus(i.quantity, i.product.minStock) === "BAJO");
  const balance = ledgerEntries.reduce(
    (s, e) => s + (e.type === "PAYMENT" ? -e.amount : e.amount),
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-wears-black">Mi inventario</h2>
          <Link href="/aliado/ventas" className="text-sm text-wears-gold hover:underline">
            Registrar una venta
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Disponible</th>
                <th className="py-2 pr-4">Origen</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = getStockStatus(item.quantity, item.product.minStock);
                return (
                  <tr key={item.id} className="border-b border-wears-tan/10">
                    <td className="py-2 pr-4">{item.product.name}</td>
                    <td className="py-2 pr-4 font-medium">{item.quantity}</td>
                    <td className="py-2 pr-4 text-wears-espresso/70">
                      {item.acquisitionType === "CONSIGNMENT" ? "Consignación" : "Compra"}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${STOCK_STATUS_CLASSES[status]}`}
                      >
                        {STOCK_STATUS_LABEL[status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-wears-espresso/50">
                    Aún no tienes inventario asignado. Contacta a Wears.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
