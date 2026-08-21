"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { Sparkles, Gem, Gift, Tag, type LucideIcon } from "lucide-react";
import { submitSupportRequest, type FormState } from "./actions";

const OPTIONS: {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    key: "Grabado de láser",
    icon: Sparkles,
    title: "Grabado de láser",
    description: "Personaliza cada pieza con un grabado único a láser.",
  },
  {
    key: "Personalización con piedras (ojo de tigre, ónix, cordones, etc.)",
    icon: Gem,
    title: "Personalización con piedras",
    description: "Ojo de tigre, ónix, cordones y más detalles a la medida.",
  },
  {
    key: "Premio gratis por compra de tu producto Wears con promotora",
    icon: Gift,
    title: "Promotora + premio gratis",
    description: "Una promotora en tu punto y un regalo por cada compra.",
  },
  {
    key: "Promoción de descuento especial en producto específico",
    icon: Tag,
    title: "Descuento especial",
    description: "Promoción con precio especial en un producto puntual.",
  },
];

const initialState: FormState = {};

export default function ActivationOptions() {
  const [selected, setSelected] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(submitSupportRequest, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) setSelected(null);
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-wears-black">Solicita tu activación de marca</h2>
      <p className="mt-1 mb-4 text-sm text-wears-espresso/60">
        Elige el tipo de activación que quieres para tu punto de venta. Las
        imágenes son de referencia — pronto las cambiamos por fotos reales de
        activaciones Wears.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelected(active ? null : opt.key)}
              className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition ${
                active
                  ? "border-wears-gold bg-wears-gold/10 ring-2 ring-wears-gold"
                  : "border-wears-tan/30 hover:border-wears-gold/60"
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-wears-black to-wears-espresso text-wears-gold">
                <Icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <span>
                <span className="block font-medium text-wears-black">{opt.title}</span>
                <span className="block text-xs text-wears-espresso/60">{opt.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-3 border-t border-wears-tan/20 pt-4">
          <input type="hidden" name="type" value="ACTIVACION_MARCA" />
          <input type="hidden" name="activation" value={selected} />
          <p className="text-sm text-wears-espresso/70">
            Elegiste: <span className="font-medium text-wears-black">{selected}</span>
          </p>
          <textarea
            name="message"
            rows={2}
            placeholder="Cuéntanos algo más (fecha que te interesa, cantidad, etc.) — opcional"
            className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-wears-gold px-5 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Solicitar esta activación"}
            </button>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
