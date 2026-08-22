import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/inventory";

export default async function VentasPage() {
  await requireAdmin();

  const sales = await prisma.sale.findMany({
    where: { allyId: { not: null } },
    include: { product: true, ally: true },
    orderBy: { saleDate: "desc" },
    take: 200,
  });

  const totalWearsProfit = sales.reduce(
    (s, sale) => s + (sale.unitPrice - sale.unitCost) * sale.quantity,
    0
  );
  const totalUnits = sales.reduce((s, sale) => s + sale.quantity, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Ventas de aliados comerciales
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Registro de todas las ventas reportadas por los aliados ({sales.length}{" "}
          últimas · {totalUnits} unidades · {formatUSD(totalWearsProfit)} de
          ganancia para Wears — el resto del valor de venta es del aliado). Para
          ventas directas de la tienda en línea o el punto físico, mira{" "}
          <Link href="/admin/movimientos" className="text-wears-gold hover:underline">
            Movimientos
          </Link>
          .
        </p>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Aliado</th>
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Cantidad</th>
                <th className="py-2 pr-4">Precio unitario</th>
                <th className="py-2 pr-4">Total venta</th>
                <th className="py-2 pr-4">Ganancia Wears</th>
                <th className="py-2 pr-4">Nota</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-wears-tan/10">
                  <td className="py-2 pr-4 text-wears-espresso/70">
                    {s.saleDate.toLocaleString("es-CO")}
                  </td>
                  <td className="py-2 pr-4">{s.ally?.businessName}</td>
                  <td className="py-2 pr-4">{s.product.name}</td>
                  <td className="py-2 pr-4">{s.quantity}</td>
                  <td className="py-2 pr-4">{formatUSD(s.unitPrice)}</td>
                  <td className="py-2 pr-4 font-medium">
                    {formatUSD(s.quantity * s.unitPrice)}
                  </td>
                  <td className="py-2 pr-4 text-emerald-600">
                    {formatUSD((s.unitPrice - s.unitCost) * s.quantity)}
                  </td>
                  <td className="py-2 pr-4 text-wears-espresso/60">{s.note ?? "—"}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-wears-espresso/50">
                    Aún no hay ventas registradas.
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
