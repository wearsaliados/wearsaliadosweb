"use client";

import { useState } from "react";

export default function CollectibleStatCard({
  label,
  value,
  hint,
  tone = "default",
  breakdown,
  emptyText = "Sin datos todavía.",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "critical" | "success";
  breakdown: { name: string; value: string }[];
  emptyText?: string;
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

  const valueClasses = tone === "success" ? "text-emerald-600" : "text-wears-black";

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={`w-full rounded-xl border p-4 text-left shadow-sm transition hover:border-wears-gold ${toneClasses}`}
    >
      <p className="flex items-center justify-between text-xs uppercase tracking-wide text-wears-espresso/60">
        <span>{label}</span>
        <span>{open ? "▴" : "▾"}</span>
      </p>
      <p className={`mt-1 text-2xl font-semibold ${valueClasses}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-wears-espresso/50">{hint}</p>}
      {open && (
        <dl className="mt-3 flex flex-col gap-1.5 border-t border-wears-tan/20 pt-3 text-xs">
          {breakdown.length === 0 ? (
            <p className="text-wears-espresso/50">{emptyText}</p>
          ) : (
            breakdown.map((b) => (
              <div key={b.name} className="flex items-center justify-between gap-3">
                <dt className="text-wears-espresso/70">{b.name}</dt>
                <dd className="font-medium text-wears-black">{b.value}</dd>
              </div>
            ))
          )}
        </dl>
      )}
    </button>
  );
}
