"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export type FormState = { error?: string; success?: string };

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export async function markSaleCollected(
  saleId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const file = formData.get("comprobante");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Debes cargar el comprobante de pago" };
  }
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    return { error: "El comprobante debe ser una imagen o un PDF" };
  }
  if (file.size > MAX_PROOF_BYTES) {
    return { error: "El comprobante no puede pesar más de 5 MB" };
  }

  let paymentProofUrl: string;
  try {
    const blob = await put(`payment-proofs/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    paymentProofUrl = blob.url;
  } catch (err) {
    console.error("Error subiendo comprobante de pago:", err);
    return {
      error:
        err instanceof Error
          ? `No se pudo subir el comprobante: ${err.message}`
          : "No se pudo subir el comprobante",
    };
  }

  try {
    await prisma.sale.update({
      where: { id: saleId },
      data: { collected: true, paymentProofUrl },
    });
  } catch (err) {
    console.error("Error marcando venta como cobrada:", err);
    return { error: "No se pudo guardar el cobro" };
  }

  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  return { success: "Cobro registrado" };
}

export async function revertSaleCollected(saleId: string) {
  await requireAdmin();
  await prisma.sale.update({ where: { id: saleId }, data: { collected: false } });
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
}
