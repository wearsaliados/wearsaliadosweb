import Link from "next/link";
import { getAdminDashboardMetrics } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/inventory";
import StatCard from "@/components/stat-card";
import BarList from "@/components/bar-list";
import ProductSearch from "@/components/product-search";
import ValueBreakdownStat from "@/components/value-breakdown-stat";
import CollectionStockList from "@/components/collection-stock-list";

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
        <ValueBreakdownStat
          label="Total unidades"
          value={m.totalUnits.toString()}
          costValue={m.totalInventoryValue}
          manufacturingValue={
            m.inventoryManufacturingValueByLocationType.WEB +
            m.inventoryManufacturingValueByLocationType.STORE +
            m.inventoryManufacturingValueByLocationType.FACTORY +
            m.inventoryManufacturingValueByLocationType.ALLY
          }
          saleValue={
            m.inventorySaleValueByLocationType.WEB +
            m.inventorySaleValueByLocationType.STORE +
            m.inventorySaleValueByLocationType.FACTORY +
            m.inventorySaleValueByLocationType.ALLY
          }
        />
        <ValueBreakdownStat
          label="En tienda en línea"
          value={m.inventoryByLocationType.WEB.toString()}
          costValue={m.inventoryValueByLocationType.WEB}
          manufacturingValue={m.inventoryManufacturingValueByLocationType.WEB}
          saleValue={m.inventorySaleValueByLocationType.WEB}
        />
        <ValueBreakdownStat
          label="En puntos físicos"
          value={m.inventoryByLocationType.STORE.toString()}
          costValue={m.inventoryValueByLocationType.STORE}
          manufacturingValue={m.inventoryManufacturingValueByLocationType.STORE}
          saleValue={m.inventorySaleValueByLocationType.STORE}
        />
        <ValueBreakdownStat
          label="En fábrica (reposición)"
          value={m.inventoryByLocationType.FACTORY.toString()}
          costValue={m.inventoryValueByLocationType.FACTORY}
          manufacturingValue={m.inventoryManufacturingValueByLocationType.FACTORY}
          saleValue={m.inventorySaleValueByLocationType.FACTORY}
        />
        <ValueBreakdownStat
          label="En aliados comerciales"
          value={m.inventoryByLocationType.ALLY.toString()}
          costValue={m.inventoryValueByLocationType.ALLY}
          manufacturingValue={m.inventoryManufacturingValueByLocationType.ALLY}
          saleValue={m.inventorySaleValueByLocationType.ALLY}
        />
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold text-wears-black">Rentabilidad de Wears</h2>
        <p className="mb-3 text-xs text-wears-espresso/50">
          Ganancia real de Wears: en aliados se cuenta solo el margen (precio − costo); en
          tienda web y punto físico se cuenta el valor completo de la venta.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            [
              { key: "daily", label: "Hoy" },
              { key: "monthly", label: "Este mes" },
              { key: "annual", label: "Este año" },
            ] as const
          ).map((period) => {
            const p = m.profitability[period.key];
            return (
              <div key={period.key} className="rounded-lg border border-wears-tan/20 p-4">
                <p className="text-xs uppercase tracking-wide text-wears-espresso/60">
                  {period.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-600">
                  {formatUSD(p.total)}
                </p>
                <dl className="mt-3 flex flex-col gap-1 text-xs text-wears-espresso/70">
                  <div className="flex justify-between">
                    <dt>Tienda web</dt>
                    <dd className="font-medium text-wears-black">{formatUSD(p.web)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Puntos físicos</dt>
                    <dd className="font-medium text-wears-black">{formatUSD(p.store)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Aliados comerciales</dt>
                    <dd className="font-medium text-wears-black">{formatUSD(p.ally)}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </section>

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
          label="Ventas de aliados por cobrar"
          value={formatUSD(m.totalToCollect)}
          tone={m.totalToCollect > 0 ? "warning" : "default"}
          hint="Costo de unidades vendidas por aliados, aún no pagadas a Wears"
        />
        <StatCard
          label="Ventas de aliados cobradas"
          value={formatUSD(m.totalCollected)}
          tone="success"
          hint="Costo de unidades vendidas por aliados, ya pagadas a Wears"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <StatCard
          label="Ventas en aliados comerciales"
          value={formatUSD(m.allySales.revenue)}
          hint={`${m.allySales.units} unidades vendidas · precio final de todos los aliados`}
        />
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold text-wears-black">Ventas totales de Wears</h2>
        <p className="mb-3 text-xs text-wears-espresso/50">
          Cuánto ha facturado Wears en total: tienda web, puntos físicos y el precio final de
          venta de los aliados.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            [
              { key: "daily", label: "Hoy" },
              { key: "monthly", label: "Este mes" },
              { key: "annual", label: "Este año" },
            ] as const
          ).map((period) => {
            const r = m.revenueTotals[period.key];
            return (
              <div key={period.key} className="rounded-lg border border-wears-tan/20 p-4">
                <p className="text-xs uppercase tracking-wide text-wears-espresso/60">
                  {period.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-wears-black">
                  {formatUSD(r.total)}
                </p>
                <dl className="mt-3 flex flex-col gap-1 text-xs text-wears-espresso/70">
                  <div className="flex justify-between">
                    <dt>Tienda web</dt>
                    <dd className="font-medium text-wears-black">{formatUSD(r.web)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Puntos físicos</dt>
                    <dd className="font-medium text-wears-black">{formatUSD(r.store)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Aliados comerciales</dt>
                    <dd className="font-medium text-wears-black">{formatUSD(r.ally)}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </section>

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
          <p className="mb-3 text-xs text-wears-espresso/50">
            Click en una colección para ver su valor a costo, fabricación y venta.
          </p>
          <CollectionStockList items={m.collectionStock} />
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
          Se muestra la ganancia real de Wears: en ventas directas (tienda web
          o punto físico) es precio de venta menos costo de fabricación; en
          ventas de aliados es el costo al que se les entregó el producto
          menos el costo de fabricación (el margen propio del aliado no es
          de Wears).
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
                <th className="py-2 pr-4">Cobro</th>
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
                        ? (s.unitCost - s.product.manufacturingCost) * s.quantity
                        : (s.unitPrice - s.product.manufacturingCost) * s.quantity
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {s.ally ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          s.collected
                            ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                            : "border-amber-300 bg-amber-100 text-amber-700"
                        }`}
                      >
                        {s.collected ? "Cobrado" : "Por cobrar"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {m.recentSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-wears-espresso/50">
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
