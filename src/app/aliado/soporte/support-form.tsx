"use client";

import { useActionState, useRef, useEffect } from "react";
import { submitSupportRequest, type FormState } from "./actions";

const initialState: FormState = {};

export default function SupportForm({
  type,
  title,
  placeholder,
  submitLabel,
}: {
  type: "ACTIVACION_MARCA" | "PROBLEMA_PRODUCTO" | "OTRO";
  title: string;
  placeholder: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(submitSupportRequest, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold text-wears-black">{title}</h2>
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="type" value={type} />
        <textarea
          name="message"
          required
          rows={3}
          placeholder={placeholder}
          className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-full bg-wears-gold px-5 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
        >
          {pending ? "Enviando..." : submitLabel}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </form>
    </div>
  );
}
