import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/inventory";
import DirectSaleForm from "./direct-sale-form";
import GiveawayForm from "./giveaway-form";
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

export default async function MovimientosPage() {
  await requireAdmin();

  const [directLocations, giveawayLocations, products, directSales, movements, directInventory] =
    await Promise.all([
      prisma.location.findMany({
        where: { type: { in: ["WEB", "STORE"] } },
        orderBy: { name: "asc" },
      }),
      prisma.location.findMany({
        where: { type: { not: "ALLY" } },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { active: true },
        include: { collection: true },
        orderBy: { name: "asc" },
      }),
      prisma.sale.findMany({
        where: { allyId: null },
        include: { product: true, location: true },
        orderBy: { saleDate: "desc" },
        take: 30,
      }),
      prisma.inventoryMovement.findMany({
        include: { inventoryItem: { include: { product: true, location: { include: { ally: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.inventoryItem.findMany({
        where: { location: { type: { in: ["WEB", "STORE"] } }, quantity: { gt: 0 } },
        include: { product: true },
        orderBy: { product: { name: "asc" } },
      }),
    ]);

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    collectionName: p.collection?.name ?? "Otros productos",
  }));

  // Opciones de intercambio (para "cambio de talla" al reversar una venta),
  // agrupadas por ubicación.
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
        <h1 className="text-2xl font-semibold text-wears-black">Movimientos</h1>
        <p className="text-sm text-wears-espresso/60">
          Registra ventas directas de la tienda en línea o el punto físico, y
          revisa el historial de todo lo que entra, sale o se transfiere en
          el inventario de Wears.
        </p>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold text-wears-black">
          Registrar venta directa (tienda web o punto físico)
        </h2>
        <p className="mb-3 text-xs text-wears-espresso/50">
          Para ventas de aliados, se registran desde el panel de cada aliado —
          esto es solo para ventas directas de los canales propios de Wears.
        </p>
        <DirectSaleForm
          locations={directLocations.map((l) => ({ id: l.id, name: l.name }))}
          products={productOptions}
        />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold text-wears-black">
          Registrar entrega por publicidad o embajadores de marca
        </h2>
        <p className="mb-3 text-xs text-wears-espresso/50">
          Para productos que se entregan sin cobrar, como inversión de
          publicidad o regalos a embajadores de marca. Solo descuenta
          inventario, no genera ingreso.
        </p>
        <GiveawayForm
          locations={giveawayLocations.map((l) => ({ id: l.id, name: l.name }))}
          products={productOptions}
        />
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Ventas directas recientes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Canal</th>
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Cantidad</th>
                <th className="py-2 pr-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {directSales.map((s) => (
                <tr key={s.id} className="border-b border-wears-tan/10">
                  <td className="py-2 pr-4 text-wears-espresso/70">
                    {s.saleDate.toLocaleString("es-CO")}
                  </td>
                  <td className="py-2 pr-4">{s.location.name}</td>
                  <td className="py-2 pr-4">{s.product.name}</td>
                  <td className="py-2 pr-4">{s.quantity}</td>
                  <td className="py-2 pr-4 text-emerald-600">
                    {formatUSD(s.quantity * s.unitPrice)}
                  </td>
                </tr>
              ))}
              {directSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-wears-espresso/50">
                    Aún no hay ventas directas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Historial de movimientos de inventario
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
                  m.type === "SALE" &&
                  m.inventoryItem.location.type !== "ALLY" &&
                  !m.reversedAt;
                return (
                  <tr key={m.id} className="border-b border-wears-tan/10">
                    <td className="py-2 pr-4 text-wears-espresso/70">
                      {m.createdAt.toLocaleString("es-CO")}
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
                      {m.inventoryItem.location.ally?.businessName ?? m.inventoryItem.location.name}
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
