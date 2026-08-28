import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTestNotification } from "./actions";

const STATUS_CLASSES: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-700",
  SKIPPED: "bg-gray-100 text-gray-600",
  FAILED: "bg-red-100 text-red-700",
};

export default async function ConfiguracionPage() {
  await requireAdmin();

  const emailConfigured = Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.ADMIN_NOTIFICATION_EMAIL
  );
  const whatsappConfigured = Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TO
  );

  const logs = await prisma.notificationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Configuración de notificaciones
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Ventas y solicitudes de soporte se notifican automáticamente por
          correo y WhatsApp cuando están configurados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className={`rounded-xl border p-5 shadow-sm ${
            emailConfigured ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"
          }`}
        >
          <p className="font-medium text-wears-black">Correo (SMTP)</p>
          <p className="mt-1 text-sm text-wears-espresso/70">
            {emailConfigured
              ? "Configurado correctamente."
              : "Falta configurar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y ADMIN_NOTIFICATION_EMAIL en las variables de entorno."}
          </p>
        </div>
        <div
          className={`rounded-xl border p-5 shadow-sm ${
            whatsappConfigured ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"
          }`}
        >
          <p className="font-medium text-wears-black">WhatsApp (Cloud API)</p>
          <p className="mt-1 text-sm text-wears-espresso/70">
            {whatsappConfigured
              ? "Configurado correctamente."
              : "Falta configurar WHATSAPP_TOKEN, WHATSAPP_PHONE_ID y WHATSAPP_TO en las variables de entorno."}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-wears-black">Probar notificaciones</p>
            <p className="text-sm text-wears-espresso/60">
              Envía un mensaje de prueba por correo y WhatsApp, sin necesidad de registrar una
              venta o solicitud real.
            </p>
          </div>
          <form action={sendTestNotification}>
            <button
              type="submit"
              className="rounded-full bg-wears-gold px-5 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan"
            >
              Enviar notificación de prueba
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-xl border border-wears-tan/30 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-wears-black">
          Registro de notificaciones recientes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Canal</th>
                <th className="py-2 pr-4">Evento</th>
                <th className="py-2 pr-4">Destino</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-wears-tan/10">
                  <td className="py-2 pr-4 text-wears-espresso/70">
                    {l.createdAt.toLocaleString("es-CO")}
                  </td>
                  <td className="py-2 pr-4">{l.channel === "EMAIL" ? "Correo" : "WhatsApp"}</td>
                  <td className="py-2 pr-4 text-wears-espresso/70">{l.event}</td>
                  <td className="py-2 pr-4">{l.recipient || "—"}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASSES[l.status]}`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="max-w-xs py-2 pr-4 text-xs text-red-600">{l.error ?? "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-wears-espresso/50">
                    Sin notificaciones registradas todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
