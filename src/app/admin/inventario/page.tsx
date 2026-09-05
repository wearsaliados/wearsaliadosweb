import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MovementForm from "./movement-form";
import TransferForm from "./transfer-form";
import LocationForm from "./location-form";
import LocationInventoryBrowser from "./location-inventory-browser";

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
      include: { inventoryItems: { include: { product: { include: { collection: true } } } } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: { active: true },
      include: { collection: true },
      orderBy: { name: "asc" },
    }),
    prisma.ally.findMany({
      where: { active: true },
      include: { location: true },
      orderBy: { businessName: "asc" },
    }),
  ]);

  const allyOptions = allies
    .filter((a) => a.location)
    .map((a) => ({ id: a.id, locationId: a.location!.id, businessName: a.businessName }));

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    collectionName: p.collection?.name ?? "Otros productos",
  }));

  const receiveProductOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    size: p.size,
    collectionName: p.collection?.name ?? "Otros productos",
  }));

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
          products={productOptions}
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
          products={receiveProductOptions}
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
            <LocationInventoryBrowser
              items={loc.inventoryItems
                .filter((item) => item.product.active)
                .map((item) => ({
                  id: item.id,
                  name: item.product.name,
                  size: item.product.size,
                  quantity: item.quantity,
                  minStock: item.product.minStock,
                  collectionId: item.product.collectionId ?? "sin-coleccion",
                  collectionName: item.product.collection?.name ?? "Otros productos",
                }))}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
