import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: rawUrl.replace(/^file:/, "") });
const prisma = new PrismaClient({ adapter });

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type SizedVariant = {
  sku: string;
  name: string;
  size: string;
  price: number;
  cost: number;
  minStock: number;
  collectionId: string;
};

/** Genera un producto por cada combinación modelo x talla (cada talla es una unidad de inventario propia). */
function buildSizedModels(opts: {
  skuPrefix: string;
  models: string[];
  sizes: string[];
  price: number;
  cost: number;
  minStock: number;
  collectionId: string;
  quantityPerVariant?: number;
}): SizedVariant[] {
  const variants: SizedVariant[] = [];
  for (const model of opts.models) {
    for (const size of opts.sizes) {
      variants.push({
        sku: `WR-${opts.skuPrefix}-${slugify(model)}-${size}`,
        name: size === "Única" ? model : `${model} — Talla ${size}`,
        size,
        price: opts.price,
        cost: opts.cost,
        minStock: opts.minStock,
        collectionId: opts.collectionId,
      });
    }
  }
  return variants;
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@cueroswears.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Wears2026!";

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
      name: "Administrador Wears",
      mustChangePw: false,
    },
  });
  console.log(`Admin listo: ${adminUser.email} / contraseña: ${adminPassword}`);

  const web = await prisma.location.upsert({
    where: { id: "loc-web" },
    update: {},
    create: { id: "loc-web", name: "Tienda en línea (Cueroswears.com)", type: "WEB" },
  });
  const store = await prisma.location.upsert({
    where: { id: "loc-store-1" },
    update: {},
    create: { id: "loc-store-1", name: "Punto físico principal", type: "STORE", address: "Sede principal" },
  });
  const factory = await prisma.location.upsert({
    where: { id: "loc-factory" },
    update: {},
    create: { id: "loc-factory", name: "Fábrica (lista para reposición)", type: "FACTORY" },
  });

  // Limpieza del catálogo de demostración muy antiguo (ya reemplazado por el catálogo real)
  const veryOldSkus = ["WR-BOT-001", "WR-BOT-002", "WR-BOL-001", "WR-CIN-001", "WR-MOR-001", "WR-PROX-001"];
  const veryOldProducts = await prisma.product.findMany({ where: { sku: { in: veryOldSkus } } });
  if (veryOldProducts.length > 0) {
    const ids = veryOldProducts.map((p) => p.id);
    const items = await prisma.inventoryItem.findMany({ where: { productId: { in: ids } } });
    const itemIds = items.map((i) => i.id);
    await prisma.inventoryMovement.deleteMany({ where: { inventoryItemId: { in: itemIds } } });
    await prisma.sale.deleteMany({ where: { productId: { in: ids } } });
    await prisma.inventoryItem.deleteMany({ where: { productId: { in: ids } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.collection.deleteMany({ where: { name: { in: ["Clásica Cuero", "Urbana Wears"] } } });

  // Renombra colecciones ya existentes en vez de duplicarlas
  await prisma.collection.updateMany({
    where: { name: "Dress Sneakers" },
    data: { name: "Deportivos Dress Sneakers" },
  });
  await prisma.collection.updateMany({
    where: { name: "Vela Urban Náuticos" },
    data: { name: "Náuticos Vela Urban" },
  });
  await prisma.collection.updateMany({
    where: { name: "Vela Urban Riñoneras" },
    data: { name: "Riñoneras Vela Urban" },
  });
  await prisma.collection.updateMany({
    where: { name: "El Barco Wears — Próxima Colección" },
    data: {
      name: "M Jane",
      imageUrl: "/brand/mjane.jpg",
      launchNote:
        "Calzado de dama, 3 colores. Pídelos con antelación — pedido mínimo 15 pares (una unidad de cada color y talla).",
    },
  });

  const herenciaAbuelo = await prisma.collection.upsert({
    where: { name: "Herencia del Abuelo" },
    update: {},
    create: { name: "Herencia del Abuelo" },
  });
  const dressSneakers = await prisma.collection.upsert({
    where: { name: "Deportivos Dress Sneakers" },
    update: {},
    create: { name: "Deportivos Dress Sneakers" },
  });
  const velaUrbanNauticos = await prisma.collection.upsert({
    where: { name: "Náuticos Vela Urban" },
    update: {},
    create: { name: "Náuticos Vela Urban" },
  });
  const velaUrbanRinoneras = await prisma.collection.upsert({
    where: { name: "Riñoneras Vela Urban" },
    update: {},
    create: { name: "Riñoneras Vela Urban" },
  });
  const mJane = await prisma.collection.upsert({
    where: { name: "M Jane" },
    update: { imageUrl: "/brand/mjane.jpg" },
    create: {
      name: "M Jane",
      upcoming: true,
      imageUrl: "/brand/mjane.jpg",
      launchNote:
        "Calzado de dama, 3 colores. Pídelos con antelación — pedido mínimo 15 pares (una unidad de cada color y talla).",
    },
  });

  // Catálogo "genérico" anterior (un producto por colección, sin talla). Se deja inactivo:
  // ya no se usa para asignar inventario nuevo, pero se conserva por el historial de ventas
  // y de los aliados de demostración que ya lo tenían asignado.
  const legacyProducts = await Promise.all(
    [
      {
        sku: "WR-DEP-001",
        name: "Deportivos Caballeros DS",
        price: 140,
        cost: 70,
        minStock: 8,
        collectionId: dressSneakers.id,
      },
      {
        sku: "WR-SAN-001",
        name: "Sandalias Herencia del Abuelo",
        price: 80,
        cost: 40,
        minStock: 10,
        collectionId: herenciaAbuelo.id,
      },
      {
        sku: "WR-NAU-001",
        name: "Náuticos tres ojetes VU",
        price: 80,
        cost: 40,
        minStock: 6,
        collectionId: velaUrbanNauticos.id,
      },
      {
        sku: "WR-RIN-001",
        name: "Riñoneras Vela Urban",
        price: 80,
        cost: 40,
        minStock: 2,
        collectionId: velaUrbanRinoneras.id,
      },
    ].map((p) => prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p }))
  );
  await prisma.product.updateMany({
    where: { sku: { in: legacyProducts.map((p) => p.sku) } },
    data: { active: false },
  });
  const [deportivos, sandaliasHDA, nauticos, rinoneras] = legacyProducts;

  await Promise.all(
    legacyProducts.map((p) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: web.id } },
        update: {},
        create: { productId: p.id, locationId: web.id, quantity: 0, unitCost: p.cost },
      })
    )
  );
  await Promise.all(
    legacyProducts.map((p) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: store.id } },
        update: {},
        create: { productId: p.id, locationId: store.id, quantity: 0, unitCost: p.cost },
      })
    )
  );
  await Promise.all(
    legacyProducts.map((p) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: factory.id } },
        update: {},
        create: { productId: p.id, locationId: factory.id, quantity: 0, unitCost: p.cost },
      })
    )
  );

  // NOTA: los precios de venta (price) de todo el catálogo son un estimado provisional.
  // Ajústalos con los precios reales desde el panel Productos.
  const sizedVariantDefs: SizedVariant[] = [
    ...buildSizedModels({
      skuPrefix: "DEP",
      models: ["Dallas real", "Gitano verde", "Espartano azul", "Espartano negro", "Hanton miel"],
      sizes: ["39", "40", "41", "42", "43", "44", "45"],
      price: 140,
      cost: 70,
      minStock: 1,
      collectionId: dressSneakers.id,
    }),
    ...buildSizedModels({
      skuPrefix: "SAN",
      models: ["Beige cierres", "Azul cierres", "Marrón cierres", "Correa negra", "Correa oro", "Correa caramelo"],
      sizes: ["38", "39", "40", "41", "42", "43", "44"],
      price: 80,
      cost: 40,
      minStock: 1,
      collectionId: herenciaAbuelo.id,
    }),
    ...buildSizedModels({
      skuPrefix: "NAU",
      models: ["Náuticos Caramelo", "Náuticos Azul", "Náuticos Rojo", "Náuticos Verde"],
      sizes: ["38", "39", "40", "41", "42", "43", "44"],
      price: 80,
      cost: 40,
      minStock: 1,
      collectionId: velaUrbanNauticos.id,
    }),
    ...buildSizedModels({
      skuPrefix: "RIN",
      models: ["Riñonera Caramelo", "Riñonera Azul", "Riñonera Rojo", "Riñonera Verde"],
      sizes: ["Única"],
      price: 80,
      cost: 40,
      minStock: 1,
      collectionId: velaUrbanRinoneras.id,
    }),
    // M Jane: próxima colección, catálogo de referencia para pedido anticipado (aún sin inventario)
    ...buildSizedModels({
      skuPrefix: "MJ",
      models: ["M Jane Rojo", "M Jane Blanco", "M Jane Verde"],
      sizes: ["35", "36", "37", "38", "39"],
      price: 90,
      cost: 60,
      minStock: 1,
      collectionId: mJane.id,
    }),
  ];

  const sizedProducts = await Promise.all(
    sizedVariantDefs.map((v) =>
      prisma.product.upsert({
        where: { sku: v.sku },
        update: { name: v.name, size: v.size, collectionId: v.collectionId, cost: v.cost, price: v.price },
        create: v,
      })
    )
  );
  async function ensureAlly(opts: {
    email: string;
    password: string;
    businessName: string;
    contactName: string;
    phone?: string;
    city?: string;
    mustChangePw?: boolean;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: opts.email } });
    if (existing) {
      const ally = await prisma.ally.findUniqueOrThrow({ where: { userId: existing.id } });
      return { ally, isNew: false };
    }

    const user = await prisma.user.create({
      data: {
        email: opts.email,
        passwordHash: await bcrypt.hash(opts.password, 10),
        role: "ALLY",
        name: opts.contactName,
        mustChangePw: opts.mustChangePw ?? true,
      },
    });
    const ally = await prisma.ally.create({
      data: {
        userId: user.id,
        businessName: opts.businessName,
        contactName: opts.contactName,
        phone: opts.phone || null,
        city: opts.city || null,
      },
    });
    await prisma.location.create({
      data: { name: opts.businessName, type: "ALLY", allyId: ally.id },
    });
    console.log(`Aliado creado: ${opts.email} / contraseña: ${opts.password}`);
    return { ally, isNew: true };
  }

  const { ally: ally1, isNew: ally1IsNew } = await ensureAlly({
    email: "aliado1@cueroswears.com",
    password: "Aliado2026!",
    businessName: "Boutique El Puerto",
    contactName: "María Gómez",
    phone: "3001234567",
    city: "Cartagena",
  });
  const { ally: ally2, isNew: ally2IsNew } = await ensureAlly({
    email: "aliado2@cueroswears.com",
    password: "Aliado2026!",
    businessName: "Estilo Urbano Store",
    contactName: "Carlos Pérez",
    phone: "3007654321",
    city: "Bogotá",
  });

  if (ally1IsNew) {
    const loc1 = await prisma.location.findUniqueOrThrow({ where: { allyId: ally1.id } });
    for (const [i, p] of [deportivos, sandaliasHDA, nauticos].entries()) {
      await prisma.inventoryItem.create({
        data: {
          productId: p.id,
          locationId: loc1.id,
          quantity: i === 0 ? 1 : 4,
          acquisitionType: "PURCHASE",
          unitCost: p.cost,
        },
      });
    }
  }

  if (ally2IsNew) {
    const loc2 = await prisma.location.findUniqueOrThrow({ where: { allyId: ally2.id } });
    for (const p of [sandaliasHDA, nauticos, rinoneras]) {
      await prisma.inventoryItem.create({
        data: {
          productId: p.id,
          locationId: loc2.id,
          quantity: 3,
          acquisitionType: "CONSIGNMENT",
          unitCost: p.cost,
        },
      });
      await prisma.ledgerEntry.create({
        data: {
          allyId: ally2.id,
          type: "CONSIGNMENT_CHARGE",
          amount: p.cost * 3,
          description: `Mercancía a consignación: ${p.name} x3`,
        },
      });
    }
  }

  // Primer aliado comercial oficial: Make Waves C.C. Sambil Chacao
  const { ally: sambil, isNew: sambilIsNew } = await ensureAlly({
    email: "makewakesccsambil",
    password: "308449318",
    businessName: "Make Waves C.C. Sambil Chacao",
    contactName: "Make Waves C.C. Sambil Chacao",
    mustChangePw: false,
  });

  if (sambilIsNew) {
    const locSambil = await prisma.location.findUniqueOrThrow({ where: { allyId: sambil.id } });

    // Inventario inicial entregado a consignación (registrado a nivel de colección;
    // el detalle por modelo y talla se agrega justo debajo)
    const initialConsignment = [
      { product: deportivos, quantity: 35 },
      { product: sandaliasHDA, quantity: 42 },
      { product: nauticos, quantity: 28 },
      { product: rinoneras, quantity: 8 },
    ];

    for (const { product, quantity } of initialConsignment) {
      await prisma.ledgerEntry.create({
        data: {
          allyId: sambil.id,
          type: "CONSIGNMENT_CHARGE",
          amount: quantity * product.cost,
          description: `Mercancía a consignación: ${product.name} x${quantity}`,
        },
      });
    }

    // 4 pares adicionales de Sandalias Herencia del Abuelo, vendidos y pagados de inmediato a Wears
    const extraQuantity = 4;
    const extraCharge = extraQuantity * sandaliasHDA.cost;
    await prisma.ledgerEntry.create({
      data: {
        allyId: sambil.id,
        type: "CONSIGNMENT_CHARGE",
        amount: extraCharge,
        description: `Mercancía a consignación: ${sandaliasHDA.name} x${extraQuantity}`,
      },
    });
    await prisma.sale.create({
      data: {
        allyId: sambil.id,
        locationId: locSambil.id,
        productId: sandaliasHDA.id,
        quantity: extraQuantity,
        unitPrice: sandaliasHDA.price,
        unitCost: sandaliasHDA.cost,
        note: "Venta inicial pagada directamente a Wears",
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        allyId: sambil.id,
        type: "PAYMENT",
        amount: extraCharge,
        description: `Pago recibido — ${extraQuantity} pares de ${sandaliasHDA.name} vendidos y liquidados`,
      },
    });

    console.log(
      `Aliado oficial Make Waves C.C. Sambil Chacao creado, con ${extraQuantity} unidades de Herencia del Abuelo vendidas y ya pagadas.`
    );
  }

  // Migración del inventario de Sambil al detalle por modelo y talla (una sola vez).
  const locSambil = await prisma.location.findUnique({ where: { allyId: sambil.id } });
  if (locSambil) {
    const currentItemCount = await prisma.inventoryItem.count({ where: { locationId: locSambil.id } });
    if (currentItemCount <= 4) {
      const oldItems = await prisma.inventoryItem.findMany({
        where: { locationId: locSambil.id },
        select: { id: true },
      });
      await prisma.inventoryMovement.deleteMany({
        where: { inventoryItemId: { in: oldItems.map((i) => i.id) } },
      });
      await prisma.inventoryItem.deleteMany({ where: { locationId: locSambil.id } });

      const bySkuPrefix = (prefix: string) =>
        sizedProducts.filter((p) => p.sku.startsWith(`WR-${prefix}-`));

      const detailed: { product: (typeof sizedProducts)[number]; quantity: number }[] = [
        ...bySkuPrefix("DEP").map((product) => ({ product, quantity: 1 })),
        ...bySkuPrefix("SAN").map((product) => ({ product, quantity: 1 })),
        ...bySkuPrefix("NAU").map((product) => ({ product, quantity: 1 })),
        ...bySkuPrefix("RIN").map((product) => ({ product, quantity: 2 })),
      ];

      for (const { product, quantity } of detailed) {
        const item = await prisma.inventoryItem.create({
          data: {
            productId: product.id,
            locationId: locSambil.id,
            quantity,
            acquisitionType: "CONSIGNMENT",
            unitCost: product.cost,
          },
        });
        await prisma.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            type: "RECEIVE",
            quantityDelta: quantity,
            note: "Inventario inicial a consignación (detalle por modelo y talla)",
          },
        });
      }

      const totalUnits = detailed.reduce((s, d) => s + d.quantity, 0);
      console.log(
        `Inventario de Sambil migrado a detalle por modelo y talla: ${detailed.length} variantes, ${totalUnits} unidades.`
      );
    }
  }

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
