"use client";

import { useActionState } from "react";
import { updateAllyDetails, type FormState } from "../actions";

const initialState: FormState = {};

export default function EditAllyForm({
  allyId,
  businessName,
  contactName,
  phone,
  city,
}: {
  allyId: string;
  businessName: string;
  contactName: string;
  phone: string | null;
  city: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateAllyDetails, initialState);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input type="hidden" name="allyId" value={allyId} />
      <input
        name="businessName"
        defaultValue={businessName}
        placeholder="Nombre del negocio"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="contactName"
        defaultValue={contactName}
        placeholder="Nombre de contacto"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="phone"
        defaultValue={phone ?? ""}
        placeholder="Teléfono / WhatsApp"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="city"
        defaultValue={city ?? ""}
        placeholder="Ciudad"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-wears-gold px-4 py-1.5 text-sm font-medium text-wears-gold hover:bg-wears-gold hover:text-wears-black disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar datos"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </div>
    </form>
  );
}
