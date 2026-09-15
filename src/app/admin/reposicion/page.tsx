import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStockStatus } from "@/lib/inventory";
import ReposicionBrowser, { type RestockItem } from "./reposicion-browser";

export default async function ReposicionPage() {
  await requireAdmin();

  const items = await prisma.inventoryItem.findMany({
    include: { product: true, location: { include: { ally: true } } },
    orderBy: { quantity: "asc" },
  });

  const needsRestock: RestockItem[] = items
    .filter(
      (i) =>
        getStockStatus(i.quantity, i.product.minStock) !== "DISPONIBLE" &&
        i.location.type !== "FACTORY" &&
        i.product.active
    )
    .map((i) => ({
      id: i.id,
      productName: i.product.name,
      size: i.product.size,
      quantity: i.quantity,
      minStock: i.product.minStock,
      locationId: i.location.id,
      locationName: i.location.ally?.businessName ?? i.location.name,
      allyId: i.location.ally?.id ?? null,
      status: getStockStatus(i.quantity, i.product.minStock) as "AGOTADO" | "BAJO",
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wears-black">
          Reposición de mercancía
        </h1>
        <p className="text-sm text-wears-espresso/60">
          Productos agotados o en stock bajo en tienda en línea, puntos
          físicos y aliados. La fábrica no aparece aquí porque es la que
          repone a los demás — mira su stock en{" "}
          <Link href="/admin/inventario" className="text-wears-gold hover:underline">
            Inventario
          </Link>
          .
        </p>
      </div>

      <ReposicionBrowser items={needsRestock} />
    </div>
  );
}
