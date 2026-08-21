import Link from "next/link";
import { getAdminDashboardMetrics } from "@/lib/metrics";
import { formatUSD } from "@/lib/inventory";
import StatCard from "@/components/stat-card";
import BarList from "@/components/bar-list";

export default async function AdminDashboardPage() {
  const m = await getAdminDashboardMetrics();

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

      {m.outOfStock.length > 0 && (
        <section className="rounded-xl border-2 border-red-400 bg-red-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-red-800">
              🔴 {m.outOfStock.length} producto{m.outOfStock.length === 1 ? "" : "s"} agotado
              {m.outOfStock.length === 1 ? "" : "s"} — requiere reposición urgente
            </h2>
            <Link href="/admin/reposicion" className="text-sm text-red-700 hover:underline">
              Ver detalle
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {m.outOfStock.slice(0, 9).map((r, i) => (
              <li
                key={i}
                className="rounded-lg border border-red-300 bg-white px-3 py-2"
              >
                <p className="font-medium text-wears-black">{r.productName}</p>
                <p className="text-xs text-red-700">{r.locationName} — 0 disponibles</p>
              </li>
            ))}
          </ul>
          {m.outOfStock.length > 9 && (
            <p className="mt-2 text-xs text-red-700">
              y {m.outOfStock.length - 9} más...
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total unidades" value={m.totalUnits.toString()} />
        <StatCard label="En tienda en línea" value={m.inventoryByLocationType.WEB.toString()} />
        <StatCard label="En puntos físicos" value={m.inventoryByLocationType.STORE.toString()} />
        <StatCard label="En fábrica (reposición)" value={m.inventoryByLocationType.FACTORY.toString()} />
        <StatCard label="En aliados comerciales" value={m.inventoryByLocationType.ALLY.toString()} />
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
          value={m.restockNeeded.length.toString()}
          tone={m.restockNeeded.length > 0 ? "critical" : "default"}
          hint="En fábrica, tiendas y aliados"
        />
        <StatCard
          label="Solicitudes de soporte pendientes"
          value={m.pendingSupportCount.toString()}
          tone={m.pendingSupportCount > 0 ? "warning" : "default"}
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
            items={m.collectionStock.map((c) => ({ name: c.name, value: c.quantity }))}
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Aliado</th>
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Cantidad</th>
                <th className="py-2 pr-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {m.recentSales.map((s) => (
                <tr key={s.id} className="border-b border-wears-tan/10">
                  <td className="py-2 pr-4 text-wears-espresso/70">
                    {s.saleDate.toLocaleDateString("es-CO")}
                  </td>
                  <td className="py-2 pr-4">{s.ally.businessName}</td>
                  <td className="py-2 pr-4">{s.product.name}</td>
                  <td className="py-2 pr-4">{s.quantity}</td>
                  <td className="py-2 pr-4">{formatUSD(s.quantity * s.unitPrice)}</td>
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

      {m.restockNeeded.length > 0 && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-red-800">
              Productos que necesitan reposición
            </h2>
            <Link href="/admin/reposicion" className="text-sm text-red-700 hover:underline">
              Ver detalle
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {m.restockNeeded.slice(0, 9).map((r, i) => (
              <li
                key={i}
                className="rounded-lg border border-red-200 bg-white px-3 py-2"
              >
                <p className="font-medium text-wears-black">{r.productName}</p>
                <p className="text-xs text-wears-espresso/60">
                  {r.locationName} — {r.quantity} disponibles (mínimo {r.minStock})
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
