import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveSupportRequest } from "../aliados/actions";

const TYPE_LABEL: Record<string, string> = {
  ACTIVACION_MARCA: "Solicitud de activación de marca",
  PROBLEMA_PRODUCTO: "Problema con un producto Wears",
  PEDIDO_ANTICIPADO: "Pedido anticipado",
  OTRO: "Otro",
};

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  RESUELTO: "Resuelto",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDIENTE: "bg-red-100 text-red-700",
  EN_PROCESO: "bg-amber-100 text-amber-700",
  RESUELTO: "bg-emerald-100 text-emerald-700",
};

export default async function SoportePage() {
  await requireAdmin();

  const requests = await prisma.supportRequest.findMany({
    include: { ally: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Soporte y solicitudes de aliados
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Activaciones de marca y reportes de problemas enviados desde el
          panel de los aliados.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {requests.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-wears-tan/30 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-wears-black">
                  {TYPE_LABEL[r.type]}
                </p>
                <p className="text-xs text-wears-espresso/60">
                  {r.ally.businessName} · {r.createdAt.toLocaleString("es-CO")}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASSES[r.status]}`}
              >
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            <p className="mt-2 text-sm text-wears-espresso/80">{r.message}</p>
            {r.status !== "RESUELTO" && (
              <div className="mt-3 flex gap-2">
                {r.status === "PENDIENTE" && (
                  <form action={resolveSupportRequest.bind(null, r.id, "EN_PROCESO")}>
                    <button className="rounded-full border border-amber-300 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50">
                      Marcar en proceso
                    </button>
                  </form>
                )}
                <form action={resolveSupportRequest.bind(null, r.id, "RESUELTO")}>
                  <button className="rounded-full border border-emerald-300 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50">
                    Marcar resuelto
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && (
          <p className="rounded-xl border border-wears-tan/30 bg-white p-6 text-center text-sm text-wears-espresso/50 shadow-sm">
            No hay solicitudes de soporte todavía.
          </p>
        )}
      </section>
    </div>
  );
}
