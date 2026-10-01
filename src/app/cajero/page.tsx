import { requireCashier } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/inventory";
import SaleForm from "./sale-form";
import ReverseMovementAction from "./reverse-movement-action";

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  RECEIVE: "Entrada",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
  TRANSFER_IN: "Transferencia (entra)",
  TRANSFER_OUT: "Transferencia (sale)",
};

const MOVEMENT_TYPE_CLASSES: Record<string, string> = {
  RECEIVE: "bg-emerald-100 text-emerald-700",
  SALE: "bg-wears-gold/20 text-wears-espresso",
  ADJUSTMENT: "bg-gray-100 text-gray-600",
  TRANSFER_IN: "bg-blue-100 text-blue-700",
  TRANSFER_OUT: "bg-amber-100 text-amber-700",
};

export default async function CajeroPage() {
  const session = await requireCashier();

  const [locations, products, movements, directInventory, allies] = await Promise.all([
    prisma.location.findMany({
      where: { type: { in: ["WEB", "STORE"] } },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true },
      include: { collection: true },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryMovement.findMany({
      where: { inventoryItem: { location: { type: { in: ["WEB", "STORE"] } } } },
      include: { inventoryItem: { include: { product: true, location: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.inventoryItem.findMany({
      where: { location: { type: { in: ["WEB", "STORE"] } }, quantity: { gt: 0 } },
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    }),
    prisma.ally.findMany({
      where: { active: true },
      orderBy: { businessName: "asc" },
    }),
  ]);

  const defaultLocation =
    locations.find((l) => l.name.toLowerCase().includes("principal")) ??
    locations.find((l) => l.type === "STORE") ??
    locations[0];

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    size: p.size,
    collectionName: p.collection?.name ?? "Otros productos",
    price: p.price,
    barcode: p.barcode,
    description: p.description,
  }));

  const exchangeOptionsByLocation = new Map<
    string,
    { id: string; name: string; quantity: number }[]
  >();
  for (const item of directInventory) {
    const list = exchangeOptionsByLocation.get(item.locationId) ?? [];
    list.push({ id: item.productId, name: item.product.name, quantity: item.quantity });
    exchangeOptionsByLocation.set(item.locationId, list);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Registrar venta
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Ventas de la tienda en línea o el punto físico. Cuando termines el
          día, ve a &quot;Cerrar caja&quot; para enviar el reporte.
        </p>
      </div>

      <section className="rounded-xl border border-wears-gold/40 bg-white p-5 shadow-sm">
        <SaleForm
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          defaultLocationId={defaultLocation?.id ?? ""}
          products={productOptions}
          allies={allies.map((a) => ({ id: a.id, businessName: a.businessName }))}
        />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Historial de movimientos
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Ubicación</th>
                <th className="py-2 pr-4">Cantidad</th>
                <th className="py-2 pr-4">Nota</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const canReverse =
                  m.type === "SALE" && !m.reversedAt && m.createdByUserId === session.userId;
                return (
                  <tr key={m.id} className="border-b border-wears-tan/10">
                    <td className="py-2 pr-4 text-wears-espresso/70">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${MOVEMENT_TYPE_CLASSES[m.type]}`}
                      >
                        {MOVEMENT_TYPE_LABEL[m.type]}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{m.inventoryItem.product.name}</td>
                    <td className="py-2 pr-4 text-wears-espresso/70">
                      {m.inventoryItem.location.name}
                    </td>
                    <td
                      className={`py-2 pr-4 font-medium ${
                        m.quantityDelta > 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {m.quantityDelta > 0 ? "+" : ""}
                      {m.quantityDelta}
                    </td>
                    <td className="py-2 pr-4 text-wears-espresso/60">{m.note ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {canReverse && (
                        <ReverseMovementAction
                          movementId={m.id}
                          productName={m.inventoryItem.product.name}
                          exchangeOptions={
                            exchangeOptionsByLocation.get(m.inventoryItem.locationId) ?? []
                          }
                        />
                      )}
                      {m.type === "SALE" && m.reversedAt && (
                        <span className="text-xs text-wears-espresso/40">Reversada</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-wears-espresso/50">
                    Aún no hay movimientos registrados.
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
