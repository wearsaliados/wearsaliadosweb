"use client";

import { useActionState, useState } from "react";
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
  const [preview, setPreview] = useState<string | null>(c.imageUrl);
  const [removeImage, setRemoveImage] = useState(false);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-wears-tan/20 p-3 sm:flex-row sm:items-center sm:gap-4"
    >
      {preview && !removeImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-wears-tan/40 text-[10px] text-wears-espresso/40">
          Sin foto
        </div>
      )}
      <span className="min-w-[8rem] font-medium text-wears-black">{c.name}</span>
      <label className="flex items-center gap-2 text-sm text-wears-espresso/70">
        <input type="checkbox" name="upcoming" defaultChecked={c.upcoming} />
        Próximamente
      </label>
      <label className="flex items-center gap-2 text-sm text-wears-espresso/70">
        <input type="checkbox" name="visibleToAllies" defaultChecked={c.visibleToAllies} />
        Visible a aliados
      </label>
      <label className="flex flex-1 flex-col gap-1 text-xs text-wears-espresso/60">
        Foto de portada
        <input
          name="imageFile"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setRemoveImage(false);
              setPreview(URL.createObjectURL(file));
            }
          }}
          className="text-xs text-wears-espresso/70 file:mr-2 file:rounded-full file:border-0 file:bg-wears-gold/20 file:px-3 file:py-1 file:text-xs file:font-medium file:text-wears-espresso"
        />
      </label>
      {c.imageUrl && (
        <label className="flex items-center gap-2 text-xs text-wears-espresso/60">
          <input
            type="checkbox"
            name="removeImage"
            checked={removeImage}
            onChange={(e) => {
              setRemoveImage(e.target.checked);
              if (e.target.checked) setPreview(null);
              else setPreview(c.imageUrl);
            }}
          />
          Quitar foto
        </label>
      )}
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
