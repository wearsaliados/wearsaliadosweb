"use client";

import { deleteInventoryItem } from "./actions";

export default function DeleteItemButton({
  inventoryItemId,
  productName,
}: {
  inventoryItemId: string;
  productName: string;
}) {
  return (
    <form
      action={deleteInventoryItem.bind(null, inventoryItemId)}
      onSubmit={(e) => {
        const ok = window.confirm(`¿Quitar "${productName}" del inventario de esta ubicación?`);
        if (!ok) e.preventDefault();
      }}
    >
      <button type="submit" className="text-xs text-red-600 hover:underline">
        Quitar
      </button>
    </form>
  );
}
