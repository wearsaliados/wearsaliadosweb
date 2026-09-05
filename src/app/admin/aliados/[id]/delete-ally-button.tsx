"use client";

import { deleteAlly } from "../actions";

export default function DeleteAllyButton({
  allyId,
  businessName,
}: {
  allyId: string;
  businessName: string;
}) {
  return (
    <form
      action={deleteAlly.bind(null, allyId)}
      onSubmit={(e) => {
        const ok = window.confirm(
          `¿Eliminar a ${businessName} permanentemente? Se borrará su inventario, ventas, historial de consignación y su acceso al panel. Esta acción no se puede deshacer.`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <button className="rounded-full border border-red-300 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50">
        Eliminar aliado
      </button>
    </form>
  );
}
