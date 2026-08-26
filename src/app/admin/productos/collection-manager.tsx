"use client";

import { useActionState } from "react";
import { updateCollectionFlags, type FormState } from "./actions";

const initialState: FormState = {};

type ManagedCollection = {
  id: string;
  name: string;
  upcoming: boolean;
  visibleToAllies: boolean;
  imageUrl: string | null;
};

function CollectionRow({ c }: { c: ManagedCollection }) {
  const [state, formAction, pending] = useActionState(
    updateCollectionFlags.bind(null, c.id),
    initialState
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-lg border border-wears-tan/20 p-3 sm:flex-row sm:items-center sm:gap-4"
    >
      <span className="min-w-[10rem] font-medium text-wears-black">{c.name}</span>
      <label className="flex items-center gap-2 text-sm text-wears-espresso/70">
        <input type="checkbox" name="upcoming" defaultChecked={c.upcoming} />
        Próximamente
      </label>
      <label className="flex items-center gap-2 text-sm text-wears-espresso/70">
        <input type="checkbox" name="visibleToAllies" defaultChecked={c.visibleToAllies} />
        Visible a aliados
      </label>
      <input
        name="imageUrl"
        defaultValue={c.imageUrl ?? ""}
        placeholder="URL de imagen"
        className="flex-1 rounded-lg border border-wears-tan/30 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-wears-gold px-4 py-1.5 text-xs font-medium text-wears-gold hover:bg-wears-gold hover:text-wears-black disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-600">{state.success}</p>}
    </form>
  );
}

export default function CollectionManager({
  collections,
}: {
  collections: ManagedCollection[];
}) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      {collections.map((c) => (
        <CollectionRow key={c.id} c={c} />
      ))}
      {collections.length === 0 && (
        <p className="text-sm text-wears-espresso/50">Aún no hay colecciones.</p>
      )}
    </div>
  );
}
