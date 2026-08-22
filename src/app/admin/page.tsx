import Link from "next/link";
import { getAdminDashboardMetrics } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/inventory";
import StatCard from "@/components/stat-card";
import BarList from "@/components/bar-list";
import ProductSearch from "@/components/product-search";

export default async function AdminDashboardPage() {
  const [m, inventoryItems] = await Promise.all([
    getAdminDashboardMetrics(),
    prisma.inventoryItem.findMany({
      where: { product: { active: true } },
      include: {
        product: { include: { collection: true } },
        location: { include: { ally: true } },
      },
    }),
  ]);

  const searchRows = inventoryItems.map((item) => ({
    productId: item.productId,
    productName: item.product.name,
    collectionName: item.product.collection?.name ?? "Otros productos",
    locationName: item.location.ally?.businessName ?? item.location.name,
    quantity: item.quantity,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Panel general — El Barco Wears
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Lectura general de inventarios y movimientos de todos los canales.
        </p>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Buscar disponibilidad de un producto
        </h2>
        <ProductSearch rows={searchRows} />
      </section>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total unidades"
          value={m.totalUnits.toString()}
          hint={`${formatUSD(m.totalInventoryValue)} a costo`}
        />
        <StatCard
          label="En tienda en línea"
          value={m.inventoryByLocationType.WEB.toString()}
          hint={`${formatUSD(m.inventoryValueByLocationType.WEB)} a costo`}
        />
        <StatCard
          label="En puntos físicos"
          value={m.inventoryByLocationType.STORE.toString()}
          hint={`${formatUSD(m.inventoryValueByLocationType.STORE)} a costo`}
        />
        <StatCard
          label="En fábrica (reposición)"
          value={m.inventoryByLocationType.FACTORY.toString()}
          hint={`${formatUSD(m.inventoryValueByLocationType.FACTORY)} a costo`}
        />
        <StatCard
          label="En aliados comerciales"
          value={m.inventoryByLocationType.ALLY.toString()}
          hint={`${formatUSD(m.inventoryValueByLocationType.ALLY)} a costo`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Valor en consignación"
          value={formatUSD(m.totalConsignmentValue)}
          hint={`${m.totalConsignmentUnits} unidades entregadas a consignación`}
        />
        <StatCard
          label="Deuda total de aliados"
          value={formatUSD(m.totalDebt)}
          tone={m.totalDebt > 0 ? "warning" : "default"}
          hint="Consignación pendiente de pago"
        />
        <StatCard
          label="Productos por reponer"
          value={m.outOfStock.length.toString()}
          tone={m.outOfStock.length > 0 ? "critical" : "default"}
          hint="Agotados en tienda, puntos físicos y aliados"
        />
        <StatCard
          label="Solicitudes de soporte pendientes"
          value={m.pendingSupportCount.toString()}
          tone={m.pendingSupportCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Ventas en tienda web"
          value={formatUSD(m.directSales.WEB.revenue)}
          hint={`${m.directSales.WEB.units} unidades vendidas`}
        />
        <StatCard
          label="Ventas en tienda física"
          value={formatUSD(m.directSales.STORE.revenue)}
          hint={`${m.directSales.STORE.units} unidades vendidas`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-wears-black">
            Aliados que más venden
          </h2>
          <BarList
            items={m.topAllies.map((a) => ({ name: a.name, value: a.units }))}
            formatValue={(v) => `${v} und.`}
          />
        </section>
        <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-wears-black">
            Aliados con menor venta
          </h2>
          <BarList
            items={m.bottomAllies.map((a) => ({ name: a.name, value: a.units }))}
            colorClass="bg-wears-leather"
            formatValue={(v) => `${v} und.`}
          />
        </section>
        <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-wears-black">
            Producto que más se vende
          </h2>
          <BarList
            items={m.topProducts.map((p) => ({ name: p.name, value: p.units }))}
            formatValue={(v) => `${v} und.`}
          />
        </section>
        <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-wears-black">
            Producto que menos se vende
          </h2>
          <BarList
            items={m.bottomProducts.map((p) => ({ name: p.name, value: p.units }))}
            colorClass="bg-wears-leather"
            formatValue={(v) => `${v} und.`}
          />
        </section>
        <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-wears-black">
            Existencias por colección
          </h2>
          <BarList
            items={m.collectionStock.map((c) => ({
              name: c.name,
              value: c.quantity,
              hint: formatUSD(c.value) + " a costo",
            }))}
            colorClass="bg-wears-gold"
            formatValue={(v) => `${v} und.`}
          />
        </section>
        <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-wears-black">
            Aliados con deuda de consignación
          </h2>
          {m.alliesWithDebt.length === 0 ? (
            <p className="text-sm text-wears-espresso/50">
              Ningún aliado tiene deuda pendiente.
            </p>
          ) : (
            <BarList
              items={m.alliesWithDebt.map((a) => ({ name: a.name, value: a.balance }))}
              colorClass="bg-amber-500"
              formatValue={(v) => formatUSD(v)}
            />
          )}
        </section>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-wears-black">Ventas recientes</h2>
          <Link href="/admin/ventas" className="text-sm text-wears-gold hover:underline">
            Ver todas
          </Link>
        </div>
        <p className="mb-3 text-xs text-wears-espresso/50">
          En ventas de aliados se muestra solo la ganancia de Wears (el resto
          es del aliado); en ventas directas de tienda web o punto físico se
          muestra el valor completo, porque es 100% de Wears.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Canal</th>
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Cantidad</th>
                <th className="py-2 pr-4">Para Wears</th>
              </tr>
            </thead>
            <tbody>
              {m.recentSales.map((s) => (
                <tr key={s.id} className="border-b border-wears-tan/10">
                  <td className="py-2 pr-4 text-wears-espresso/70">
                    {s.saleDate.toLocaleDateString("es-CO")}
                  </td>
                  <td className="py-2 pr-4">{s.ally?.businessName ?? s.location.name}</td>
                  <td className="py-2 pr-4">{s.product.name}</td>
                  <td className="py-2 pr-4">{s.quantity}</td>
                  <td className="py-2 pr-4 text-emerald-600">
                    {formatUSD(
                      s.ally
                        ? (s.unitPrice - s.unitCost) * s.quantity
                        : s.unitPrice * s.quantity
                    )}
                  </td>
                </tr>
              ))}
              {m.recentSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-wears-espresso/50">
                    Aún no hay ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {m.outOfStock.length > 0 && (
        <section className="rounded-xl border-2 border-red-400 bg-red-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-red-800">
              🔴 Productos que necesitan reposición ({m.outOfStock.length})
            </h2>
            <Link href="/admin/reposicion" className="text-sm text-red-700 hover:underline">
              Ver detalle
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {m.outOfStock.slice(0, 9).map((r, i) => (
              <li key={i} className="rounded-lg border border-red-300 bg-white px-3 py-2">
                <p className="font-medium text-wears-black">{r.productName}</p>
                <p className="text-xs text-red-700">{r.locationName} — 0 disponibles</p>
              </li>
            ))}
          </ul>
          {m.outOfStock.length > 9 && (
            <p className="mt-2 text-xs text-red-700">y {m.outOfStock.length - 9} más...</p>
          )}
        </section>
      )}
    </div>
  );
}
