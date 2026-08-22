import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStockStatus, STOCK_STATUS_LABEL, STOCK_STATUS_CLASSES } from "@/lib/inventory";

export default async function ReposicionPage() {
  await requireAdmin();

  const items = await prisma.inventoryItem.findMany({
    include: { product: true, location: { include: { ally: true } } },
    orderBy: { quantity: "asc" },
  });

  const needsRestock = items.filter(
    (i) =>
      getStockStatus(i.quantity, i.product.minStock) !== "DISPONIBLE" &&
      i.location.type !== "FACTORY" &&
      i.product.active
  );

  const outOfStockCount = needsRestock.filter((i) => i.quantity === 0).length;
  const lowStockCount = needsRestock.length - outOfStockCount;

  const groups = Array.from(
    needsRestock.reduce((map, item) => {
      const key = item.location.id;
      if (!map.has(key)) {
        map.set(key, {
          locationId: item.location.id,
          locationName: item.location.ally?.businessName ?? item.location.name,
          allyId: item.location.ally?.id ?? null,
          items: [] as typeof needsRestock,
        });
      }
      map.get(key)!.items.push(item);
      return map;
    }, new Map<string, { locationId: string; locationName: string; allyId: string | null; items: typeof needsRestock }>())
  )
    .map(([, v]) => v)
    .sort((a, b) => b.items.length - a.items.length);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Reposición de mercancía
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Productos agotados o en stock bajo en tienda en línea, puntos
          físicos y aliados. La fábrica no aparece aquí porque es la que
          repone a los demás — mira su stock en{" "}
          <Link href="/admin/inventario" className="text-wears-gold hover:underline">
            Inventario
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-red-300 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-wide text-red-700">Agotados</p>
          <p className="mt-1 text-2xl font-semibold text-red-800">{outOfStockCount}</p>
        </div>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Stock bajo</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{lowStockCount}</p>
        </div>
        <div className="rounded-xl border border-wears-tan/30 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-wears-espresso/60">Ubicaciones afectadas</p>
          <p className="mt-1 text-2xl font-semibold text-wears-black">{groups.length}</p>
        </div>
      </div>

      {groups.length === 0 && (
        <section className="rounded-xl border border-wears-tan/30 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-wears-espresso/50">
            Todo el inventario está en niveles saludables.
          </p>
        </section>
      )}

      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <details
            key={g.locationId}
            className="rounded-xl border border-wears-tan/30 bg-white px-5 py-3 open:pb-5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between py-2">
              <span className="font-medium text-wears-black">
                {g.locationName}
                <span className="ml-2 text-xs font-normal text-wears-espresso/50">
                  ({g.items.length} producto{g.items.length === 1 ? "" : "s"})
                </span>
              </span>
              {g.allyId ? (
                <Link
                  href={`/admin/aliados/${g.allyId}`}
                  className="text-xs text-wears-gold hover:underline"
                >
                  Ver aliado
                </Link>
              ) : (
                <Link href="/admin/inventario" className="text-xs text-wears-gold hover:underline">
                  Ir a inventario
                </Link>
              )}
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                    <th className="py-2 pr-4">Producto</th>
                    <th className="py-2 pr-4">Disponible</th>
                    <th className="py-2 pr-4">Mínimo</th>
                    <th className="py-2 pr-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((item) => {
                    const status = getStockStatus(item.quantity, item.product.minStock);
                    return (
                      <tr key={item.id} className="border-b border-wears-tan/10">
                        <td className="py-2 pr-4">{item.product.name}</td>
                        <td className="py-2 pr-4">{item.quantity}</td>
                        <td className="py-2 pr-4">{item.product.minStock}</td>
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
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
