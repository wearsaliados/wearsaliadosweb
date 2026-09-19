import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CashierForm from "./cashier-form";

export default async function CajerosPage() {
  await requireAdmin();

  const cashiers = await prisma.cashier.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const saleCounts = await prisma.sale.groupBy({
    by: ["createdByUserId"],
    where: { createdByUserId: { in: cashiers.map((c) => c.userId) } },
    _count: { _all: true },
  });
  const saleCountByUser = new Map(saleCounts.map((s) => [s.createdByUserId, s._count._all]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">Cajeros</h1>
        <p className="text-sm text-wears-espresso/60">
          Usuarios que solo pueden registrar ventas en punto físico o tienda
          en línea, ver el inventario del punto físico y cerrar caja — sin
          acceso al resto del panel.
        </p>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Nuevo cajero</h2>
        <CashierForm />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Cajeros registrados ({cashiers.length})
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cashiers.map((c) => (
            <Link
              key={c.id}
              href={`/admin/cajeros/${c.id}`}
              className="rounded-lg border border-wears-tan/30 p-4 transition hover:border-wears-gold hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <p className="font-medium text-wears-black">{c.name}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    c.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {c.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="text-xs text-wears-espresso/60">{c.user.email}</p>
              <div className="mt-3 flex justify-between text-xs text-wears-espresso/70">
                <span>{saleCountByUser.get(c.userId) ?? 0} ventas</span>
                <span>Comisión: ${c.commissionPerSale.toFixed(2)} / venta</span>
              </div>
            </Link>
          ))}
          {cashiers.length === 0 && (
            <p className="text-sm text-wears-espresso/50">
              Aún no hay cajeros registrados.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
