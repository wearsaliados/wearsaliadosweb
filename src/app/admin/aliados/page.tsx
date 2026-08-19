import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AllyForm from "./ally-form";

export default async function AliadosPage() {
  await requireAdmin();

  const allies = await prisma.ally.findMany({
    include: {
      user: true,
      location: { include: { inventoryItems: true } },
      sales: true,
      ledgerEntries: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Aliados comerciales
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Crea usuarios para tus aliados y gestiona su inventario individual.
        </p>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Nuevo aliado</h2>
        <AllyForm />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Aliados registrados ({allies.length})
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allies.map((a) => {
            const totalUnits = a.location?.inventoryItems.reduce(
              (s, i) => s + i.quantity,
              0
            ) ?? 0;
            const balance = a.ledgerEntries.reduce(
              (s, e) => s + (e.type === "PAYMENT" ? -e.amount : e.amount),
              0
            );
            return (
              <Link
                key={a.id}
                href={`/admin/aliados/${a.id}`}
                className="rounded-lg border border-wears-tan/30 p-4 transition hover:border-wears-gold hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <p className="font-medium text-wears-black">{a.businessName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      a.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {a.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="text-xs text-wears-espresso/60">{a.contactName}</p>
                <p className="text-xs text-wears-espresso/60">{a.user.email}</p>
                <div className="mt-3 flex justify-between text-xs text-wears-espresso/70">
                  <span>{totalUnits} unidades</span>
                  <span>{a.sales.length} ventas</span>
                  {balance > 0 && (
                    <span className="font-medium text-amber-600">
                      Debe ${balance.toLocaleString("es-CO")}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
          {allies.length === 0 && (
            <p className="text-sm text-wears-espresso/50">
              Aún no hay aliados registrados.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
