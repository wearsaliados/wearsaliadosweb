"use client";

import { useState } from "react";
import { formatUSD } from "@/lib/inventory";

export default function CollectionStockList({
  items,
}: {
  items: {
    name: string;
    quantity: number;
    value: number;
    manufacturingValue: number;
    saleValue: number;
  }[];
}) {
  const [openName, setOpenName] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="text-sm text-wears-espresso/50">Sin datos todavía.</p>;
  }

  const max = Math.max(...items.map((i) => i.quantity), 1);

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const open = openName === item.name;
        return (
          <li key={item.name}>
            <button
              type="button"
              onClick={() => setOpenName(open ? null : item.name)}
              className="w-full text-left"
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-wears-black">
                  {item.name}
                  <span className="ml-2 text-xs text-wears-espresso/50">
                    {formatUSD(item.value)} a costo {open ? "▴" : "▾"}
                  </span>
                </span>
                <span className="font-medium text-wears-espresso">{item.quantity} und.</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-wears-sand">
                <div
                  className="h-full rounded-full bg-wears-gold"
                  style={{ width: `${Math.max((item.quantity / max) * 100, 4)}%` }}
                />
              </div>
            </button>
            {open && (
              <dl className="mt-2 flex flex-col gap-1 rounded-lg bg-wears-cream px-3 py-2 text-xs sm:flex-row sm:gap-4">
                <div className="flex items-center justify-between gap-2 sm:justify-start">
                  <dt className="text-wears-espresso/50">A costo:</dt>
                  <dd className="font-medium text-wears-black">{formatUSD(item.value)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-start">
                  <dt className="text-wears-espresso/50">Fabricación:</dt>
                  <dd className="font-medium text-wears-black">
                    {formatUSD(item.manufacturingValue)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-start">
                  <dt className="text-wears-espresso/50">A venta:</dt>
                  <dd className="font-medium text-wears-black">{formatUSD(item.saleValue)}</dd>
                </div>
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
