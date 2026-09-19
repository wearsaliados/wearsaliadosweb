"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword, generateTempPassword } from "@/lib/auth";

export type FormState = { error?: string; success?: string };

const cashierSchema = z.object({
  email: z.string().trim().min(3, "El correo o usuario es obligatorio"),
  password: z.string().trim().optional(),
  name: z.string().min(2, "El nombre es obligatorio"),
  commissionPerSale: z.coerce.number().min(0),
});

/** Crea un usuario cajero (venta directa en punto físico o tienda en línea). */
export async function createCashier(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = cashierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe un usuario con ese correo o usuario" };
  }

  const usingCustomPassword = Boolean(data.password);
  const finalPassword = data.password || generateTempPassword();

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(finalPassword),
      role: "CASHIER",
      name: data.name,
      mustChangePw: !usingCustomPassword,
    },
  });
  await prisma.cashier.create({
    data: {
      userId: user.id,
      name: data.name,
      commissionPerSale: data.commissionPerSale,
    },
  });

  revalidatePath("/admin/cajeros");
  return {
    success: usingCustomPassword
      ? `Cajero creado. Usuario: ${email} con la contraseña que definiste.`
      : `Cajero creado. Usuario: ${email} · Contraseña temporal: ${finalPassword} (compártela de forma segura, se le pedirá cambiarla).`,
  };
}

export async function toggleCashierActive(
  cashierId: string,
  userId: string,
  active: boolean
) {
  await requireAdmin();
  await prisma.$transaction([
    prisma.cashier.update({ where: { id: cashierId }, data: { active } }),
    prisma.user.update({ where: { id: userId }, data: { active } }),
  ]);
  revalidatePath("/admin/cajeros");
}

const updateCommissionSchema = z.object({
  commissionPerSale: z.coerce.number().min(0),
});

/** Ajusta el monto fijo de comisión por venta de un cajero (aplica a ventas futuras). */
export async function updateCashierCommission(
  cashierId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = updateCommissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  await prisma.cashier.update({
    where: { id: cashierId },
    data: { commissionPerSale: parsed.data.commissionPerSale },
  });
  revalidatePath(`/admin/cajeros/${cashierId}`);
  return { success: "Comisión actualizada" };
}

const markPaidSchema = z.object({
  month: z.string().min(1),
  amount: z.coerce.number().min(0),
});

/** Marca la comisión de un mes como pagada al cajero. */
export async function markCommissionPaid(
  cashierId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = markPaidSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const cashier = await prisma.cashier.findUnique({ where: { id: cashierId } });
  if (!cashier) return { error: "Cajero no encontrado" };

  await prisma.commissionPayment.upsert({
    where: {
      cashierUserId_month: { cashierUserId: cashier.userId, month: parsed.data.month },
    },
    update: { amount: parsed.data.amount, paidAt: new Date() },
    create: {
      cashierUserId: cashier.userId,
      month: parsed.data.month,
      amount: parsed.data.amount,
    },
  });

  revalidatePath(`/admin/cajeros/${cashierId}`);
  return { success: "Comisión marcada como pagada" };
}
