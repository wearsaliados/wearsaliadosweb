import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD, getStockStatus, STOCK_STATUS_LABEL, STOCK_STATUS_CLASSES } from "@/lib/inventory";
import { toggleAllyActive } from "../actions";
import AssignStockForm from "./assign-stock-form";
import LedgerForm from "./ledger-form";

export default async function AllyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const ally = await prisma.ally.findUnique({
    where: { id },
    include: {
      user: true,
      location: { include: { inventoryItems: { include: { product: true } } } },
      sales: { include: { product: true }, orderBy: { saleDate: "desc" }, take: 30 },
      ledgerEntries: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!ally) notFound();

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const balance = ally.ledgerEntries.reduce(
    (s, e) => s + (e.type === "PAYMENT" ? -e.amount : e.amount),
    0
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-wears-black">{ally.businessName}</h1>
          <p className="text-sm text-wears-espresso/60">
            {ally.contactName} · {ally.user.email} {ally.phone && `· ${ally.phone}`}{" "}
            {ally.city && `· ${ally.city}`}
          </p>
        </div>
        <form action={toggleAllyActive.bind(null, ally.id, !ally.active)}>
          <button
            className={`rounded-full border px-4 py-1.5 text-sm ${
              ally.active
                ? "border-red-300 text-red-600 hover:bg-red-50"
                : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
            }`}
          >
            {ally.active ? "Desactivar aliado" : "Activar aliado"}
          </button>
        </form>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Asignar mercancía (compra o consignación)
        </h2>
        <AssignStockForm allyId={ally.id} products={products} />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Inventario actual</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Cantidad</th>
                <th className="py-2 pr-4">Origen</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ally.location?.inventoryItems.map((item) => {
                const status = getStockStatus(item.quantity, item.product.minStock);
                return (
                  <tr key={item.id} className="border-b border-wears-tan/10">
                    <td className="py-2 pr-4">{item.product.name}</td>
                    <td className="py-2 pr-4">{item.quantity}</td>
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
              {(!ally.location || ally.location.inventoryItems.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-wears-espresso/50">
                    Este aliado aún no tiene inventario asignado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-wears-black">Cuenta de consignación</h2>
          <p
            className={`text-lg font-semibold ${
              balance > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            Saldo: {formatUSD(balance)}
          </p>
        </div>
        <LedgerForm allyId={ally.id} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Descripción</th>
                <th className="py-2 pr-4">Monto</th>
              </tr>
            </thead>
            <tbody>
              {ally.ledgerEntries.map((e) => (
                <tr key={e.id} className="border-b border-wears-tan/10">
                  <td className="py-2 pr-4 text-wears-espresso/70">
                    {e.createdAt.toLocaleDateString("es-CO")}
                  </td>
                  <td className="py-2 pr-4">
                    {e.type === "PAYMENT"
                      ? "Pago"
                      : e.type === "CONSIGNMENT_CHARGE"
                        ? "Cargo consignación"
                        : "Ajuste"}
                  </td>
                  <td className="py-2 pr-4 text-wears-espresso/70">{e.description ?? "—"}</td>
                  <td
                    className={`py-2 pr-4 font-medium ${
                      e.type === "PAYMENT" ? "text-emerald-600" : "text-wears-black"
                    }`}
                  >
                    {e.type === "PAYMENT" ? "-" : "+"}
                    {formatUSD(e.amount)}
                  </td>
                </tr>
              ))}
              {ally.ledgerEntries.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-wears-espresso/50">
                    Sin movimientos de consignación.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Historial de ventas</h2>
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
              {ally.sales.map((s) => (
                <tr key={s.id} className="border-b border-wears-tan/10">
                  <td className="py-2 pr-4 text-wears-espresso/70">
                    {s.saleDate.toLocaleDateString("es-CO")}
                  </td>
                  <td className="py-2 pr-4">{s.product.name}</td>
                  <td className="py-2 pr-4">{s.quantity}</td>
                  <td className="py-2 pr-4">{formatUSD(s.quantity * s.unitPrice)}</td>
                </tr>
              ))}
              {ally.sales.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-wears-espresso/50">
                    Sin ventas registradas todavía.
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
