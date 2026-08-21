"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm text-wears-sand/80">
          Correo o usuario
        </label>
        <input
          id="email"
          name="email"
          type="text"
          required
          autoComplete="username"
          className="rounded-lg border border-wears-tan/30 bg-wears-black/40 px-4 py-2.5 text-wears-cream outline-none focus:border-wears-gold"
          placeholder="tucorreo@ejemplo.com o tu usuario"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-wears-sand/80">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-wears-tan/30 bg-wears-black/40 px-4 py-2.5 text-wears-cream outline-none focus:border-wears-gold"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-wears-gold px-6 py-2.5 font-medium text-wears-black transition hover:bg-wears-tan disabled:opacity-60"
      >
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
