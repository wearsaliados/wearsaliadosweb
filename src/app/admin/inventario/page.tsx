import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStockStatus, STOCK_STATUS_LABEL, STOCK_STATUS_CLASSES } from "@/lib/inventory";
import MovementForm from "./movement-form";
import TransferForm from "./transfer-form";
import LocationForm from "./location-form";
import { setInventoryQuantity } from "./actions";
import DeleteItemButton from "./delete-item-button";

const LOCATION_TYPE_LABEL: Record<string, string> = {
  WEB: "Tienda en línea",
  STORE: "Punto físico",
  FACTORY: "Fábrica",
  ALLY: "Aliado comercial",
};

export default async function InventarioPage() {
  await requireAdmin();

  const [nonAllyLocations, products, allies] = await Promise.all([
    prisma.location.findMany({
      where: { type: { not: "ALLY" } },
      include: { inventoryItems: { include: { product: true } } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.ally.findMany({
      where: { active: true },
      include: { location: true },
      orderBy: { businessName: "asc" },
    }),
  ]);

  const allyOptions = allies
    .filter((a) => a.location)
    .map((a) => ({ id: a.id, locationId: a.location!.id, businessName: a.businessName }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Inventario de Wears (tienda, puntos físicos y fábrica)
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Aquí manejas el inventario que no pertenece a un aliado comercial —
          incluida la fábrica, para reponer stock. Para el inventario de cada
          aliado, entra a su ficha en{" "}
          <Link href="/admin/aliados" className="text-wears-gold hover:underline">
            Aliados comerciales
          </Link>
          .
        </p>
      </div>

      <section className="rounded-xl border border-wears-gold/40 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold text-wears-black">
          Transferir / dar salida a mercancía
        </h2>
        <p className="mb-3 text-xs text-wears-espresso/50">
          Cuando la fábrica entrega mercancía, elige a dónde va — a un aliado
          comercial, al punto físico o a la tienda en línea — así queda un
          registro claro del motivo de cada salida.
        </p>
        <TransferForm
          locations={nonAllyLocations.map((l) => ({ id: l.id, name: l.name }))}
          allies={allyOptions}
          products={products}
        />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Recibir mercancía nueva</h2>
        <p className="mb-3 text-xs text-wears-espresso/50">
          Para cuando entra mercancía nueva a un canal de Wears (por ejemplo,
          producción que llega a la fábrica).
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
        {nonAllyLocations.map((loc) => (
          <section
            key={loc.id}
            className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-wears-black">{loc.name}</h2>
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
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {loc.inventoryItems.filter((item) => item.product.active).map((item) => {
                    const status = getStockStatus(item.quantity, item.product.minStock);
                    return (
                      <tr key={item.id} className="border-b border-wears-tan/10">
                        <td className="py-2 pr-4">{item.product.name}</td>
                        <td className="py-2 pr-4">
                          <form
                            action={setInventoryQuantity.bind(null, item.id)}
                            className="flex items-center gap-1"
                          >
                            <input
                              type="number"
                              name="quantity"
                              defaultValue={item.quantity}
                              min={0}
                              className="w-16 rounded border border-wears-tan/30 px-2 py-1 text-xs"
                            />
                            <button className="text-xs text-wears-gold hover:underline">
                              Guardar
                            </button>
                          </form>
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${STOCK_STATUS_CLASSES[status]}`}
                          >
                            {STOCK_STATUS_LABEL[status]}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <DeleteItemButton
                            inventoryItemId={item.id}
                            productName={item.product.name}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {loc.inventoryItems.filter((item) => item.product.active).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-wears-espresso/50">
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
