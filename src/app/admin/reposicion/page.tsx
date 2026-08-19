import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStockStatus, STOCK_STATUS_LABEL, STOCK_STATUS_CLASSES } from "@/lib/inventory";

const LOCATION_TYPE_LABEL: Record<string, string> = {
  WEB: "Tienda en línea",
  STORE: "Punto físico",
  FACTORY: "Fábrica",
  ALLY: "Aliado comercial",
};

export default async function ReposicionPage() {
  await requireAdmin();

  const items = await prisma.inventoryItem.findMany({
    include: { product: true, location: { include: { ally: true } } },
    orderBy: { quantity: "asc" },
  });

  const needsRestock = items.filter(
    (i) => getStockStatus(i.quantity, i.product.minStock) !== "DISPONIBLE"
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Reposición de mercancía
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Productos agotados o en stock bajo en cualquier canal — tienda,
          puntos físicos, fábrica y aliados.
        </p>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Ubicación</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Disponible</th>
                <th className="py-2 pr-4">Mínimo</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {needsRestock.map((item) => {
                const status = getStockStatus(item.quantity, item.product.minStock);
                return (
                  <tr key={item.id} className="border-b border-wears-tan/10">
                    <td className="py-2 pr-4">{item.product.name}</td>
                    <td className="py-2 pr-4">
                      {item.location.ally?.businessName ?? item.location.name}
                    </td>
                    <td className="py-2 pr-4 text-wears-espresso/60">
                      {LOCATION_TYPE_LABEL[item.location.type]}
                    </td>
                    <td className="py-2 pr-4">{item.quantity}</td>
                    <td className="py-2 pr-4">{item.product.minStock}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${STOCK_STATUS_CLASSES[status]}`}
                      >
                        {STOCK_STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {item.location.ally && (
                        <Link
                          href={`/admin/aliados/${item.location.ally.id}`}
                          className="text-xs text-wears-gold hover:underline"
                        >
                          Ver aliado
                        </Link>
                      )}
                      {!item.location.ally && (
                        <Link
                          href="/admin/inventario"
                          className="text-xs text-wears-gold hover:underline"
                        >
                          Ir a inventario
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {needsRestock.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-wears-espresso/50">
                    Todo el inventario está en niveles saludables.
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
