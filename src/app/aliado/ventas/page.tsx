import { requireAlly } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/inventory";
import SaleForm from "./sale-form";

export default async function AllyVentasPage() {
  const session = await requireAlly();

  const [location, sales, allProfitSales] = await Promise.all([
    prisma.location.findUnique({
      where: { allyId: session.allyId },
      include: { inventoryItems: { include: { product: { include: { collection: true } } } } },
    }),
    prisma.sale.findMany({
      where: { allyId: session.allyId },
      include: { product: true },
      orderBy: { saleDate: "desc" },
      take: 50,
    }),
    prisma.sale.findMany({
      where: { allyId: session.allyId },
      select: { quantity: true, unitPrice: true, unitCost: true },
    }),
  ]);

  const items = (location?.inventoryItems ?? []).map((i) => ({
    productId: i.productId,
    name: i.product.name,
    size: i.product.size,
    quantity: i.quantity,
    price: i.product.price,
    collectionId: i.product.collectionId ?? "sin-coleccion",
    collectionName: i.product.collection?.name ?? "Otros productos",
  }));

  const totalProfit = allProfitSales.reduce(
    (sum, s) => sum + (s.unitPrice - s.unitCost) * s.quantity,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">Registrar venta</h1>
        <p className="text-sm text-wears-espresso/60">
          Cuéntanos qué vendiste para mantener tu inventario y reposición al día.
        </p>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <SaleForm items={items} />
      </section>

      <section className="flex flex-col items-center gap-1 rounded-2xl border border-wears-gold/40 bg-gradient-to-br from-wears-black to-wears-espresso p-6 text-center text-wears-cream shadow-sm">
        <p className="text-sm text-wears-sand/70">
          Rentabilidad obtenida por ser parte de esta tripulación
        </p>
        <p className="text-3xl font-semibold text-wears-gold">{formatUSD(totalProfit)}</p>
        <p className="mt-1 text-sm text-wears-sand/70">Gracias por navegar con Wears.</p>
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Mis ventas recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Cantidad</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-wears-tan/10">
                  <td className="py-2 pr-4 text-wears-espresso/70">
                    {s.saleDate.toLocaleString("es-CO")}
                  </td>
                  <td className="py-2 pr-4">{s.product.name}</td>
                  <td className="py-2 pr-4">{s.quantity}</td>
                  <td className="py-2 pr-4">{formatUSD(s.quantity * s.unitPrice)}</td>
                  <td className="py-2 pr-4 text-emerald-600">
                    {formatUSD((s.unitPrice - s.unitCost) * s.quantity)}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-wears-espresso/50">
                    Aún no has registrado ventas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
