"use client";

import { useState } from "react";
import Link from "next/link";
import { STOCK_STATUS_LABEL, STOCK_STATUS_CLASSES } from "@/lib/inventory";

export type RestockItem = {
  id: string;
  productName: string;
  size: string | null;
  quantity: number;
  minStock: number;
  locationId: string;
  locationName: string;
  allyId: string | null;
  status: "AGOTADO" | "BAJO";
};

function modelNameOf(item: RestockItem) {
  if (item.size && item.size !== "Única") {
    return item.productName.replace(` — Talla ${item.size}`, "");
  }
  return item.productName;
}

function tallaOf(item: RestockItem) {
  return item.size && item.size !== "Única" ? item.size : "—";
}

type Filter = "all" | "AGOTADO" | "BAJO";

export default function ReposicionBrowser({ items }: { items: RestockItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const outOfStockCount = items.filter((i) => i.status === "AGOTADO").length;
  const lowStockCount = items.filter((i) => i.status === "BAJO").length;

  const groups = Array.from(
    items.reduce((map, item) => {
      if (!map.has(item.locationId)) {
        map.set(item.locationId, {
          locationId: item.locationId,
          locationName: item.locationName,
          allyId: item.allyId,
          items: [] as RestockItem[],
        });
      }
      map.get(item.locationId)!.items.push(item);
      return map;
    }, new Map<string, { locationId: string; locationName: string; allyId: string | null; items: RestockItem[] }>())
  )
    .map(([, v]) => v)
    .sort((a, b) => b.items.length - a.items.length);

  const filteredFlat = filter === "all" ? [] : items.filter((i) => i.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setFilter((f) => (f === "AGOTADO" ? "all" : "AGOTADO"))}
          className={`rounded-xl border p-4 text-left transition ${
            filter === "AGOTADO"
              ? "border-red-500 bg-red-100"
              : "border-red-300 bg-red-50 hover:border-red-400"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-red-700">Agotados</p>
          <p className="mt-1 text-2xl font-semibold text-red-800">{outOfStockCount}</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter((f) => (f === "BAJO" ? "all" : "BAJO"))}
          className={`rounded-xl border p-4 text-left transition ${
            filter === "BAJO"
              ? "border-amber-500 bg-amber-100"
              : "border-amber-300 bg-amber-50 hover:border-amber-400"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-amber-700">Stock bajo</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{lowStockCount}</p>
        </button>
        <div className="rounded-xl border border-wears-tan/30 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-wears-espresso/60">
            Ubicaciones afectadas
          </p>
          <p className="mt-1 text-2xl font-semibold text-wears-black">{groups.length}</p>
        </div>
      </div>

      {items.length === 0 && (
        <section className="rounded-xl border border-wears-tan/30 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-wears-espresso/50">
            Todo el inventario está en niveles saludables.
          </p>
        </section>
      )}

      {filter !== "all" ? (
        <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-wears-black">
              {filter === "AGOTADO" ? "Productos agotados" : "Productos con stock bajo"} (
              {filteredFlat.length})
            </h2>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="text-xs text-wears-gold hover:underline"
            >
              Ver agrupado por ubicación
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                  <th className="py-2 pr-4">Producto</th>
                  <th className="py-2 pr-4">Talla</th>
                  <th className="py-2 pr-4">Ubicación</th>
                  <th className="py-2 pr-4">Disponible</th>
                  <th className="py-2 pr-4">Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlat.map((item) => (
                  <tr key={item.id} className="border-b border-wears-tan/10">
                    <td className="py-2 pr-4">{modelNameOf(item)}</td>
                    <td className="py-2 pr-4">{tallaOf(item)}</td>
                    <td className="py-2 pr-4 text-wears-espresso/70">{item.locationName}</td>
                    <td className="py-2 pr-4">{item.quantity}</td>
                    <td className="py-2 pr-4">{item.minStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <details
              key={g.locationId}
              className="rounded-xl border border-wears-tan/30 bg-white px-5 py-3 open:pb-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between py-2">
                <span className="font-medium text-wears-black">
                  {g.locationName}
                  <span className="ml-2 text-xs font-normal text-wears-espresso/50">
                    ({g.items.length} producto{g.items.length === 1 ? "" : "s"})
                  </span>
                </span>
                {g.allyId ? (
                  <Link
                    href={`/admin/aliados/${g.allyId}`}
                    className="text-xs text-wears-gold hover:underline"
                  >
                    Ver aliado
                  </Link>
                ) : (
                  <Link href="/admin/inventario" className="text-xs text-wears-gold hover:underline">
                    Ir a inventario
                  </Link>
                )}
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                      <th className="py-2 pr-4">Producto</th>
                      <th className="py-2 pr-4">Talla</th>
                      <th className="py-2 pr-4">Disponible</th>
                      <th className="py-2 pr-4">Mínimo</th>
                      <th className="py-2 pr-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((item) => (
                      <tr key={item.id} className="border-b border-wears-tan/10">
                        <td className="py-2 pr-4">{modelNameOf(item)}</td>
                        <td className="py-2 pr-4">{tallaOf(item)}</td>
                        <td className="py-2 pr-4">{item.quantity}</td>
                        <td className="py-2 pr-4">{item.minStock}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${STOCK_STATUS_CLASSES[item.status]}`}
                          >
                            {STOCK_STATUS_LABEL[item.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
