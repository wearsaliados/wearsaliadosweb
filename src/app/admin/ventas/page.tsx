import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD, formatDateTime } from "@/lib/inventory";
import StatCard from "@/components/stat-card";
import BarList from "@/components/bar-list";

export default async function VentasPage() {
  await requireAdmin();

  const [sales, ledgerEntries] = await Promise.all([
    prisma.sale.findMany({
      where: { allyId: { not: null } },
      include: { product: true, ally: true },
      orderBy: { saleDate: "desc" },
      take: 200,
    }),
    prisma.ledgerEntry.findMany({ include: { ally: true } }),
  ]);

  const totalWearsProfit = sales.reduce(
    (s, sale) => s + (sale.unitCost - sale.product.manufacturingCost) * sale.quantity,
    0
  );
  const totalUnits = sales.reduce((s, sale) => s + sale.quantity, 0);

  const debtByAlly = new Map<string, { name: string; balance: number }>();
  let totalPaid = 0;
  for (const entry of ledgerEntries) {
    if (entry.type === "PAYMENT") totalPaid += entry.amount;
    const current = debtByAlly.get(entry.allyId) ?? {
      name: entry.ally.businessName,
      balance: 0,
    };
    current.balance += entry.type === "PAYMENT" ? -entry.amount : entry.amount;
    debtByAlly.set(entry.allyId, current);
  }
  const totalDebt = [...debtByAlly.values()].reduce((s, a) => s + a.balance, 0);
  const alliesWithDebt = [...debtByAlly.values()]
    .filter((a) => a.balance > 0)
    .sort((a, b) => b.balance - a.balance);

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
          Para registrar un pago o ver la cuenta de un aliado, entra a su perfil
          en{" "}
          <Link href="/admin/aliados" className="text-wears-gold hover:underline">
            Aliados
          </Link>
          . Para ventas directas de la tienda en línea o el punto físico, mira{" "}
          <Link href="/admin/movimientos" className="text-wears-gold hover:underline">
            Movimientos
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Deuda total de aliados"
          value={formatUSD(totalDebt)}
          hint="Consignación pendiente de pago — se reduce al registrar un pago en la cuenta del aliado"
          tone={totalDebt > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Total pagado por aliados"
          value={formatUSD(totalPaid)}
          hint="Suma histórica de pagos registrados en la cuenta de consignación"
          tone="success"
        />
      </div>

      {alliesWithDebt.length > 0 && (
        <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-wears-black">Deuda por aliado</h2>
          <BarList
            items={alliesWithDebt.map((a) => ({ name: a.name, value: a.balance }))}
            colorClass="bg-amber-500"
            formatValue={(v) => formatUSD(v)}
          />
        </section>
      )}

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
                    {formatDateTime(s.saleDate)}
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
