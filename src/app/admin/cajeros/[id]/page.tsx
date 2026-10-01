import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD, formatDateTime, formatDate, venezuelaMonthKey, formatMonthKey } from "@/lib/inventory";
import { toggleCashierActive } from "../actions";
import CommissionForm from "./commission-form";
import MarkPaidForm from "./mark-paid-form";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  BOLIVARES: "Bolívares",
  USDT: "USDT",
  BANESCO_PANAMA: "Banesco Panamá",
};

export default async function CashierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const cashier = await prisma.cashier.findUnique({ where: { id }, include: { user: true } });
  if (!cashier) notFound();

  const [sales, closings, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { createdByUserId: cashier.userId },
      include: { product: true, location: true },
      orderBy: { saleDate: "desc" },
      take: 50,
    }),
    prisma.cashClosing.findMany({
      where: { cashierUserId: cashier.userId },
      orderBy: { closedAt: "desc" },
      take: 20,
    }),
    prisma.commissionPayment.findMany({ where: { cashierUserId: cashier.userId } }),
  ]);

  const paidByMonth = new Map(payments.map((p) => [p.month, p.amount]));
  const accruedByMonth = new Map<string, number>();
  for (const s of sales) {
    if (!s.commissionEligible) continue;
    const key = venezuelaMonthKey(s.saleDate);
    accruedByMonth.set(key, (accruedByMonth.get(key) ?? 0) + s.commissionAmount);
  }
  const months = [...new Set([...accruedByMonth.keys(), ...paidByMonth.keys()])].sort(
    (a, b) => b.localeCompare(a)
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-wears-black">{cashier.name}</h1>
          <p className="text-sm text-wears-espresso/60">{cashier.user.email}</p>
        </div>
        <form
          action={toggleCashierActive.bind(null, cashier.id, cashier.userId, !cashier.active)}
        >
          <button
            className={`rounded-full border px-4 py-1.5 text-sm ${
              cashier.active
                ? "border-red-300 text-red-600 hover:bg-red-50"
                : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
            }`}
          >
            {cashier.active ? "Desactivar cajero" : "Activar cajero"}
          </button>
        </form>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Comisión por venta</h2>
        <CommissionForm cashierId={cashier.id} commissionPerSale={cashier.commissionPerSale} />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Comisión mensual</h2>
        {months.length === 0 && (
          <p className="text-sm text-wears-espresso/50">
            Aún no hay ventas con comisión marcada.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {months.map((month) => {
            const accrued = accruedByMonth.get(month) ?? 0;
            const paid = paidByMonth.get(month);
            return (
              <div
                key={month}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-wears-tan/30 p-3"
              >
                <div>
                  <p className="font-medium text-wears-black capitalize">
                    {formatMonthKey(month)}
                  </p>
                  <p className="text-xs text-wears-espresso/60">
                    Comisión acumulada: {formatUSD(accrued)}
                  </p>
                </div>
                {paid !== undefined ? (
                  <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                    Pagada: {formatUSD(paid)}
                  </span>
                ) : (
                  <MarkPaidForm cashierId={cashier.id} month={month} amount={accrued} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Cierres de caja ({closings.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Ventas</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {closings.map((c) => (
                <tr key={c.id} className="border-b border-wears-tan/10">
                  <td className="py-2 pr-4 text-wears-espresso/70">
                    {formatDateTime(c.closedAt)}
                  </td>
                  <td className="py-2 pr-4">{c.saleCount}</td>
                  <td className="py-2 pr-4 text-emerald-600">{formatUSD(c.totalUSD)}</td>
                  <td className="py-2 pr-4">{formatUSD(c.commissionTotal)}</td>
                </tr>
              ))}
              {closings.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-wears-espresso/50">
                    Aún no ha cerrado caja.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Ventas recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Canal</th>
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Cantidad</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Pago</th>
                <th className="py-2 pr-4">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-wears-tan/10">
                  <td className="py-2 pr-4 text-wears-espresso/70">{formatDate(s.saleDate)}</td>
                  <td className="py-2 pr-4">{s.location.name}</td>
                  <td className="py-2 pr-4">{s.product.name}</td>
                  <td className="py-2 pr-4">{s.quantity}</td>
                  <td className="py-2 pr-4 text-emerald-600">
                    {formatUSD(s.quantity * s.unitPrice)}
                  </td>
                  <td className="py-2 pr-4 text-wears-espresso/70">
                    {s.paymentMethod ? PAYMENT_METHOD_LABEL[s.paymentMethod] : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {s.commissionEligible ? formatUSD(s.commissionAmount) : "—"}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-wears-espresso/50">
                    Aún no ha registrado ventas.
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
