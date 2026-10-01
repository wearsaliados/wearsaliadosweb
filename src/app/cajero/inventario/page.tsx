import { requireCashier } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InventarioReadonly from "./inventario-readonly";
import ProductSearch from "@/components/product-search";

export default async function CajeroInventarioPage() {
  await requireCashier();

  const location = await prisma.location.findFirst({
    where: { type: "STORE" },
    include: { inventoryItems: { include: { product: { include: { collection: true } } } } },
    orderBy: { name: "asc" },
  });

  const items = (location?.inventoryItems ?? [])
    .filter((item) => item.product.active)
    .map((item) => ({
      id: item.id,
      name: item.product.name,
      size: item.product.size,
      quantity: item.quantity,
      minStock: item.product.minStock,
      collectionId: item.product.collectionId ?? "sin-coleccion",
      collectionName: item.product.collection?.name ?? "Otros productos",
    }));

  const searchRows = items.map((item) => ({
    productId: item.id,
    productName: item.name,
    collectionName: item.collectionName,
    locationName: location?.name ?? "Punto físico",
    quantity: item.quantity,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Inventario — {location?.name ?? "Punto físico"}
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Solo puedes consultar el stock disponible; para recibir o
          transferir mercancía, pídele al administrador.
        </p>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Buscar disponibilidad</h2>
        <ProductSearch rows={searchRows} />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <InventarioReadonly items={items} />
      </section>
    </div>
  );
}

