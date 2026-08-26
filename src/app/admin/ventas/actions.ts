"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function toggleSaleCollected(saleId: string, collected: boolean) {
  await requireAdmin();
  await prisma.sale.update({ where: { id: saleId }, data: { collected } });
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
}
