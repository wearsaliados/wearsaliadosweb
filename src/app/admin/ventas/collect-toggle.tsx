"use client";

import { toggleSaleCollected } from "./actions";

export default function CollectToggle({
  saleId,
  collected,
}: {
  saleId: string;
  collected: boolean;
}) {
  return (
    <form action={toggleSaleCollected.bind(null, saleId, !collected)}>
      <button
        type="submit"
        className={`rounded-full border px-2 py-0.5 text-xs transition ${
          collected
            ? "border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            : "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200"
        }`}
      >
        {collected ? "Cobrado" : "Por cobrar"}
      </button>
    </form>
  );
}
