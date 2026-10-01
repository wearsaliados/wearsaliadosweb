"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAlly } from "@/lib/auth";
import { notifyAdmin } from "@/lib/notifications";

export type FormState = { error?: string; success?: string };

const schema = z.object({
  type: z.enum(["ACTIVACION_MARCA", "PROBLEMA_PRODUCTO", "PEDIDO_ANTICIPADO", "OTRO"]),
  activation: z.string().optional(),
  message: z.string().optional(),
});

export async function submitSupportRequest(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAlly();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { type, activation } = parsed.data;
  const note = parsed.data.message?.trim() ?? "";

  const message = activation
    ? `Activación solicitada: ${activation}.${note ? ` ${note}` : ""}`
    : note;

  if (message.length < 5) {
    return { error: "Cuéntanos un poco más" };
  }

  const ally = await prisma.ally.findUniqueOrThrow({ where: { id: session.allyId } });

  await prisma.supportRequest.create({
    data: { allyId: session.allyId, type, message },
  });

  const subjectByType: Record<string, string> = {
    ACTIVACION_MARCA: "Nueva solicitud de activación de marca",
    PROBLEMA_PRODUCTO: "Reporte de problema con producto Wears",
    PEDIDO_ANTICIPADO: "Nuevo pedido anticipado",
    OTRO: "Nuevo mensaje de aliado",
  };

  await notifyAdmin({
    event: "support_request",
    subject: `${subjectByType[type]} — ${ally.businessName}`,
    message: `${ally.businessName} (${ally.contactName}) escribió: ${message}`,
  });

  revalidatePath("/aliado/soporte");
  return { success: "Tu mensaje fue enviado. Te responderemos pronto." };
}

export async function requestPreorder(collectionId: string) {
  const session = await requireAlly();
  const [ally, collection] = await Promise.all([
    prisma.ally.findUniqueOrThrow({ where: { id: session.allyId } }),
    prisma.collection.findUniqueOrThrow({ where: { id: collectionId } }),
  ]);

  const message = `Pedido anticipado: colección ${collection.name}, pedido mínimo 15 pares (1 unidad por color y talla).`;

  await prisma.supportRequest.create({
    data: { allyId: session.allyId, type: "PEDIDO_ANTICIPADO", message },
  });

  await notifyAdmin({
    event: "preorder_request",
    subject: `Nuevo pedido anticipado — ${ally.businessName}`,
    message: `${ally.businessName} (${ally.contactName}) solicitó pedido anticipado de la colección ${collection.name}.`,
  });

  revalidatePath("/aliado/soporte");
  revalidatePath("/admin/soporte");
}
