import { requireAlly } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCOP } from "@/lib/inventory";
import SaleForm from "./sale-form";

export default async function AllyVentasPage() {
  const session = await requireAlly();

  const [location, sales] = await Promise.all([
    prisma.location.findUnique({
      where: { allyId: session.allyId },
      include: { inventoryItems: { include: { product: true } } },
    }),
    prisma.sale.findMany({
      where: { allyId: session.allyId },
      include: { product: true },
      orderBy: { saleDate: "desc" },
      take: 50,
    }),
  ]);

  const items = (location?.inventoryItems ?? []).map((i) => ({
    productId: i.productId,
    name: i.product.name,
    quantity: i.quantity,
    price: i.product.price,
  }));

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
                  <td className="py-2 pr-4">{formatCOP(s.quantity * s.unitPrice)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-wears-espresso/50">
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
