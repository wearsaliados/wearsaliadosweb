import { requireAlly } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/inventory";

export default async function AllyCuentaPage() {
  const session = await requireAlly();

  const entries = await prisma.ledgerEntry.findMany({
    where: { allyId: session.allyId },
    orderBy: { createdAt: "desc" },
  });

  const balance = entries.reduce(
    (s, e) => s + (e.type === "PAYMENT" ? -e.amount : e.amount),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">Mi cuenta</h1>
        <p className="text-sm text-wears-espresso/60">
          Saldo de mercancía recibida a consignación con Wears.
        </p>
      </div>

      <section
        className={`rounded-xl border p-5 shadow-sm ${
          balance > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"
        }`}
      >
        <p className="text-xs uppercase tracking-wide text-wears-espresso/60">
          Saldo pendiente
        </p>
        <p
          className={`mt-1 text-3xl font-semibold ${
            balance > 0 ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          {formatUSD(Math.max(balance, 0))}
        </p>
        {balance <= 0 && (
          <p className="mt-1 text-sm text-emerald-700">Estás al día. ¡Gracias!</p>
        )}
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Movimientos</h2>
        <div className="overflow-x-auto">
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
              {entries.map((e) => (
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
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-wears-espresso/50">
                    No tienes mercancía a consignación registrada.
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
