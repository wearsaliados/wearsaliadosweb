"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "./actions";

const initialState: FormState = {};

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-wears-espresso/70">Contraseña actual</label>
        <input
          name="currentPassword"
          type="password"
          required
          className="rounded-lg border border-wears-tan/30 px-4 py-2.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm text-wears-espresso/70">Nueva contraseña</label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={6}
          className="rounded-lg border border-wears-tan/30 px-4 py-2.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm text-wears-espresso/70">Confirmar nueva contraseña</label>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          className="rounded-lg border border-wears-tan/30 px-4 py-2.5 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-full bg-wears-gold px-6 py-2.5 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Actualizar contraseña"}
      </button>
    </form>
  );
}
