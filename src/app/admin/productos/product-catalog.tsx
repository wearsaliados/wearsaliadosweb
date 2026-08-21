"use client";

import { useState } from "react";
import { formatUSD } from "@/lib/inventory";
import { toggleProductActive } from "./actions";

type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  active: boolean;
  collectionName: string;
  totalStock: number;
};

function ProductRow({ p }: { p: CatalogProduct }) {
  return (
    <tr className="border-b border-wears-tan/10">
      <td className="py-2 pr-4 font-mono text-xs">{p.sku}</td>
      <td className="py-2 pr-4">{p.name}</td>
      <td className="py-2 pr-4">{formatUSD(p.price)}</td>
      <td className="py-2 pr-4">{formatUSD(p.cost)}</td>
      <td className="py-2 pr-4">{p.totalStock}</td>
      <td className="py-2 pr-4">
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            p.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
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
}

function ProductTable({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
            <th className="py-2 pr-4">SKU</th>
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Precio</th>
            <th className="py-2 pr-4">Costo</th>
            <th className="py-2 pr-4">Stock total</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <ProductRow key={p.id} p={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductCatalog({ products }: { products: CatalogProduct[] }) {
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = q
    ? products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      )
    : products;

  const groups = Array.from(
    filtered.reduce((map, p) => {
      if (!map.has(p.collectionName)) map.set(p.collectionName, []);
      map.get(p.collectionName)!.push(p);
      return map;
    }, new Map<string, CatalogProduct[]>())
  ).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o SKU..."
        className="w-full rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />

      {q ? (
        filtered.length > 0 ? (
          <ProductTable products={filtered} />
        ) : (
          <p className="py-4 text-center text-sm text-wears-espresso/50">
            Sin resultados para &quot;{search}&quot;.
          </p>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map(([collectionName, items]) => (
            <details
              key={collectionName}
              className="rounded-lg border border-wears-tan/20 px-4 py-2 open:pb-4"
            >
              <summary className="cursor-pointer list-none py-2 font-medium text-wears-black">
                <span className="mr-2">{collectionName}</span>
                <span className="text-xs font-normal text-wears-espresso/50">
                  ({items.length} producto{items.length === 1 ? "" : "s"})
                </span>
              </summary>
              <ProductTable products={items} />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
