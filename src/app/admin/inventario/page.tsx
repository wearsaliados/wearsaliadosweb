import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStockStatus, STOCK_STATUS_LABEL, STOCK_STATUS_CLASSES } from "@/lib/inventory";
import MovementForm from "./movement-form";
import LocationForm from "./location-form";

const LOCATION_TYPE_LABEL: Record<string, string> = {
  WEB: "Tienda en línea",
  STORE: "Punto físico",
  FACTORY: "Fábrica",
  ALLY: "Aliado comercial",
};

export default async function InventarioPage() {
  await requireAdmin();

  const [locations, products] = await Promise.all([
    prisma.location.findMany({
      include: { ally: true, inventoryItems: { include: { product: true } } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const nonAllyLocations = locations.filter((l) => l.type !== "ALLY");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Inventario general
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Tienda en línea, puntos físicos, fábrica y aliados comerciales, en un
          solo lugar.
        </p>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Nuevo movimiento (entradas / salidas / reposición)
        </h2>
        <p className="mb-3 text-xs text-wears-espresso/50">
          Para asignar mercancía a un aliado (compra o consignación), hazlo
          desde su ficha en “Aliados comerciales”.
        </p>
        <MovementForm
          locations={nonAllyLocations.map((l) => ({ id: l.id, name: l.name }))}
          products={products}
        />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Nueva ubicación</h2>
        <LocationForm />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {locations.map((loc) => (
          <section
            key={loc.id}
            className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-wears-black">
                {loc.ally?.businessName ?? loc.name}
              </h2>
              <span className="rounded-full bg-wears-sand px-2 py-0.5 text-xs text-wears-espresso/70">
                {LOCATION_TYPE_LABEL[loc.type]}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                    <th className="py-2 pr-4">Producto</th>
                    <th className="py-2 pr-4">Cantidad</th>
                    <th className="py-2 pr-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loc.inventoryItems.map((item) => {
                    const status = getStockStatus(item.quantity, item.product.minStock);
                    return (
                      <tr key={item.id} className="border-b border-wears-tan/10">
                        <td className="py-2 pr-4">{item.product.name}</td>
                        <td className="py-2 pr-4">{item.quantity}</td>
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
                  {loc.inventoryItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-center text-wears-espresso/50">
                        Sin existencias registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
