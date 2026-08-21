import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProductForm from "./product-form";
import CollectionForm from "./collection-form";
import ProductCatalog from "./product-catalog";

export default async function ProductosPage() {
  await requireAdmin();

  const [products, collections] = await Promise.all([
    prisma.product.findMany({
      include: { collection: true, inventoryItems: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.collection.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">Productos</h1>
        <p className="text-sm text-wears-espresso/60">
          Catálogo de productos y colecciones de la marca.
        </p>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Colecciones</h2>
        <CollectionForm />
        <ul className="mt-4 flex flex-wrap gap-2">
          {collections.map((c) => (
            <li
              key={c.id}
              className={`rounded-full border px-3 py-1 text-xs ${
                c.upcoming
                  ? "border-wears-gold bg-wears-gold/10 text-wears-espresso"
                  : "border-wears-tan/30 text-wears-espresso/70"
              }`}
            >
              {c.name} {c.upcoming && "· próxima"}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Nuevo producto</h2>
        <ProductForm collections={collections} />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Catálogo ({products.length})
        </h2>
        <ProductCatalog
          products={products.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            price: p.price,
            cost: p.cost,
            active: p.active,
            collectionName: p.collection?.name ?? "Sin colección",
            totalStock: p.inventoryItems.reduce((s, i) => s + i.quantity, 0),
          }))}
        />
      </section>
    </div>
  );
}
