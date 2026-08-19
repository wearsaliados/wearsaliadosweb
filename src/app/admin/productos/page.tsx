import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCOP } from "@/lib/inventory";
import ProductForm from "./product-form";
import CollectionForm from "./collection-form";
import { toggleProductActive } from "./actions";

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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Colección</th>
                <th className="py-2 pr-4">Precio</th>
                <th className="py-2 pr-4">Costo</th>
                <th className="py-2 pr-4">Stock total</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const totalStock = p.inventoryItems.reduce((s, i) => s + i.quantity, 0);
                return (
                  <tr key={p.id} className="border-b border-wears-tan/10">
                    <td className="py-2 pr-4 font-mono text-xs">{p.sku}</td>
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className="py-2 pr-4 text-wears-espresso/70">
                      {p.collection?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4">{formatCOP(p.price)}</td>
                    <td className="py-2 pr-4">{formatCOP(p.cost)}</td>
                    <td className="py-2 pr-4">{totalStock}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          p.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <form action={toggleProductActive.bind(null, p.id, !p.active)}>
                        <button className="text-xs text-wears-gold hover:underline">
                          {p.active ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
