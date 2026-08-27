import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/inventory";
import StatCard from "@/components/stat-card";
import CollectAction from "./collect-action";

export default async function VentasPage() {
  await requireAdmin();

  const sales = await prisma.sale.findMany({
    where: { allyId: { not: null } },
    include: { product: true, ally: true },
    orderBy: { saleDate: "desc" },
    take: 200,
  });

  const totalWearsProfit = sales.reduce(
    (s, sale) => s + (sale.unitCost - sale.product.manufacturingCost) * sale.quantity,
    0
  );
  const totalUnits = sales.reduce((s, sale) => s + sale.quantity, 0);
  const totalToCollect = sales.reduce(
    (s, sale) => s + (sale.collected ? 0 : sale.unitCost * sale.quantity),
    0
  );
  const totalCollected = sales.reduce(
    (s, sale) => s + (sale.collected ? sale.unitCost * sale.quantity : 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Ventas de aliados comerciales
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Registro de todas las ventas reportadas por los aliados ({sales.length}{" "}
          últimas · {totalUnits} unidades · {formatUSD(totalWearsProfit)} de
          ganancia para Wears — costo al aliado menos costo de fabricación).
          Para
          ventas directas de la tienda en línea o el punto físico, mira{" "}
          <Link href="/admin/movimientos" className="text-wears-gold hover:underline">
            Movimientos
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Por cobrar a aliados"
          value={formatUSD(totalToCollect)}
          hint="Costo de las unidades vendidas que aún no se han pagado a Wears"
          tone={totalToCollect > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Cobrado"
          value={formatUSD(totalCollected)}
          hint="Costo de las unidades vendidas ya pagadas a Wears"
          tone="success"
        />
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
                <th className="py-2 pr-4">Cobro</th>
                <th className="py-2 pr-4">Comprobante</th>
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
                    {formatUSD((s.unitCost - s.product.manufacturingCost) * s.quantity)}
                  </td>
                  <td className="py-2 pr-4">
                    <CollectAction
                      saleId={s.id}
                      allyName={s.ally?.businessName ?? "este aliado"}
                      collected={s.collected}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    {s.paymentProofUrl ? (
                      <a
                        href={s.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-wears-gold hover:underline"
                      >
                        Ver comprobante
                      </a>
                    ) : (
                      <span className="text-xs text-wears-espresso/40">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-wears-espresso/60">{s.note ?? "—"}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-4 text-center text-wears-espresso/50">
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
