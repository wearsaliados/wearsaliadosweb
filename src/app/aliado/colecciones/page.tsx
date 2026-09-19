import Image from "next/image";
import { requireAlly } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestPreorder } from "../soporte/actions";

export default async function AllyColeccionesPage() {
  const session = await requireAlly();

  const [upcoming, location] = await Promise.all([
    prisma.collection.findMany({
      where: { upcoming: true, visibleToAllies: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.location.findUnique({
      where: { allyId: session.allyId },
      include: {
        inventoryItems: {
          where: { quantity: { gt: 0 } },
          include: { product: { include: { collection: true } } },
        },
      },
    }),
  ]);

  // Solo colecciones vigentes que el aliado realmente tiene en inventario.
  const stockByCollection = new Map<string, { id: string; name: string; count: number }>();
  for (const item of location?.inventoryItems ?? []) {
    const c = item.product.collection;
    if (!c || c.upcoming || !c.visibleToAllies) continue;
    const entry = stockByCollection.get(c.id) ?? { id: c.id, name: c.name, count: 0 };
    entry.count += 1;
    stockByCollection.set(c.id, entry);
  }
  const active = [...stockByCollection.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Próximas colecciones
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Adelántate: así puedes preparar tu vitrina y tu inventario para lo
          próximo de El Barco Wears.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {upcoming.map((c) => (
          <div
            key={c.id}
            className="overflow-hidden rounded-xl border border-wears-gold/40 bg-gradient-to-br from-wears-black to-wears-espresso text-wears-cream shadow-sm"
          >
            {c.imageUrl && (
              <div className="relative aspect-square w-full">
                <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="600px" />
              </div>
            )}
            <div className="p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-wears-gold">
                Próximamente
              </p>
              <h2 className="mt-2 text-xl font-semibold">{c.name}</h2>
              <form action={requestPreorder.bind(null, c.id)} className="mt-4">
                <button
                  type="submit"
                  className="rounded-full bg-wears-gold px-5 py-2 text-sm font-medium text-wears-black transition hover:bg-wears-tan"
                >
                  Selecciona para pedir con antelación, nos comunicaremos contigo
                </button>
              </form>
            </div>
          </div>
        ))}
        {upcoming.length === 0 && (
          <p className="text-sm text-wears-espresso/50">
            No hay anuncios de próximas colecciones por ahora.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-wears-black">Colecciones vigentes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-wears-tan/30 bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-wears-black">{c.name}</p>
              <p className="text-xs text-wears-espresso/60">
                {c.count} {c.count === 1 ? "modelo disponible" : "modelos disponibles"} en tu
                inventario
              </p>
            </div>
          ))}
          {active.length === 0 && (
            <p className="text-sm text-wears-espresso/50">
              Aún no tienes colecciones vigentes en tu inventario.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
