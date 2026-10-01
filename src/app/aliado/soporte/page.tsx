import { requireAlly } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SupportForm from "./support-form";
import ActivationOptions from "./activation-options";

const TYPE_LABEL: Record<string, string> = {
  ACTIVACION_MARCA: "Activación de marca",
  PROBLEMA_PRODUCTO: "Problema con producto",
  PEDIDO_ANTICIPADO: "Pedido anticipado",
  OTRO: "Otro",
};

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  RESUELTO: "Resuelto",
};

export default async function AllySoportePage() {
  const session = await requireAlly();

  const previous = await prisma.supportRequest.findMany({
    where: { allyId: session.allyId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">Contáctanos</h1>
        <p className="text-sm text-wears-espresso/60">
          Estamos para apoyarte a crecer con Wears.
        </p>
      </div>

      <ActivationOptions />

      <SupportForm
        type="PROBLEMA_PRODUCTO"
        title="¿Tienes un problema con tu producto Wears?"
        placeholder="Describe el problema con el producto (referencia, defecto, etc.)..."
        submitLabel="Reportar problema"
      />

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">Mis mensajes</h2>
        <ul className="flex flex-col gap-2">
          {previous.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-wears-tan/20 px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-wears-black">
                  {TYPE_LABEL[r.type]}
                </span>
                <span className="text-xs text-wears-espresso/50">
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <p className="mt-1 text-wears-espresso/70">{r.message}</p>
            </li>
          ))}
          {previous.length === 0 && (
            <p className="text-sm text-wears-espresso/50">Aún no has enviado mensajes.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
