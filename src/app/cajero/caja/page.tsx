import { requireCashier } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD, formatDateTime, venezuelaMonthKey, formatMonthKey } from "@/lib/inventory";
import CloseRegisterButton from "./close-register-button";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  BOLIVARES: "Bolívares",
  USDT: "USDT",
  BANESCO_PANAMA: "Banesco Panamá",
};

export default async function CajeroCajaPage() {
  const session = await requireCashier();

  const [pendingSales, closings, allSales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { createdByUserId: session.userId, cashClosingId: null },
      include: { product: true, location: true },
      orderBy: { saleDate: "asc" },
    }),
    prisma.cashClosing.findMany({
      where: { cashierUserId: session.userId },
      orderBy: { closedAt: "desc" },
      take: 20,
    }),
    prisma.sale.findMany({
      where: { createdByUserId: session.userId, commissionEligible: true },
      select: { saleDate: true, commissionAmount: true },
    }),
    prisma.commissionPayment.findMany({ where: { cashierUserId: session.userId } }),
  ]);

  const totalUSD = pendingSales.reduce((s, sale) => s + sale.quantity * sale.unitPrice, 0);
  const totalByMethod = new Map<string, { total: number; count: number }>();
  for (const sale of pendingSales) {
    const key = sale.paymentMethod ?? "EFECTIVO";
    const current = totalByMethod.get(key) ?? { total: 0, count: 0 };
    current.total += sale.quantity * sale.unitPrice;
    current.count += 1;
    totalByMethod.set(key, current);
  }

  const paidByMonth = new Map(payments.map((p) => [p.month, p.amount]));
  const accruedByMonth = new Map<string, number>();
  for (const s of allSales) {
    const key = venezuelaMonthKey(s.saleDate);
    accruedByMonth.set(key, (accruedByMonth.get(key) ?? 0) + s.commissionAmount);
  }
  const months = [...accruedByMonth.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">Cerrar caja</h1>
        <p className="text-sm text-wears-espresso/60">
          Al cerrar caja se envía un reporte con las ventas nuevas desde el
          último cierre al correo y WhatsApp del administrador. Puedes
          cerrar caja varias veces si hace falta.
        </p>
      </div>

      <section className="rounded-xl border border-wears-gold/40 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Ventas pendientes de cierre ({pendingSales.length})
        </h2>
        {pendingSales.length === 0 ? (
          <p className="text-sm text-wears-espresso/50">
            No hay ventas nuevas desde el último cierre.
          </p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-wears-tan/30 p-3">
                <p className="text-xs text-wears-espresso/60">Total</p>
                <p className="text-lg font-semibold text-emerald-600">{formatUSD(totalUSD)}</p>
              </div>
              {[...totalByMethod.entries()].map(([method, v]) => (
                <div key={method} className="rounded-lg border border-wears-tan/30 p-3">
                  <p className="text-xs text-wears-espresso/60">
                    {PAYMENT_METHOD_LABEL[method] ?? method}
                  </p>
                  <p className="text-lg font-semibold text-wears-black">{formatUSD(v.total)}</p>
                  <p className="text-xs text-wears-espresso/50">
                    {v.count} venta{v.count === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mb-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                    <th className="py-2 pr-4">Producto</th>
                    <th className="py-2 pr-4">Cantidad</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSales.map((s) => (
                    <tr key={s.id} className="border-b border-wears-tan/10">
                      <td className="py-2 pr-4">{s.product.name}</td>
                      <td className="py-2 pr-4">{s.quantity}</td>
                      <td className="py-2 pr-4 text-emerald-600">
                        {formatUSD(s.quantity * s.unitPrice)}
                      </td>
                      <td className="py-2 pr-4 text-wears-espresso/70">
                        {PAYMENT_METHOD_LABEL[s.paymentMethod ?? "EFECTIVO"]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <CloseRegisterButton pendingCount={pendingSales.length} />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Mi comisión</h2>
        {months.length === 0 && (
          <p className="text-sm text-wears-espresso/50">Aún no hay ventas con comisión marcada.</p>
        )}
        <div className="flex flex-col gap-2">
          {months.map((month) => {
            const accrued = accruedByMonth.get(month) ?? 0;
            const paid = paidByMonth.get(month);
            return (
              <div
                key={month}
                className="flex items-center justify-between rounded-lg border border-wears-tan/30 p-3 text-sm"
              >
                <span className="capitalize text-wears-black">{formatMonthKey(month)}</span>
                <span className="text-wears-espresso/70">{formatUSD(accrued)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    paid !== undefined
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {paid !== undefined ? `Pagada (${formatUSD(paid)})` : "Pendiente"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Cierres anteriores ({closings.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Ventas</th>
                <th className="py-2 pr-4">Total</th>
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
                </tr>
              ))}
              {closings.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-wears-espresso/50">
                    Aún no has cerrado caja.
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
