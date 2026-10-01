"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export type ProductAvailabilityRow = {
  productId: string;
  productName: string;
  collectionName: string;
  locationName: string;
  quantity: number;
};

export default function ProductSearch({ rows }: { rows: ProductAvailabilityRow[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = q
    ? rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) || r.collectionName.toLowerCase().includes(q)
      )
    : [];

  const grouped = Array.from(
    matches.reduce((map, r) => {
      if (!map.has(r.productId)) {
        map.set(r.productId, { name: r.productName, collection: r.collectionName, locations: [] as { name: string; quantity: number }[] });
      }
      map.get(r.productId)!.locations.push({ name: r.locationName, quantity: r.quantity });
      return map;
    }, new Map<string, { name: string; collection: string; locations: { name: string; quantity: number }[] }>())
  ).map(([, v]) => v);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wears-espresso/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar un producto o colección (por ejemplo: Beige cierres, Riñonera Azul, M Jane)..."
          className="w-full rounded-lg border border-wears-tan/30 py-2 pl-9 pr-3 text-sm"
        />
      </div>

      {q && grouped.length === 0 && (
        <p className="text-sm text-wears-espresso/50">Sin resultados para &quot;{query}&quot;.</p>
      )}

      {grouped.length > 0 && (
        <div className="flex flex-col gap-2">
          {grouped.slice(0, 15).map((p) => {
            const total = p.locations.reduce((s, l) => s + l.quantity, 0);
            return (
              <div key={p.name + p.collection} className="rounded-lg border border-wears-tan/20 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-wears-black">{p.name}</p>
                    <p className="text-xs text-wears-espresso/50">{p.collection}</p>
                  </div>
                  <span className="rounded-full bg-wears-sand px-2 py-0.5 text-xs text-wears-espresso/70">
                    {total} en total
                  </span>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-1 text-xs sm:grid-cols-3">
                  {p.locations
                    .filter((l) => l.quantity > 0)
                    .map((l) => (
                      <li key={l.name} className="rounded bg-wears-cream px-2 py-1 text-wears-espresso/80">
                        {l.name}: <span className="font-medium text-wears-black">{l.quantity}</span>
                      </li>
                    ))}
                  {p.locations.every((l) => l.quantity === 0) && (
                    <li className="col-span-full text-red-600">Sin existencias en ningún canal.</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
