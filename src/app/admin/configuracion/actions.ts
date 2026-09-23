"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { notifyAdmin } from "@/lib/notifications";

export async function sendTestNotification() {
  await requireAdmin();
  await notifyAdmin({
    event: "test_notification",
    subject: "Notificación de prueba — Wears Inventario",
    message: "Si ves este mensaje, las notificaciones están funcionando correctamente.",
  });
  revalidatePath("/admin/configuracion");
}
