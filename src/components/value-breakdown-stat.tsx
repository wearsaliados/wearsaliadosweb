"use client";

import { useState } from "react";
import { formatUSD } from "@/lib/inventory";

export default function ValueBreakdownStat({
  label,
  value,
  costValue,
  manufacturingValue,
  saleValue,
  tone = "default",
}: {
  label: string;
  value: string;
  costValue: number;
  manufacturingValue: number;
  saleValue: number;
  tone?: "default" | "warning" | "critical" | "success";
}) {
  const [open, setOpen] = useState(false);

  const toneClasses =
    tone === "critical"
      ? "border-red-300 bg-red-50"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50"
        : tone === "success"
          ? "border-emerald-400 bg-emerald-50"
          : "border-wears-tan/30 bg-white";

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={`w-full rounded-xl border p-4 text-left shadow-sm transition hover:border-wears-gold ${toneClasses}`}
    >
      <p className="text-xs uppercase tracking-wide text-wears-espresso/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-wears-black">{value}</p>
      <p className="mt-1 text-xs text-wears-espresso/50">
        {formatUSD(costValue)} a costo · {open ? "ocultar valor" : "ver valor ▾"}
      </p>
      {open && (
        <dl className="mt-3 flex flex-col gap-1 border-t border-wears-tan/20 pt-3 text-xs">
          <div className="flex items-center justify-between">
            <dt className="text-wears-espresso/50">A costo</dt>
            <dd className="font-medium text-wears-black">{formatUSD(costValue)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-wears-espresso/50">Fabricación</dt>
            <dd className="font-medium text-wears-black">{formatUSD(manufacturingValue)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-wears-espresso/50">A venta</dt>
            <dd className="font-medium text-wears-black">{formatUSD(saleValue)}</dd>
          </div>
        </dl>
      )}
    </button>
  );
}
